using TodoList.Api.Models;

namespace TodoList.Api.Repositories;

public interface INotificationRepository
{
    Task<NotificationItem> CreateAsync(NotificationItem notification, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<NotificationItem>> GetByUserAsync(long userId, int limit, int offset, CancellationToken cancellationToken = default);
    Task<int> CountUnreadAsync(long userId, CancellationToken cancellationToken = default);
    Task<bool> MarkReadAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<bool> MarkAllReadAsync(long userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<NotificationItem?> GetByIdForUserAsync(long id, long userId, CancellationToken cancellationToken = default);
}
