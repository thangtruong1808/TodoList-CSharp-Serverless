using TodoList.Api.Infrastructure;
using TodoList.Api.Models;
using TodoList.Api.Repositories;

namespace TodoList.Api.Services;

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notificationDispatch;
    private readonly ICurrentUserService _currentUser;

    public ProjectService(
        IProjectRepository projectRepository,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatch,
        ICurrentUserService currentUser)
    {
        _projectRepository = projectRepository;
        _userRepository = userRepository;
        _notificationDispatch = notificationDispatch;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<ProjectItem>> GetSelectableAsync(CancellationToken cancellationToken = default)
    {
        if (_currentUser.IsAdmin)
        {
            return await _projectRepository.GetAllActiveAsync(cancellationToken);
        }

        if (!_currentUser.UserId.HasValue)
        {
            return [];
        }

        return await _projectRepository.GetForAssignedUserAsync(_currentUser.UserId.Value, cancellationToken);
    }

    public async Task<IReadOnlyList<ProjectListItemDto>> GetManagedListAsync(
        ProjectQueryParams query,
        CancellationToken cancellationToken = default)
    {
        EnsurePmOrAdmin();
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim();

        if (_currentUser.IsAdmin)
        {
            return await _projectRepository.GetManagedListForAdminAsync(search, query.Status, cancellationToken);
        }

        if (_currentUser.IsProjectManager && _currentUser.UserId.HasValue)
        {
            return await _projectRepository.GetManagedListForMemberAsync(
                _currentUser.UserId.Value,
                search,
                query.Status,
                cancellationToken);
        }

        return [];
    }

    public async Task<ProjectListItemDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        EnsurePmOrAdmin();
        var project = await _projectRepository.GetByIdAsync(id, cancellationToken);
        if (project is null || !await CanManageProjectAsync(id, cancellationToken))
        {
            return null;
        }

        return project;
    }

    public async Task<ProjectListItemDto> CreateAsync(CreateProjectRequest request, CancellationToken cancellationToken = default)
    {
        EnsurePmOrAdmin();
        if (!_currentUser.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("User context is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Project name is required.", nameof(request));
        }

        var code = NormalizeCode(request.Code);
        if (code is not null && await _projectRepository.CodeExistsAsync(code, null, cancellationToken))
        {
            throw new ArgumentException("Project code is already in use.", nameof(request));
        }

        var ownerUserId = await ResolveOwnerUserIdAsync(request.OwnerUserId, cancellationToken);
        var now = DateTime.UtcNow;
        var project = new ProjectListItemDto
        {
            Name = request.Name.Trim(),
            Code = code,
            Description = NormalizeDescription(request.Description),
            Status = request.Status,
            CreatedByUserId = _currentUser.UserId.Value,
            OwnerUserId = ownerUserId,
            StartDate = request.StartDate?.Date,
            DueDate = request.DueDate?.Date,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _projectRepository.CreateAsync(project, cancellationToken);

        await _projectRepository.AddMemberAsync(
            created.Id,
            _currentUser.UserId.Value,
            _currentUser.UserId.Value,
            now,
            cancellationToken);

        if (ownerUserId.HasValue && ownerUserId.Value != _currentUser.UserId.Value)
        {
            await _projectRepository.AddMemberAsync(
                created.Id,
                ownerUserId.Value,
                _currentUser.UserId.Value,
                now,
                cancellationToken);
        }

        return (await _projectRepository.GetByIdAsync(created.Id, cancellationToken)) ?? created;
    }

    public async Task<bool> UpdateAsync(long id, UpdateProjectRequest request, CancellationToken cancellationToken = default)
    {
        EnsurePmOrAdmin();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Project name is required.", nameof(request));
        }

        var existing = await _projectRepository.GetByIdAsync(id, cancellationToken);
        if (existing is null || !await CanManageProjectAsync(id, cancellationToken))
        {
            return false;
        }

        var code = NormalizeCode(request.Code);
        if (code is not null && await _projectRepository.CodeExistsAsync(code, id, cancellationToken))
        {
            throw new ArgumentException("Project code is already in use.", nameof(request));
        }

        existing.Name = request.Name.Trim();
        existing.Code = code;
        existing.Description = NormalizeDescription(request.Description);
        existing.Status = request.Status;
        existing.OwnerUserId = _currentUser.IsAdmin
            ? await ResolveOwnerUserIdAsync(request.OwnerUserId, cancellationToken)
            : existing.OwnerUserId;
        existing.StartDate = request.StartDate?.Date;
        existing.DueDate = request.DueDate?.Date;
        existing.UpdatedAt = DateTime.UtcNow;

        return await _projectRepository.UpdateAsync(existing, cancellationToken);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        EnsurePmOrAdmin();
        if (!await CanManageProjectAsync(id, cancellationToken))
        {
            return false;
        }

        return await _projectRepository.SoftDeleteAsync(id, DateTime.UtcNow, cancellationToken);
    }

    public async Task<IReadOnlyList<ProjectMemberItem>> GetMembersAsync(long projectId, CancellationToken cancellationToken = default)
    {
        if (!await CanManageProjectMembersAsync(projectId, cancellationToken))
        {
            throw new UnauthorizedAccessException("You cannot view members for this project.");
        }

        if (!await _projectRepository.ExistsActiveAsync(projectId, cancellationToken))
        {
            return [];
        }

        return await _projectRepository.GetMembersAsync(projectId, cancellationToken);
    }

    public async Task<bool> AssignMemberAsync(long projectId, long userId, CancellationToken cancellationToken = default)
    {
        if (!await CanManageProjectMembersAsync(projectId, cancellationToken))
        {
            throw new UnauthorizedAccessException("You cannot manage members for this project.");
        }

        if (!_currentUser.UserId.HasValue)
        {
            return false;
        }

        if (!await _projectRepository.ExistsActiveAsync(projectId, cancellationToken))
        {
            return false;
        }

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null || !user.IsActive || user.Role is UserRole.Admin)
        {
            throw new ArgumentException("Invalid user. Only active users can be assigned to projects.");
        }

        if (_currentUser.IsProjectManager && !_currentUser.IsAdmin && user.Role is not UserRole.User)
        {
            throw new ArgumentException("Project managers can only add users to the project team.");
        }

        var assigned = await _projectRepository.AddMemberAsync(
            projectId,
            userId,
            _currentUser.UserId.Value,
            DateTime.UtcNow,
            cancellationToken);

        if (assigned && user.Role == UserRole.User)
        {
            var project = await _projectRepository.GetByIdAsync(projectId, cancellationToken);
            var assigner = await _userRepository.GetByIdAsync(_currentUser.UserId.Value, cancellationToken);
            if (project is not null && assigner is not null)
            {
                await _notificationDispatch.NotifyUserProjectAssignedAsync(
                    userId,
                    project,
                    assigner,
                    cancellationToken);
            }
        }

        return assigned;
    }

    public async Task<bool> RemoveMemberAsync(long projectId, long userId, CancellationToken cancellationToken = default)
    {
        if (!await CanManageProjectMembersAsync(projectId, cancellationToken))
        {
            throw new UnauthorizedAccessException("You cannot manage members for this project.");
        }

        if (!await _projectRepository.ExistsActiveAsync(projectId, cancellationToken))
        {
            return false;
        }

        if (_currentUser.IsProjectManager && !_currentUser.IsAdmin && userId == _currentUser.UserId)
        {
            throw new ArgumentException("You cannot remove yourself from the project.");
        }

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (_currentUser.IsProjectManager && !_currentUser.IsAdmin && user?.Role is not UserRole.User)
        {
            throw new ArgumentException("Project managers can only remove users from the project team.");
        }

        return await _projectRepository.RemoveMemberAsync(projectId, userId, cancellationToken);
    }

    public async Task<IReadOnlyList<UserDto>> GetAssignableUsersForProjectAsync(long projectId, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsProjectManager || !_currentUser.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("Only project managers can list assignable users.");
        }

        if (!await _projectRepository.ExistsActiveAsync(projectId, cancellationToken))
        {
            return [];
        }

        if (!await _projectRepository.IsMemberAsync(projectId, _currentUser.UserId.Value, cancellationToken))
        {
            throw new UnauthorizedAccessException("You are not assigned to this project.");
        }

        return await _projectRepository.GetAssignableUsersAsync(projectId, cancellationToken);
    }

    private async Task<bool> CanManageProjectAsync(long projectId, CancellationToken cancellationToken)
    {
        if (_currentUser.IsAdmin)
        {
            return await _projectRepository.ExistsActiveAsync(projectId, cancellationToken);
        }

        if (!_currentUser.IsProjectManager || !_currentUser.UserId.HasValue)
        {
            return false;
        }

        return await _projectRepository.IsAccessibleByPmAsync(
            projectId,
            _currentUser.UserId.Value,
            cancellationToken);
    }

    private async Task<long?> ResolveOwnerUserIdAsync(long? ownerUserId, CancellationToken cancellationToken)
    {
        if (_currentUser.IsProjectManager)
        {
            return _currentUser.UserId;
        }

        if (!ownerUserId.HasValue || ownerUserId.Value <= 0)
        {
            return null;
        }

        var owner = await _userRepository.GetByIdAsync(ownerUserId.Value, cancellationToken);
        if (owner is null || !owner.IsActive || owner.Role is not (UserRole.ProjectManager or UserRole.Admin))
        {
            throw new ArgumentException("Owner must be an active project manager or admin.");
        }

        return owner.Id;
    }

    private static string? NormalizeCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        return code.Trim().ToUpperInvariant();
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        return description.Trim();
    }

    private void EnsurePmOrAdmin()
    {
        if (!_currentUser.IsAdmin && !_currentUser.IsProjectManager)
        {
            throw new UnauthorizedAccessException("Only admins and project managers can manage projects.");
        }
    }

    private async Task<bool> CanManageProjectMembersAsync(long projectId, CancellationToken cancellationToken)
    {
        if (_currentUser.IsAdmin)
        {
            return await _projectRepository.ExistsActiveAsync(projectId, cancellationToken);
        }

        return await CanManageProjectAsync(projectId, cancellationToken);
    }

    private void EnsureAdmin()
    {
        if (!_currentUser.IsAdmin)
        {
            throw new UnauthorizedAccessException("Only admins can manage project members.");
        }
    }
}
