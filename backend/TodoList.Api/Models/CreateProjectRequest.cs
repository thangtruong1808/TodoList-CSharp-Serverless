namespace TodoList.Api.Models;

public class CreateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;
    public long? OwnerUserId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
}
