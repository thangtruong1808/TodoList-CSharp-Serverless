namespace TodoList.Api.Models;

public class ProjectListItemDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; }
    public long CreatedByUserId { get; set; }
    public long? OwnerUserId { get; set; }
    public string? OwnerFirstName { get; set; }
    public string? OwnerLastName { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
