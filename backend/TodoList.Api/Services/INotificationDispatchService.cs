using TodoList.Api.Models;

namespace TodoList.Api.Services;

public interface INotificationDispatchService
{
    Task<NotificationItem> NotifyUserTaskAssignedAsync(
        long assigneeUserId,
        TaskItem task,
        User assigner,
        CancellationToken cancellationToken = default);

    Task<NotificationItem> NotifyUserProjectAssignedAsync(
        long assigneeUserId,
        ProjectListItemDto project,
        User assigner,
        CancellationToken cancellationToken = default);

    Task NotifyManagersTaskReadAsync(
        TaskItem task,
        User reader,
        CancellationToken cancellationToken = default);

    Task NotifyManagersStatusUpdatedAsync(
        TaskItem task,
        User updater,
        Models.TaskStatus newStatus,
        CancellationToken cancellationToken = default);
}
