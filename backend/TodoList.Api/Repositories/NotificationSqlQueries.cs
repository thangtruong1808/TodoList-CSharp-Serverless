namespace TodoList.Api.Repositories;

internal static class NotificationSqlQueries
{
    private const string SelectColumns = """
        n.Id, n.UserId, n.Type, n.Title, n.Message, n.TaskId, n.IsRead,
        COALESCE(n.ReadAt, IF(n.IsRead = 1, n.CreatedAt, NULL)) AS ReadAt,
        n.CreatedAt,
        p.Name AS ProjectName,
        p.Code AS ProjectCode
        """;

    private const string FromJoin = """
        FROM Notifications n
        LEFT JOIN Tasks t ON t.Id = n.TaskId
        LEFT JOIN Projects p ON p.Id = COALESCE(t.ProjectId, n.ProjectId)
        """;

    public static readonly string Insert = $"""
        INSERT INTO Notifications (UserId, Type, Title, Message, TaskId, ProjectId, IsRead, ReadAt, CreatedAt)
        VALUES (@UserId, @Type, @Title, @Message, @TaskId, @ProjectId, @IsRead, @ReadAt, @CreatedAt);

        SELECT {SelectColumns}
        {FromJoin}
        WHERE n.Id = LAST_INSERT_ID();
        """;

    public static readonly string SelectByUser = $"""
        SELECT {SelectColumns}
        {FromJoin}
        WHERE n.UserId = @UserId
        ORDER BY n.CreatedAt DESC
        LIMIT @Limit OFFSET @Offset;
        """;

    public const string CountUnread = """
        SELECT COUNT(*) FROM Notifications WHERE UserId = @UserId AND IsRead = 0;
        """;

    public const string MarkRead = """
        UPDATE Notifications
        SET IsRead = 1, ReadAt = COALESCE(ReadAt, @ReadAt)
        WHERE Id = @Id AND UserId = @UserId;
        """;

    public const string MarkAllRead = """
        UPDATE Notifications
        SET IsRead = 1, ReadAt = COALESCE(ReadAt, @ReadAt)
        WHERE UserId = @UserId AND IsRead = 0;
        """;

    public const string DeleteById = """
        DELETE FROM Notifications
        WHERE Id = @Id AND UserId = @UserId;
        """;

    public const string DeleteAllByUser = """
        DELETE FROM Notifications
        WHERE UserId = @UserId;
        """;

    public static readonly string SelectById = $"""
        SELECT {SelectColumns}
        {FromJoin}
        WHERE n.Id = @Id AND n.UserId = @UserId
        LIMIT 1;
        """;
}
