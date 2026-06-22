using TodoList.Api.Models;

namespace TodoList.Api.Services;

public interface IProjectService
{
    Task<IReadOnlyList<ProjectItem>> GetSelectableAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProjectListItemDto>> GetManagedListAsync(ProjectQueryParams query, CancellationToken cancellationToken = default);
    Task<ProjectListItemDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<ProjectListItemDto> CreateAsync(CreateProjectRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(long id, UpdateProjectRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProjectMemberItem>> GetMembersAsync(long projectId, CancellationToken cancellationToken = default);
    Task<bool> AssignMemberAsync(long projectId, long userId, CancellationToken cancellationToken = default);
    Task<bool> RemoveMemberAsync(long projectId, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserDto>> GetAssignableUsersForProjectAsync(long projectId, CancellationToken cancellationToken = default);
}
