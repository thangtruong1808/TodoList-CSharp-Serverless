using TodoList.Api.Infrastructure;
using TodoList.Api.Models;
using TodoList.Api.Repositories;

namespace TodoList.Api.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notificationDispatch;
    private readonly ICurrentUserService _currentUser;

    public NotificationService(
        INotificationRepository notificationRepository,
        ITaskRepository taskRepository,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatch,
        ICurrentUserService currentUser)
    {
        _notificationRepository = notificationRepository;
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _notificationDispatch = notificationDispatch;
        _currentUser = currentUser;
    }

    public async Task<NotificationListResponse> GetNotificationsAsync(int limit, int offset, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.UserId.HasValue)
        {
            return new NotificationListResponse();
        }

        var userId = _currentUser.UserId.Value;
        var items = await _notificationRepository.GetByUserAsync(userId, limit, offset, cancellationToken);
        var unread = await _notificationRepository.CountUnreadAsync(userId, cancellationToken);

        return new NotificationListResponse { Items = items, UnreadCount = unread };
    }

    public async Task<NotificationItem?> MarkReadAsync(long id, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.UserId.HasValue) return null;

        var userId = _currentUser.UserId.Value;
        var before = await _notificationRepository.GetByIdForUserAsync(id, userId, cancellationToken);
        if (before is null) return null;

        await _notificationRepository.MarkReadAsync(id, userId, cancellationToken);
        var updated = await _notificationRepository.GetByIdForUserAsync(id, userId, cancellationToken);

        if (
            updated is not null
            && _currentUser.Role == UserRole.User
            && before.IsRead == false
            && string.Equals(before.Type, "TaskAssigned", StringComparison.OrdinalIgnoreCase)
            && before.TaskId.HasValue)
        {
            var task = await _taskRepository.GetByIdAsync(before.TaskId.Value, cancellationToken);
            var reader = await _userRepository.GetByIdAsync(userId, cancellationToken);
            if (task is not null && reader is not null)
            {
                await _notificationDispatch.NotifyManagersTaskReadAsync(task, reader, cancellationToken);
            }
        }

        return updated;
    }

    public async Task<bool> MarkAllReadAsync(CancellationToken cancellationToken = default)
    {
        if (!_currentUser.UserId.HasValue) return false;
        return await _notificationRepository.MarkAllReadAsync(_currentUser.UserId.Value, cancellationToken);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.UserId.HasValue) return false;
        return await _notificationRepository.DeleteAsync(id, _currentUser.UserId.Value, cancellationToken);
    }

    public async Task<bool> DeleteAllAsync(CancellationToken cancellationToken = default)
    {
        if (!_currentUser.UserId.HasValue) return false;
        return await _notificationRepository.DeleteAllAsync(_currentUser.UserId.Value, cancellationToken);
    }
}
