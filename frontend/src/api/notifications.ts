import { apiFetch } from './client'

export interface NotificationItem {
  id: number
  userId: number
  type: string
  title: string
  message: string
  taskId: number | null
  projectName: string | null
  projectCode: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationListResponse {
  items: NotificationItem[]
  unreadCount: number
}

type RawNotification = Record<string, unknown>

function toIsoString(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.includes('T')) return trimmed
    return trimmed.replace(' ', 'T') + (trimmed.endsWith('Z') ? '' : 'Z')
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return String(value)
}

export function formatProjectLabel(
  projectName: string | null | undefined,
  projectCode: string | null | undefined,
) {
  const name = projectName?.trim()
  const code = projectCode?.trim()
  if (code && name) return `${code} — ${name}`
  if (name) return name
  if (code) return code
  return 'Unknown project'
}

/** Normalize API payload (camelCase or PascalCase, bool/0/1). */
export function normalizeNotification(raw: RawNotification): NotificationItem {
  const isReadRaw = raw.isRead ?? raw.IsRead
  return {
    id: Number(raw.id ?? raw.Id),
    userId: Number(raw.userId ?? raw.UserId),
    type: String(raw.type ?? raw.Type ?? 'TaskAssigned'),
    title: String(raw.title ?? raw.Title ?? ''),
    message: String(raw.message ?? raw.Message ?? ''),
    taskId:
      raw.taskId != null || raw.TaskId != null
        ? Number(raw.taskId ?? raw.TaskId)
        : null,
    projectName:
      raw.projectName != null || raw.ProjectName != null
        ? String(raw.projectName ?? raw.ProjectName)
        : null,
    projectCode:
      raw.projectCode != null || raw.ProjectCode != null
        ? String(raw.projectCode ?? raw.ProjectCode)
        : null,
    isRead: isReadRaw === true || isReadRaw === 1 || isReadRaw === '1',
    readAt: toIsoString(raw.readAt ?? raw.ReadAt),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  }
}

export function mapNotificationList(data: Record<string, unknown>): NotificationListResponse {
  const itemsRaw = (data.items ?? data.Items ?? []) as RawNotification[]
  return {
    items: itemsRaw.map(normalizeNotification),
    unreadCount: Number(data.unreadCount ?? data.UnreadCount ?? 0),
  }
}

export async function getNotifications(limit = 20, offset = 0) {
  const data = await apiFetch<Record<string, unknown>>(
    `/notifications?limit=${limit}&offset=${offset}`,
  )
  return mapNotificationList(data)
}

export async function markNotificationRead(id: number) {
  const data = await apiFetch<Record<string, unknown>>(`/notifications/${id}/read`, {
    method: 'PATCH',
  })
  return normalizeNotification(data)
}

export async function markAllNotificationsRead() {
  return apiFetch<void>('/notifications/read-all', { method: 'PATCH' })
}

export async function deleteNotification(id: number) {
  return apiFetch<void>(`/notifications/${id}`, { method: 'DELETE' })
}

export async function deleteAllNotifications() {
  return apiFetch<void>('/notifications', { method: 'DELETE' })
}
