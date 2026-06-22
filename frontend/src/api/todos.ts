import { apiFetch } from './client'

export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled'

export interface TaskItem {
  id: number
  projectId: number
  projectName?: string | null
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  status: TaskStatus
  assignedToUserId: number | null
  assignedByUserId: number | null
  assignedAt: string | null
}

export interface CreateTaskPayload {
  name: string
  description?: string | null
  status?: TaskStatus
  projectId: number
}

export interface UpdateTaskPayload {
  name: string
  description?: string | null
  status: TaskStatus
}

export interface TaskQuery {
  search?: string
  status?: TaskStatus | ''
  projectId?: number
}

const TASK_STATUSES: TaskStatus[] = [
  'Pending',
  'InProgress',
  'Completed',
  'Cancelled',
]

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus)
}

export async function getTodos(query: TaskQuery = {}): Promise<TaskItem[]> {
  const params = new URLSearchParams()
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.status) params.set('status', query.status)
  if (query.projectId != null && query.projectId > 0) {
    params.set('projectId', String(query.projectId))
  }
  const qs = params.toString()
  return apiFetch<TaskItem[]>(`/todos${qs ? `?${qs}` : ''}`)
}

export async function createTodo(payload: CreateTaskPayload): Promise<TaskItem> {
  return apiFetch<TaskItem>('/todos', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      description: payload.description ?? null,
      status: payload.status ?? 'Pending',
      projectId: payload.projectId,
    }),
  })
}

export async function updateTodo(
  id: number,
  payload: UpdateTaskPayload,
): Promise<void> {
  return apiFetch<void>(`/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function updateTodoStatus(
  id: number,
  status: TaskStatus,
): Promise<void> {
  return apiFetch<void>(`/todos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function assignTodo(id: number, userId: number): Promise<void> {
  return apiFetch<void>(`/todos/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export async function deleteTodo(id: number): Promise<void> {
  return apiFetch<void>(`/todos/${id}`, { method: 'DELETE' })
}

export { TASK_STATUSES }
