using TodoList.Api.Models;

namespace TodoList.Api.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task LogoutAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
}

public interface IUserService
{
    Task<UserDto?> GetProfileAsync(CancellationToken cancellationToken = default);
    Task<bool> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken = default);
    Task<bool> ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserDto>> GetAssignableUsersAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserListItemDto>> GetAllUsersAsync(CancellationToken cancellationToken = default);
    Task<UserDto?> UpdateUserRoleAsync(long id, UserRole role, CancellationToken cancellationToken = default);
}

public interface INotificationService
{
    Task<NotificationListResponse> GetNotificationsAsync(int limit, int offset, CancellationToken cancellationToken = default);
    Task<NotificationItem?> MarkReadAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> MarkAllReadAsync(CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> DeleteAllAsync(CancellationToken cancellationToken = default);
}

public interface IDashboardService
{
    Task<DashboardStats> GetStatsAsync(CancellationToken cancellationToken = default);
}
