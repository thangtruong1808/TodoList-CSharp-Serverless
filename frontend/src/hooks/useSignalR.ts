import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { useDispatch, useSelector } from 'react-redux'
import { HUB_URL } from '../api/client'
import { getNotifications } from '../api/notifications'
import {
  addNotification,
  bumpProjectsRefresh,
  bumpTasksRefresh,
  setLoading,
  setNotifications,
  store,
  type AppDispatch,
  type RootState,
} from '../store'

type NotificationPayload = {
  notificationId: number
  type?: string
  taskId?: number | null
  taskName?: string
  title?: string
  message: string
  projectName?: string | null
  projectCode?: string | null
  createdAt: string
}

function toStoreNotification(payload: NotificationPayload) {
  return {
    id: payload.notificationId,
    title: payload.title ?? payload.taskName ?? 'Notification',
    message: payload.message,
    taskId: payload.taskId ?? null,
    type: payload.type,
    projectName: payload.projectName ?? null,
    projectCode: payload.projectCode ?? null,
    createdAt:
      typeof payload.createdAt === 'string'
        ? payload.createdAt
        : new Date(payload.createdAt).toISOString(),
  }
}

function shouldRefreshTasks(type: string | undefined, taskId: number | null | undefined) {
  return type === 'TaskAssigned' || type === 'TaskStatusUpdated' || taskId != null
}

function shouldRefreshProjects(type: string | undefined) {
  return type === 'ProjectAssigned'
}

export function useSignalR() {
  const dispatch = useDispatch<AppDispatch>()
  const accessToken = useSelector((s: RootState) => s.auth.accessToken)
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    if (!accessToken) {
      connectionRef.current?.stop()
      connectionRef.current = null
      return
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => store.getState().auth.accessToken ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build()

    connectionRef.current = connection

    const handleRealtimeNotification = (payload: NotificationPayload) => {
      dispatch(addNotification(toStoreNotification(payload)))
    }

    connection.on('TaskAssigned', handleRealtimeNotification)
    connection.on('ProjectAssigned', handleRealtimeNotification)
    connection.on('NotificationReceived', handleRealtimeNotification)

    let cancelled = false

    async function startConnection() {
      try {
        await connection.start()
      } catch {
        if (!cancelled) {
          window.setTimeout(() => {
            if (!cancelled && connection.state === signalR.HubConnectionState.Disconnected) {
              void startConnection()
            }
          }, 5000)
        }
      }
    }

    void startConnection()

    return () => {
      cancelled = true
      connection.stop()
    }
  }, [accessToken, dispatch])

  useEffect(() => {
    if (!accessToken) return

    async function load() {
      dispatch(setLoading(true))
      try {
        const previousIds = new Set(
          store.getState().notifications.items.map((item) => item.id),
        )
        const data = await getNotifications()
        const hasNewTaskAssignment = data.items.some(
          (item) => shouldRefreshTasks(item.type, item.taskId) && !previousIds.has(item.id),
        )
        const hasNewProjectAssignment = data.items.some(
          (item) => shouldRefreshProjects(item.type) && !previousIds.has(item.id),
        )

        dispatch(
          setNotifications({
            items: data.items.map((n) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              taskId: n.taskId,
              projectName: n.projectName,
              projectCode: n.projectCode,
              isRead: n.isRead,
              readAt: n.readAt,
              createdAt: n.createdAt,
            })),
            unreadCount: data.unreadCount,
          }),
        )

        if (previousIds.size > 0 && hasNewTaskAssignment) {
          dispatch(bumpTasksRefresh())
        }
        if (previousIds.size > 0 && hasNewProjectAssignment) {
          dispatch(bumpProjectsRefresh())
        }
      } finally {
        dispatch(setLoading(false))
      }
    }

    load()
    const interval = window.setInterval(load, 30000)
    return () => window.clearInterval(interval)
  }, [accessToken, dispatch])
}
