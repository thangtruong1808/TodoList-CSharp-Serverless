using Microsoft.AspNetCore.SignalR;
using TodoList.Api.Hubs;
using TodoList.Api.Models;
using TodoList.Api.Repositories;

namespace TodoList.Api.Services;

public class NotificationDispatchService : INotificationDispatchService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationDispatchService(
        INotificationRepository notificationRepository,
        IProjectRepository projectRepository,
        IHubContext<NotificationHub> hubContext)
    {
        _notificationRepository = notificationRepository;
        _projectRepository = projectRepository;
        _hubContext = hubContext;
    }

    public async Task<NotificationItem> NotifyUserTaskAssignedAsync(
        long assigneeUserId,
        TaskItem task,
        User assigner,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var assignerName = FormatFullName(assigner.FirstName, assigner.LastName);
        var projectLabel = FormatProjectLabel(null, task.ProjectName);
        var taskName = task.Name.Trim();

        var notification = await _notificationRepository.CreateAsync(new NotificationItem
        {
            UserId = assigneeUserId,
            Type = "TaskAssigned",
            Title = taskName,
            Message = $"Assigned by {assignerName} in {projectLabel}.",
            TaskId = task.Id,
            ProjectId = task.ProjectId,
            IsRead = false,
            CreatedAt = now
        }, cancellationToken);

        await _hubContext.Clients.User(assigneeUserId.ToString()).SendAsync(
            "TaskAssigned",
            BuildTaskPayload(notification, task),
            cancellationToken);

        return notification;
    }

    public async Task<NotificationItem> NotifyUserProjectAssignedAsync(
        long assigneeUserId,
        ProjectListItemDto project,
        User assigner,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var assignerName = FormatFullName(assigner.FirstName, assigner.LastName);
        var projectLabel = FormatProjectLabel(project.Code, project.Name);
        var projectName = project.Name.Trim();

        var notification = await _notificationRepository.CreateAsync(new NotificationItem
        {
            UserId = assigneeUserId,
            Type = "ProjectAssigned",
            Title = projectName,
            Message = $"Added to {projectLabel} by {assignerName}.",
            TaskId = null,
            ProjectId = project.Id,
            IsRead = false,
            CreatedAt = now
        }, cancellationToken);

        await _hubContext.Clients.User(assigneeUserId.ToString()).SendAsync(
            "ProjectAssigned",
            BuildProjectPayload(notification, project),
            cancellationToken);

        return notification;
    }

    public async Task NotifyManagersTaskReadAsync(
        TaskItem task,
        User reader,
        CancellationToken cancellationToken = default)
    {
        var managers = await _projectRepository.GetProjectManagersAsync(
            task.ProjectId,
            task.AssignedByUserId,
            cancellationToken);
        if (managers.Count == 0) return;

        var readerName = FormatFullName(reader.FirstName, reader.LastName);
        var projectLabel = FormatProjectLabel(null, task.ProjectName);
        var taskName = task.Name.Trim();
        var now = DateTime.UtcNow;

        foreach (var manager in managers)
        {
            var notification = await _notificationRepository.CreateAsync(new NotificationItem
            {
                UserId = manager.Id,
                Type = "TaskNotificationRead",
                Title = taskName,
                Message = $"{readerName} marked the task notification as read in {projectLabel}.",
                TaskId = task.Id,
                ProjectId = task.ProjectId,
                IsRead = false,
                CreatedAt = now
            }, cancellationToken);

            await _hubContext.Clients.User(manager.Id.ToString()).SendAsync(
                "NotificationReceived",
                BuildTaskPayload(notification, task),
                cancellationToken);
        }
    }

    public async Task NotifyManagersStatusUpdatedAsync(
        TaskItem task,
        User updater,
        Models.TaskStatus newStatus,
        CancellationToken cancellationToken = default)
    {
        if (newStatus is not (Models.TaskStatus.InProgress or Models.TaskStatus.Completed))
        {
            return;
        }

        var managers = await _projectRepository.GetProjectManagersAsync(
            task.ProjectId,
            task.AssignedByUserId,
            cancellationToken);
        if (managers.Count == 0) return;

        var updaterName = FormatFullName(updater.FirstName, updater.LastName);
        var projectLabel = FormatProjectLabel(null, task.ProjectName);
        var taskName = task.Name.Trim();
        var statusLabel = FormatStatus(newStatus);
        var now = DateTime.UtcNow;

        foreach (var manager in managers)
        {
            var notification = await _notificationRepository.CreateAsync(new NotificationItem
            {
                UserId = manager.Id,
                Type = "TaskStatusUpdated",
                Title = taskName,
                Message = $"{updaterName} changed status to {statusLabel} in {projectLabel}.",
                TaskId = task.Id,
                ProjectId = task.ProjectId,
                IsRead = false,
                CreatedAt = now
            }, cancellationToken);

            await _hubContext.Clients.User(manager.Id.ToString()).SendAsync(
                "NotificationReceived",
                BuildTaskPayload(notification, task),
                cancellationToken);
        }
    }

    private static object BuildTaskPayload(NotificationItem notification, TaskItem task) => new
    {
        notificationId = notification.Id,
        type = notification.Type,
        taskId = task.Id,
        projectId = task.ProjectId,
        taskName = task.Name,
        title = notification.Title,
        message = notification.Message,
        projectName = notification.ProjectName ?? task.ProjectName,
        projectCode = notification.ProjectCode,
        createdAt = notification.CreatedAt
    };

    private static object BuildProjectPayload(NotificationItem notification, ProjectListItemDto project) => new
    {
        notificationId = notification.Id,
        type = notification.Type,
        taskId = (long?)null,
        projectId = project.Id,
        title = notification.Title,
        message = notification.Message,
        projectName = notification.ProjectName ?? project.Name,
        projectCode = notification.ProjectCode ?? project.Code,
        createdAt = notification.CreatedAt
    };

    private static string FormatFullName(string firstName, string lastName)
    {
        var name = $"{firstName} {lastName}".Trim();
        return string.IsNullOrWhiteSpace(name) ? "Unknown user" : name;
    }

    private static string FormatProjectLabel(string? projectCode, string? projectName)
    {
        if (!string.IsNullOrWhiteSpace(projectCode) && !string.IsNullOrWhiteSpace(projectName))
        {
            return $"{projectCode.Trim()} — {projectName.Trim()}";
        }

        if (!string.IsNullOrWhiteSpace(projectName))
        {
            return projectName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(projectCode))
        {
            return projectCode.Trim();
        }

        return "Unknown project";
    }

    private static string FormatStatus(Models.TaskStatus status) => status switch
    {
        Models.TaskStatus.Pending => "Pending",
        Models.TaskStatus.InProgress => "In Progress",
        Models.TaskStatus.Completed => "Completed",
        Models.TaskStatus.Cancelled => "Cancelled",
        _ => status.ToString()
    };
}
