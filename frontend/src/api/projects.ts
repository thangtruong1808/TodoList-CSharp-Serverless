import { apiFetch, type UserDto } from './client'

export type ProjectStatus = 'Active' | 'OnHold' | 'Completed' | 'Archived'

export interface ProjectItem {
  id: number
  name: string
  code: string | null
}

export interface ProjectListItem {
  id: number
  name: string
  code: string | null
  description: string | null
  status: ProjectStatus
  createdByUserId: number
  ownerUserId: number | null
  ownerFirstName: string | null
  ownerLastName: string | null
  startDate: string | null
  dueDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectMemberItem {
  userId: number
  email: string
  firstName: string
  lastName: string
  assignedAt: string
}

export interface CreateProjectPayload {
  name: string
  code?: string | null
  description?: string | null
  status?: ProjectStatus
  ownerUserId?: number | null
  startDate?: string | null
  dueDate?: string | null
}

export interface UpdateProjectPayload {
  name: string
  code?: string | null
  description?: string | null
  status: ProjectStatus
  ownerUserId?: number | null
  startDate?: string | null
  dueDate?: string | null
}

export const PROJECT_STATUSES: ProjectStatus[] = [
  'Active',
  'OnHold',
  'Completed',
  'Archived',
]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  Active: 'Active',
  OnHold: 'On Hold',
  Completed: 'Completed',
  Archived: 'Archived',
}

type RawProject = Record<string, unknown>
type RawMember = Record<string, unknown>

function normalizeStatus(value: unknown): ProjectStatus {
  const status = String(value ?? 'Active')
  if (
    status === 'Active' ||
    status === 'OnHold' ||
    status === 'Completed' ||
    status === 'Archived'
  ) {
    return status
  }
  return 'Active'
}

function normalizeDate(value: unknown): string | null {
  if (value == null) return null
  const raw = String(value)
  if (!raw) return null
  return raw.split('T')[0]
}

function normalizeProject(raw: RawProject): ProjectItem {
  return {
    id: Number(raw.id ?? raw.Id),
    name: String(raw.name ?? raw.Name ?? ''),
    code: raw.code != null || raw.Code != null ? String(raw.code ?? raw.Code) : null,
  }
}

function normalizeProjectListItem(raw: RawProject): ProjectListItem {
  return {
    id: Number(raw.id ?? raw.Id),
    name: String(raw.name ?? raw.Name ?? ''),
    code: raw.code != null || raw.Code != null ? String(raw.code ?? raw.Code) : null,
    description:
      raw.description != null || raw.Description != null
        ? String(raw.description ?? raw.Description)
        : null,
    status: normalizeStatus(raw.status ?? raw.Status),
    createdByUserId: Number(raw.createdByUserId ?? raw.CreatedByUserId),
    ownerUserId:
      raw.ownerUserId != null || raw.OwnerUserId != null
        ? Number(raw.ownerUserId ?? raw.OwnerUserId)
        : null,
    ownerFirstName:
      raw.ownerFirstName != null || raw.OwnerFirstName != null
        ? String(raw.ownerFirstName ?? raw.OwnerFirstName)
        : null,
    ownerLastName:
      raw.ownerLastName != null || raw.OwnerLastName != null
        ? String(raw.ownerLastName ?? raw.OwnerLastName)
        : null,
    startDate: normalizeDate(raw.startDate ?? raw.StartDate),
    dueDate: normalizeDate(raw.dueDate ?? raw.DueDate),
    isActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.UpdatedAt ?? ''),
  }
}

function normalizeMember(raw: RawMember): ProjectMemberItem {
  const assignedAt = raw.assignedAt ?? raw.AssignedAt
  return {
    userId: Number(raw.userId ?? raw.UserId),
    email: String(raw.email ?? raw.Email ?? ''),
    firstName: String(raw.firstName ?? raw.FirstName ?? ''),
    lastName: String(raw.lastName ?? raw.LastName ?? ''),
    assignedAt: String(assignedAt ?? ''),
  }
}

export function ownerDisplayName(project: ProjectListItem) {
  const name = `${project.ownerFirstName ?? ''} ${project.ownerLastName ?? ''}`.trim()
  return name || '—'
}

export async function getProjects() {
  const data = await apiFetch<RawProject[]>('/projects')
  return data.map(normalizeProject)
}

export async function getManagedProjects(query: {
  search?: string
  status?: ProjectStatus | ''
} = {}) {
  const params = new URLSearchParams()
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.status) params.set('status', query.status)
  const qs = params.toString()
  const data = await apiFetch<RawProject[]>(`/projects/manage${qs ? `?${qs}` : ''}`)
  return data.map(normalizeProjectListItem)
}

export async function createProject(payload: CreateProjectPayload) {
  const data = await apiFetch<RawProject>('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      code: payload.code ?? null,
      description: payload.description ?? null,
      status: payload.status ?? 'Active',
      ownerUserId: payload.ownerUserId ?? null,
      startDate: payload.startDate || null,
      dueDate: payload.dueDate || null,
    }),
  })
  return normalizeProjectListItem(data)
}

export async function updateProject(id: number, payload: UpdateProjectPayload) {
  return apiFetch<void>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: payload.name,
      code: payload.code ?? null,
      description: payload.description ?? null,
      status: payload.status,
      ownerUserId: payload.ownerUserId ?? null,
      startDate: payload.startDate || null,
      dueDate: payload.dueDate || null,
    }),
  })
}

export async function deleteProject(id: number) {
  return apiFetch<void>(`/projects/${id}`, { method: 'DELETE' })
}

export async function getProjectMembers(projectId: number) {
  const data = await apiFetch<RawMember[]>(`/projects/${projectId}/members`)
  return data.map(normalizeMember)
}

export async function assignProjectMember(projectId: number, userId: number) {
  return apiFetch<void>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export async function removeProjectMember(projectId: number, userId: number) {
  return apiFetch<void>(`/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  })
}

export async function getProjectAssignableUsers(projectId: number) {
  const data = await apiFetch<Record<string, unknown>[]>(`/projects/${projectId}/assignable-users`)
  return data.map((raw) => ({
    id: Number(raw.id ?? raw.Id),
    email: String(raw.email ?? raw.Email ?? ''),
    firstName: String(raw.firstName ?? raw.FirstName ?? ''),
    lastName: String(raw.lastName ?? raw.LastName ?? ''),
    phone: raw.phone != null || raw.Phone != null ? String(raw.phone ?? raw.Phone) : null,
    role: String(raw.role ?? raw.Role ?? 'User') as UserDto['role'],
  }))
}

export function memberDisplayName(member: ProjectMemberItem | UserDto) {
  const name = `${member.firstName} ${member.lastName}`.trim()
  return name || member.email
}
