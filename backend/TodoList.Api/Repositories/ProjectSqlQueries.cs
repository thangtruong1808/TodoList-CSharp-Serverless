namespace TodoList.Api.Repositories;

internal static class ProjectSqlQueries
{
    public const string SelectAllActive = """
        SELECT Id, Name, Code
        FROM Projects
        WHERE IsActive = 1
        ORDER BY Name;
        """;

    public const string SelectForAssignedUser = """
        SELECT DISTINCT p.Id, p.Name, p.Code
        FROM Projects p
        INNER JOIN ProjectMembers pm ON pm.ProjectId = p.Id
        WHERE p.IsActive = 1
          AND pm.UserId = @UserId
        ORDER BY p.Name;
        """;

    public const string SelectMembers = """
        SELECT pm.UserId, u.Email, u.FirstName, u.LastName, pm.AssignedAt
        FROM ProjectMembers pm
        INNER JOIN Users u ON u.Id = pm.UserId
        WHERE pm.ProjectId = @ProjectId
          AND u.IsActive = 1
        ORDER BY u.FirstName, u.LastName;
        """;

    public const string InsertMember = """
        INSERT IGNORE INTO ProjectMembers (ProjectId, UserId, AssignedByUserId, AssignedAt)
        VALUES (@ProjectId, @UserId, @AssignedByUserId, @AssignedAt);
        """;

    public const string DeleteMember = """
        DELETE FROM ProjectMembers
        WHERE ProjectId = @ProjectId AND UserId = @UserId;
        """;

    public const string ExistsActive = """
        SELECT COUNT(*) FROM Projects WHERE Id = @ProjectId AND IsActive = 1;
        """;

    public const string IsMember = """
        SELECT COUNT(*) FROM ProjectMembers WHERE ProjectId = @ProjectId AND UserId = @UserId;
        """;

    public const string SelectProjectManagers = """
        SELECT DISTINCT u.Id, u.Email, u.FirstName, u.LastName
        FROM ProjectMembers pm
        INNER JOIN Users u ON u.Id = pm.UserId
        WHERE pm.ProjectId = @ProjectId
          AND u.Role = 2
          AND u.IsActive = 1
        UNION
        SELECT u.Id, u.Email, u.FirstName, u.LastName
        FROM Users u
        WHERE @AssignedByUserId > 0
          AND u.Id = @AssignedByUserId
          AND u.Role = 2
          AND u.IsActive = 1;
        """;

    public const string SelectAssignableUsers = """
        SELECT u.Id, u.Email, u.FirstName, u.LastName, u.Phone, u.Role
        FROM ProjectMembers pm
        INNER JOIN Users u ON u.Id = pm.UserId
        WHERE pm.ProjectId = @ProjectId
          AND u.Role = 0
          AND u.IsActive = 1
        ORDER BY u.FirstName, u.LastName;
        """;

    public const string SelectListBase = """
        SELECT p.Id, p.Name, p.Code, p.Description, p.Status,
               p.CreatedByUserId, p.OwnerUserId,
               ou.FirstName AS OwnerFirstName, ou.LastName AS OwnerLastName,
               p.StartDate, p.DueDate, p.IsActive, p.CreatedAt, p.UpdatedAt
        FROM Projects p
        LEFT JOIN Users ou ON ou.Id = p.OwnerUserId
        """;

    public const string SelectListAdmin = """
        SELECT p.Id, p.Name, p.Code, p.Description, p.Status,
               p.CreatedByUserId, p.OwnerUserId,
               ou.FirstName AS OwnerFirstName, ou.LastName AS OwnerLastName,
               p.StartDate, p.DueDate, p.IsActive, p.CreatedAt, p.UpdatedAt
        FROM Projects p
        LEFT JOIN Users ou ON ou.Id = p.OwnerUserId
        WHERE p.IsActive = 1
          AND (@Search IS NULL OR @Search = '' OR p.Name LIKE CONCAT('%', @Search, '%')
               OR p.Code LIKE CONCAT('%', @Search, '%')
               OR p.Description LIKE CONCAT('%', @Search, '%'))
          AND (@Status IS NULL OR p.Status = @Status)
        ORDER BY p.UpdatedAt DESC;
        """;

    public const string SelectListForMember = """
        SELECT DISTINCT p.Id, p.Name, p.Code, p.Description, p.Status,
               p.CreatedByUserId, p.OwnerUserId,
               ou.FirstName AS OwnerFirstName, ou.LastName AS OwnerLastName,
               p.StartDate, p.DueDate, p.IsActive, p.CreatedAt, p.UpdatedAt
        FROM Projects p
        LEFT JOIN Users ou ON ou.Id = p.OwnerUserId
        WHERE p.IsActive = 1
          AND (
            p.OwnerUserId = @UserId
            OR p.CreatedByUserId = @UserId
            OR EXISTS (
                SELECT 1
                FROM ProjectMembers pm
                INNER JOIN Users assignedBy ON assignedBy.Id = pm.AssignedByUserId
                    AND assignedBy.Role = @AdminRole
                WHERE pm.ProjectId = p.Id
                  AND pm.UserId = @UserId
                  AND (p.OwnerUserId IS NULL OR p.OwnerUserId = @UserId)
            )
          )
          AND (@Search IS NULL OR @Search = '' OR p.Name LIKE CONCAT('%', @Search, '%')
               OR p.Code LIKE CONCAT('%', @Search, '%')
               OR p.Description LIKE CONCAT('%', @Search, '%'))
          AND (@Status IS NULL OR p.Status = @Status)
        ORDER BY p.UpdatedAt DESC;
        """;

    public const string IsAccessibleByPm = """
        SELECT COUNT(*) FROM Projects p
        WHERE p.Id = @ProjectId
          AND p.IsActive = 1
          AND (
            p.OwnerUserId = @UserId
            OR p.CreatedByUserId = @UserId
            OR EXISTS (
                SELECT 1
                FROM ProjectMembers pm
                INNER JOIN Users assignedBy ON assignedBy.Id = pm.AssignedByUserId
                    AND assignedBy.Role = @AdminRole
                WHERE pm.ProjectId = p.Id
                  AND pm.UserId = @UserId
                  AND (p.OwnerUserId IS NULL OR p.OwnerUserId = @UserId)
            )
          );
        """;

    public const string SelectById = """
        SELECT p.Id, p.Name, p.Code, p.Description, p.Status,
               p.CreatedByUserId, p.OwnerUserId,
               ou.FirstName AS OwnerFirstName, ou.LastName AS OwnerLastName,
               p.StartDate, p.DueDate, p.IsActive, p.CreatedAt, p.UpdatedAt
        FROM Projects p
        LEFT JOIN Users ou ON ou.Id = p.OwnerUserId
        WHERE p.Id = @Id AND p.IsActive = 1;
        """;

    public const string InsertProject = """
        INSERT INTO Projects (Name, Code, Description, Status, CreatedByUserId, OwnerUserId,
                              StartDate, DueDate, IsActive, CreatedAt, UpdatedAt)
        VALUES (@Name, @Code, @Description, @Status, @CreatedByUserId, @OwnerUserId,
                @StartDate, @DueDate, 1, @CreatedAt, @UpdatedAt);

        SELECT p.Id, p.Name, p.Code, p.Description, p.Status,
               p.CreatedByUserId, p.OwnerUserId,
               ou.FirstName AS OwnerFirstName, ou.LastName AS OwnerLastName,
               p.StartDate, p.DueDate, p.IsActive, p.CreatedAt, p.UpdatedAt
        FROM Projects p
        LEFT JOIN Users ou ON ou.Id = p.OwnerUserId
        WHERE p.Id = LAST_INSERT_ID();
        """;

    public const string UpdateProject = """
        UPDATE Projects
        SET Name = @Name, Code = @Code, Description = @Description, Status = @Status,
            OwnerUserId = @OwnerUserId, StartDate = @StartDate, DueDate = @DueDate,
            UpdatedAt = @UpdatedAt
        WHERE Id = @Id AND IsActive = 1;
        """;

    public const string SoftDeleteProject = """
        UPDATE Projects SET IsActive = 0, UpdatedAt = @UpdatedAt WHERE Id = @Id AND IsActive = 1;
        """;

    public const string CodeExists = """
        SELECT COUNT(*) FROM Projects
        WHERE Code = @Code AND Code IS NOT NULL AND Code <> ''
          AND IsActive = 1
          AND (@ExcludeId IS NULL OR Id <> @ExcludeId);
        """;
}
