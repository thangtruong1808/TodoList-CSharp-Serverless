namespace TodoList.Api.Models;

public class ProjectQueryParams
{
    public string? Search { get; set; }
    public ProjectStatus? Status { get; set; }
}
