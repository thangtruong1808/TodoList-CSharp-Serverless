using TodoList.Api.Hubs;
using TodoList.Api.Infrastructure;
using TodoList.Api.Models;
using TodoList.Api.Repositories;
using Microsoft.AspNetCore.SignalR;

namespace TodoList.Api.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly INotificationDispatchService _notificationDispatch;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<TaskService> _logger;

    public TaskService(
        ITaskRepository taskRepository,
        IUserRepository userRepository,
        IProjectRepository projectRepository,
        INotificationDispatchService notificationDispatch,
        ICurrentUserService currentUser,
        ILogger<TaskService> logger)
    {
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _projectRepository = projectRepository;
        _notificationDispatch = notificationDispatch;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TaskItem>> GetAllAsync(TaskQueryParams query, CancellationToken cancellationToken = default)
    {
        var status = query.Status.HasValue ? (int?)query.Status.Value : null;
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim();

        if (_currentUser.IsAdmin)
        {
            return await _taskRepository.GetAllForAdminAsync(search, status, query.ProjectId, cancellationToken);
        }

        if (!_currentUser.UserId.HasValue)
        {
            return [];
        }

        if (_currentUser.IsProjectManager)
        {
            return await _taskRepository.GetAllForProjectManagerAsync(
                _currentUser.UserId.Value, search, status, query.ProjectId, cancellationToken);
        }

        return await _taskRepository.GetAllForUserAsync(
            _currentUser.UserId.Value, search, status, query.ProjectId, cancellationToken);
    }

    public async Task<TaskItem?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var task = await _taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null || await CanAccessTaskAsync(task, cancellationToken))
        {
            return task;
        }

        return null;
    }

    public async Task<TaskItem> CreateAsync(CreateTaskRequest request, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsAdmin && !_currentUser.IsProjectManager)
        {
            throw new UnauthorizedAccessException("Only admins and project managers can create tasks.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Task name is required.", nameof(request));
        }

        if (request.ProjectId <= 0)
        {
            throw new ArgumentException("Project is required.", nameof(request));
        }

        if (_currentUser.IsProjectManager && _currentUser.UserId.HasValue)
        {
            var isMember = await _projectRepository.IsMemberAsync(
                request.ProjectId,
                _currentUser.UserId.Value,
                cancellationToken);
            if (!isMember)
            {
                throw new UnauthorizedAccessException("You are not assigned to this project.");
            }
        }

        var now = DateTime.UtcNow;
        var task = new TaskItem
        {
            ProjectId = request.ProjectId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Status = request.Status,
            CreatedAt = now,
            UpdatedAt = now
        };

        return await _taskRepository.CreateAsync(task, cancellationToken);
    }

    public async Task<bool> UpdateAsync(long id, UpdateTaskRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role == UserRole.User)
        {
            throw new UnauthorizedAccessException("Users cannot edit task name or description.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Task name is required.", nameof(request));
        }

        var existing = await _taskRepository.GetByIdAsync(id, cancellationToken);
        if (existing is null || !await CanAccessTaskAsync(existing, cancellationToken))
        {
            return false;
        }

        var previousStatus = existing.Status;
        existing.Name = request.Name.Trim();
        existing.Description = request.Description?.Trim();
        existing.Status = request.Status;
        existing.UpdatedAt = DateTime.UtcNow;

        var updated = await _taskRepository.UpdateAsync(existing, cancellationToken);
        if (updated && ShouldNotifyManagersForStatusChange(previousStatus, request.Status, _currentUser.Role))
        {
            var updater = await _userRepository.GetByIdAsync(_currentUser.UserId!.Value, cancellationToken);
            if (updater is not null)
            {
                await _notificationDispatch.NotifyManagersStatusUpdatedAsync(
                    existing, updater, request.Status, cancellationToken);
            }
        }

        return updated;
    }

    public async Task<bool> UpdateStatusAsync(long id, UpdateTaskStatusRequest request, CancellationToken cancellationToken = default)
    {
        var existing = await _taskRepository.GetByIdAsync(id, cancellationToken);
        if (existing is null || !await CanAccessTaskAsync(existing, cancellationToken))
        {
            return false;
        }

        var previousStatus = existing.Status;
        var updated = await _taskRepository.UpdateStatusAsync(id, request.Status, DateTime.UtcNow, cancellationToken);
        if (updated && ShouldNotifyManagersForStatusChange(previousStatus, request.Status, _currentUser.Role))
        {
            existing.Status = request.Status;
            var updater = await _userRepository.GetByIdAsync(_currentUser.UserId!.Value, cancellationToken);
            if (updater is not null)
            {
                await _notificationDispatch.NotifyManagersStatusUpdatedAsync(
                    existing, updater, request.Status, cancellationToken);
            }
        }

        return updated;
    }

    public async Task<bool> AssignAsync(long id, AssignTaskRequest request, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsProjectManager || !_currentUser.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("Only project managers can assign tasks.");
        }

        var task = await _taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return false;
        }

        if (!await _projectRepository.IsMemberAsync(task.ProjectId, _currentUser.UserId.Value, cancellationToken))
        {
            throw new UnauthorizedAccessException("You are not assigned to this project.");
        }

        var assignee = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
        if (assignee is null || !assignee.IsActive || assignee.Role != UserRole.User)
        {
            throw new ArgumentException("Invalid assignee user.");
        }

        if (!await _projectRepository.IsMemberAsync(task.ProjectId, request.UserId, cancellationToken))
        {
            throw new ArgumentException("User must be assigned to the project before receiving tasks.");
        }

        var assigner = await _userRepository.GetByIdAsync(_currentUser.UserId.Value, cancellationToken);
        if (assigner is null)
        {
            return false;
        }

        var now = DateTime.UtcNow;
        var assigned = await _taskRepository.AssignAsync(
            id, request.UserId, _currentUser.UserId.Value, now, now, cancellationToken);
        if (!assigned)
        {
            return false;
        }

        await _notificationDispatch.NotifyUserTaskAssignedAsync(request.UserId, task, assigner, cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsAdmin && !_currentUser.IsProjectManager)
        {
            throw new UnauthorizedAccessException("Only admins and project managers can delete tasks.");
        }

        var existing = await _taskRepository.GetByIdAsync(id, cancellationToken);
        if (existing is null || !await CanAccessTaskAsync(existing, cancellationToken))
        {
            return false;
        }

        return await _taskRepository.DeleteAsync(id, cancellationToken);
    }

    private async Task<bool> CanAccessTaskAsync(TaskItem task, CancellationToken cancellationToken)
    {
        if (_currentUser.IsAdmin)
        {
            return true;
        }

        if (!_currentUser.UserId.HasValue)
        {
            return false;
        }

        if (_currentUser.IsProjectManager)
        {
            return await _projectRepository.IsMemberAsync(task.ProjectId, _currentUser.UserId.Value, cancellationToken);
        }

        return task.AssignedToUserId == _currentUser.UserId.Value;
    }

    private static bool ShouldNotifyManagersForStatusChange(
        Models.TaskStatus previousStatus,
        Models.TaskStatus newStatus,
        UserRole? role)
    {
        if (role != UserRole.User || previousStatus == newStatus)
        {
            return false;
        }

        return newStatus is Models.TaskStatus.InProgress or Models.TaskStatus.Completed;
    }
}
