using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TodoList.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
}
