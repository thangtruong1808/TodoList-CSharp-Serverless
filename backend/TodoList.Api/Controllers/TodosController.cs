using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoList.Api.Models;
using TodoList.Api.Services;

namespace TodoList.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class TodosController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly ILogger<TodosController> _logger;

    public TodosController(ITaskService taskService, ILogger<TodosController> logger)
    {
        _taskService = taskService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskItem>>> GetTodos(
        [FromQuery] string? search,
        [FromQuery] Models.TaskStatus? status,
        [FromQuery] long? projectId,
        CancellationToken cancellationToken)
    {
        var tasks = await _taskService.GetAllAsync(
            new TaskQueryParams { Search = search, Status = status, ProjectId = projectId },
            cancellationToken);
        return Ok(tasks);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<TaskItem>> GetTodo(long id, CancellationToken cancellationToken)
    {
        var task = await _taskService.GetByIdAsync(id, cancellationToken);
        return task is null ? NotFound() : Ok(task);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<TaskItem>> CreateTodo(CreateTaskRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var task = await _taskService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetTodo), new { id = task.Id }, task);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateTodo(long id, UpdateTaskRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _taskService.UpdateAsync(id, request, cancellationToken);
            return updated ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> UpdateTodoStatus(long id, UpdateTaskStatusRequest request, CancellationToken cancellationToken)
    {
        var updated = await _taskService.UpdateStatusAsync(id, request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpPost("{id:long}/assign")]
    [Authorize(Roles = "ProjectManager")]
    public async Task<IActionResult> AssignTodo(long id, AssignTaskRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var assigned = await _taskService.AssignAsync(id, request, cancellationToken);
            return assigned ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> DeleteTodo(long id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _taskService.DeleteAsync(id, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }
}
