using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoList.Api.Models;
using TodoList.Api.Services;

namespace TodoList.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMe(CancellationToken cancellationToken)
    {
        var profile = await _userService.GetProfileAsync(cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var updated = await _userService.UpdateProfileAsync(request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpPut("me/password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _userService.ChangePasswordAsync(request, cancellationToken);
            return updated ? NoContent() : BadRequest(new { message = "Current password is incorrect." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("assignable")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAssignableUsers(CancellationToken cancellationToken)
    {
        return Ok(await _userService.GetAssignableUsersAsync(cancellationToken));
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<UserListItemDto>>> GetUsers(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _userService.GetAllUsersAsync(cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpPatch("{id:long}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserDto>> UpdateUserRole(
        long id,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _userService.UpdateUserRoleAsync(id, request.Role, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
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
