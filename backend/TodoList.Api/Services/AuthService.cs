using TodoList.Api.Infrastructure;
using TodoList.Api.Models;
using TodoList.Api.Repositories;

namespace TodoList.Api.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IAuthRepository _authRepository;
    private readonly JwtTokenService _jwtTokenService;

    public AuthService(IUserRepository userRepository, IAuthRepository authRepository, JwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _authRepository = authRepository;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        ValidateRegistration(request);

        var existing = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant(), cancellationToken);
        if (existing is not null)
        {
            throw new ArgumentException("Email is already registered.");
        }

        var now = DateTime.UtcNow;
        var user = await _userRepository.CreateAsync(new User
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Phone = request.Phone?.Trim(),
            Role = request.Role is UserRole.Admin ? UserRole.Admin : UserRole.User,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant(), cancellationToken);
        if (user is null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var hash = TokenHasher.Hash(request.RefreshToken);
        var stored = await _authRepository.GetRefreshTokenAsync(hash, cancellationToken);
        if (stored is null || stored.Value.RevokedAt.HasValue || stored.Value.ExpiresAt < DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        await _authRepository.RevokeRefreshTokenAsync(hash, cancellationToken);
        var user = await _userRepository.GetByIdAsync(stored.Value.UserId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedAccessException("User is inactive.");
        }

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task LogoutAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var hash = TokenHasher.Hash(request.RefreshToken);
        await _authRepository.RevokeRefreshTokenAsync(hash, cancellationToken);
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant(), cancellationToken);
        if (user is null)
        {
            return new ForgotPasswordResponse
            {
                Message = "If the email exists, a reset token has been generated (dev mode)."
            };
        }

        var token = _jwtTokenService.GeneratePasswordResetToken();
        var hash = TokenHasher.Hash(token);
        await _authRepository.StorePasswordResetTokenAsync(user.Id, hash, _jwtTokenService.GetPasswordResetExpiry(), cancellationToken);

        return new ForgotPasswordResponse
        {
            Message = "Password reset token generated (dev mode).",
            ResetToken = token,
            ResetUrl = $"/reset-password?token={token}"
        };
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            throw new ArgumentException("Password must be at least 8 characters.");
        }

        var hash = TokenHasher.Hash(request.Token);
        var stored = await _authRepository.GetPasswordResetTokenAsync(hash, cancellationToken);
        if (stored is null || stored.Value.UsedAt.HasValue || stored.Value.ExpiresAt < DateTime.UtcNow)
        {
            throw new ArgumentException("Invalid or expired reset token.");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _userRepository.UpdatePasswordAsync(stored.Value.UserId, passwordHash, DateTime.UtcNow, cancellationToken);
        await _authRepository.MarkPasswordResetTokenUsedAsync(hash, cancellationToken);
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();
        await _authRepository.StoreRefreshTokenAsync(user.Id, TokenHasher.Hash(refreshToken), _jwtTokenService.GetRefreshExpiry(), cancellationToken);

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            User = MapUser(user)
        };
    }

    private static void ValidateRegistration(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email)) throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8) throw new ArgumentException("Password must be at least 8 characters.");
        if (string.IsNullOrWhiteSpace(request.FirstName)) throw new ArgumentException("First name is required.");
        if (string.IsNullOrWhiteSpace(request.LastName)) throw new ArgumentException("Last name is required.");
    }

    public static UserDto MapUser(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Phone = user.Phone,
        Role = user.Role
    };
}
