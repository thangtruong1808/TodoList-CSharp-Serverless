using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoList.Api.Models;
using TodoList.Api.Services;

namespace TodoList.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;

    public ProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectItem>>> GetProjects(CancellationToken cancellationToken)
    {
        return Ok(await _projectService.GetSelectableAsync(cancellationToken));
    }

    [HttpGet("manage")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<IEnumerable<ProjectListItemDto>>> GetManagedProjects(
        [FromQuery] string? search,
        [FromQuery] ProjectStatus? status,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _projectService.GetManagedListAsync(
                new ProjectQueryParams { Search = search, Status = status },
                cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpGet("{id:long}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<ProjectListItemDto>> GetProject(long id, CancellationToken cancellationToken)
    {
        try
        {
            var project = await _projectService.GetByIdAsync(id, cancellationToken);
            return project is null ? NotFound() : Ok(project);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<ProjectListItemDto>> CreateProject(
        CreateProjectRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var project = await _projectService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetProject), new { id = project.Id }, project);
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
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> UpdateProject(
        long id,
        UpdateProjectRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _projectService.UpdateAsync(id, request, cancellationToken);
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

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> DeleteProject(long id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _projectService.DeleteAsync(id, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpGet("{id:long}/members")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<IEnumerable<ProjectMemberItem>>> GetMembers(long id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _projectService.GetMembersAsync(id, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpPost("{id:long}/members")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> AssignMember(long id, AssignProjectMemberRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var assigned = await _projectService.AssignMemberAsync(id, request.UserId, cancellationToken);
            return assigned ? NoContent() : Conflict(new { message = "User is already assigned to this project." });
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

    [HttpGet("{id:long}/assignable-users")]
    [Authorize(Roles = "ProjectManager")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAssignableUsers(long id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _projectService.GetAssignableUsersForProjectAsync(id, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpDelete("{id:long}/members/{userId:long}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> RemoveMember(long id, long userId, CancellationToken cancellationToken)
    {
        try
        {
            var removed = await _projectService.RemoveMemberAsync(id, userId, cancellationToken);
            return removed ? NoContent() : NotFound();
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
}
