using Dapper;
using TodoList.Api.Data;
using TodoList.Api.Models;

namespace TodoList.Api.Repositories;

public class ProjectRepository : IProjectRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ProjectRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<ProjectItem>> GetAllActiveAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var items = await connection.QueryAsync<ProjectItem>(
            new CommandDefinition(ProjectSqlQueries.SelectAllActive, cancellationToken: cancellationToken));
        return items.AsList();
    }

    public async Task<IReadOnlyList<ProjectItem>> GetForAssignedUserAsync(long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var items = await connection.QueryAsync<ProjectItem>(
            new CommandDefinition(
                ProjectSqlQueries.SelectForAssignedUser,
                new { UserId = userId },
                cancellationToken: cancellationToken));
        return items.AsList();
    }

    public async Task<IReadOnlyList<ProjectListItemDto>> GetManagedListForAdminAsync(
        string? search,
        ProjectStatus? status,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var items = await connection.QueryAsync<ProjectListItemDto>(
            new CommandDefinition(
                ProjectSqlQueries.SelectListAdmin,
                new { Search = search, Status = status is null ? (int?)null : (int)status },
                cancellationToken: cancellationToken));
        return items.AsList();
    }

    public async Task<IReadOnlyList<ProjectListItemDto>> GetManagedListForMemberAsync(
        long userId,
        string? search,
        ProjectStatus? status,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var items = await connection.QueryAsync<ProjectListItemDto>(
            new CommandDefinition(
                ProjectSqlQueries.SelectListForMember,
                new
                {
                    UserId = userId,
                    Search = search,
                    Status = status is null ? (int?)null : (int)status,
                    AdminRole = (int)UserRole.Admin,
                },
                cancellationToken: cancellationToken));
        return items.AsList();
    }

    public async Task<ProjectListItemDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<ProjectListItemDto>(
            new CommandDefinition(
                ProjectSqlQueries.SelectById,
                new { Id = id },
                cancellationToken: cancellationToken));
    }

    public async Task<ProjectListItemDto> CreateAsync(ProjectListItemDto project, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleAsync<ProjectListItemDto>(
            new CommandDefinition(
                ProjectSqlQueries.InsertProject,
                new
                {
                    project.Name,
                    project.Code,
                    project.Description,
                    Status = (int)project.Status,
                    project.CreatedByUserId,
                    project.OwnerUserId,
                    project.StartDate,
                    project.DueDate,
                    project.CreatedAt,
                    project.UpdatedAt
                },
                cancellationToken: cancellationToken));
    }

    public async Task<bool> UpdateAsync(ProjectListItemDto project, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(
                ProjectSqlQueries.UpdateProject,
                new
                {
                    project.Id,
                    project.Name,
                    project.Code,
                    project.Description,
                    Status = (int)project.Status,
                    project.OwnerUserId,
                    project.StartDate,
                    project.DueDate,
                    project.UpdatedAt
                },
                cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> SoftDeleteAsync(long id, DateTime updatedAt, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(
                ProjectSqlQueries.SoftDeleteProject,
                new { Id = id, UpdatedAt = updatedAt },
                cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> CodeExistsAsync(string code, long? excludeId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(
                ProjectSqlQueries.CodeExists,
                new { Code = code, ExcludeId = excludeId },
                cancellationToken: cancellationToken));
        return count > 0;
    }

    public async Task<IReadOnlyList<ProjectMemberItem>> GetMembersAsync(long projectId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var items = await connection.QueryAsync<ProjectMemberItem>(
            new CommandDefinition(
                ProjectSqlQueries.SelectMembers,
                new { ProjectId = projectId },
                cancellationToken: cancellationToken));
        return items.AsList();
    }

    public async Task<bool> AddMemberAsync(long projectId, long userId, long assignedByUserId, DateTime assignedAt, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(
                ProjectSqlQueries.InsertMember,
                new { ProjectId = projectId, UserId = userId, AssignedByUserId = assignedByUserId, AssignedAt = assignedAt },
                cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> RemoveMemberAsync(long projectId, long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(
                ProjectSqlQueries.DeleteMember,
                new { ProjectId = projectId, UserId = userId },
                cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> ExistsActiveAsync(long projectId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(
                ProjectSqlQueries.ExistsActive,
                new { ProjectId = projectId },
                cancellationToken: cancellationToken));
        return count > 0;
    }

    public async Task<bool> IsMemberAsync(long projectId, long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(
                ProjectSqlQueries.IsMember,
                new { ProjectId = projectId, UserId = userId },
                cancellationToken: cancellationToken));
        return count > 0;
    }

    public async Task<bool> IsAccessibleByPmAsync(long projectId, long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(
                ProjectSqlQueries.IsAccessibleByPm,
                new { ProjectId = projectId, UserId = userId, AdminRole = (int)UserRole.Admin },
                cancellationToken: cancellationToken));
        return count > 0;
    }

    public async Task<IReadOnlyList<ProjectManagerItem>> GetProjectManagersAsync(
        long projectId,
        long? assignedByUserId = null,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var items = await connection.QueryAsync<ProjectManagerItem>(
            new CommandDefinition(
                ProjectSqlQueries.SelectProjectManagers,
                new
                {
                    ProjectId = projectId,
                    AssignedByUserId = assignedByUserId is > 0 ? assignedByUserId.Value : 0L,
                },
                cancellationToken: cancellationToken));
        return items.AsList();
    }

    public async Task<IReadOnlyList<UserDto>> GetAssignableUsersAsync(long projectId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        var items = await connection.QueryAsync<UserDto>(
            new CommandDefinition(
                ProjectSqlQueries.SelectAssignableUsers,
                new { ProjectId = projectId },
                cancellationToken: cancellationToken));
        return items.AsList();
    }
}
