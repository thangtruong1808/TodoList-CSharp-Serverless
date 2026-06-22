using Dapper;
using TodoList.Api.Data;
using TodoList.Api.Models;

namespace TodoList.Api.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public NotificationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<NotificationItem> CreateAsync(NotificationItem notification, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleAsync<NotificationItem>(
            new CommandDefinition(NotificationSqlQueries.Insert, new
            {
                notification.UserId,
                notification.Type,
                notification.Title,
                notification.Message,
                notification.TaskId,
                notification.ProjectId,
                IsRead = notification.IsRead,
                ReadAt = notification.ReadAt,
                notification.CreatedAt
            }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<NotificationItem>> GetByUserAsync(long userId, int limit, int offset, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var items = await connection.QueryAsync<NotificationItem>(
            new CommandDefinition(NotificationSqlQueries.SelectByUser, new { UserId = userId, Limit = limit, Offset = offset }, cancellationToken: cancellationToken));
        return items.AsList();
    }

    public async Task<int> CountUnreadAsync(long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(NotificationSqlQueries.CountUnread, new { UserId = userId }, cancellationToken: cancellationToken));
    }

    public async Task<NotificationItem?> GetByIdForUserAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<NotificationItem>(
            new CommandDefinition(
                NotificationSqlQueries.SelectById,
                new { Id = id, UserId = userId },
                cancellationToken: cancellationToken));
    }

    public async Task<bool> MarkReadAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(
                NotificationSqlQueries.MarkRead,
                new { Id = id, UserId = userId, ReadAt = DateTime.UtcNow },
                cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> MarkAllReadAsync(long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(
                NotificationSqlQueries.MarkAllRead,
                new { UserId = userId, ReadAt = DateTime.UtcNow },
                cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(
                NotificationSqlQueries.DeleteById,
                new { Id = id, UserId = userId },
                cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> DeleteAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(
                NotificationSqlQueries.DeleteAllByUser,
                new { UserId = userId },
                cancellationToken: cancellationToken));
        return rows > 0;
    }
}
