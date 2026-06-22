using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoList.Api.Models;
using TodoList.Api.Services;

namespace TodoList.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<ActionResult<NotificationListResponse>> GetNotifications(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _notificationService.GetNotificationsAsync(limit, offset, cancellationToken));
    }

    [HttpPatch("{id:long}/read")]
    public async Task<ActionResult<NotificationItem>> MarkRead(long id, CancellationToken cancellationToken)
    {
        var updated = await _notificationService.MarkReadAsync(id, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        await _notificationService.MarkAllReadAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteNotification(long id, CancellationToken cancellationToken)
    {
        var deleted = await _notificationService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAllNotifications(CancellationToken cancellationToken)
    {
        await _notificationService.DeleteAllAsync(cancellationToken);
        return NoContent();
    }
}
