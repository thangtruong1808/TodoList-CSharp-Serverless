namespace TodoList.Api.Models;

public class NotificationItem
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Type { get; set; } = "TaskAssigned";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public long? TaskId { get; set; }
    public long? ProjectId { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? ProjectName { get; set; }
    public string? ProjectCode { get; set; }
}
