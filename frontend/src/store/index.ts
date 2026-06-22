import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { configureApiClient, type AuthResponse, type UserDto } from '../api/client'

const STORAGE_KEY = 'todolist_auth'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserDto | null
}

function loadAuth(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { accessToken: null, refreshToken: null, user: null }
    return JSON.parse(raw) as AuthState
  } catch {
    return { accessToken: null, refreshToken: null, user: null }
  }
}

function saveAuth(state: AuthState) {
  if (state.accessToken && state.refreshToken && state.user) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } else {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

const initialState: AuthState = loadAuth()

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthResponse>) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.user = action.payload.user
      saveAuth(state)
    },
    setTokens(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string } | null>,
    ) {
      if (!action.payload) {
        state.accessToken = null
        state.refreshToken = null
        state.user = null
      } else {
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
      }
      saveAuth(state)
    },
    logout(state) {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      saveAuth(state)
    },
    updateUser(state, action: PayloadAction<UserDto>) {
      state.user = action.payload
      saveAuth(state)
    },
  },
})

export const { setCredentials, setTokens, logout, updateUser } = authSlice.actions

export interface NotificationState {
  items: Array<{
    id: number
    title: string
    message: string
    taskId: number | null
    projectName: string | null
    projectCode: string | null
    isRead: boolean
    readAt: string | null
    createdAt: string
  }>
  unreadCount: number
  loading: boolean
  tasksRefreshToken: number
  projectsRefreshToken: number
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    tasksRefreshToken: 0,
    projectsRefreshToken: 0,
  } as NotificationState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setNotifications(
      state,
      action: PayloadAction<{ items: NotificationState['items']; unreadCount: number }>,
    ) {
      state.items = action.payload.items
      state.unreadCount = action.payload.unreadCount
    },
    addNotification(
      state,
      action: PayloadAction<{
        id: number
        title: string
        message: string
        taskId: number | null
        type?: string
        projectName?: string | null
        projectCode?: string | null
        createdAt: string
      }>,
    ) {
      state.items = [
        {
          id: action.payload.id,
          title: action.payload.title,
          message: action.payload.message,
          taskId: action.payload.taskId,
          projectName: action.payload.projectName ?? null,
          projectCode: action.payload.projectCode ?? null,
          isRead: false,
          readAt: null,
          createdAt: action.payload.createdAt,
        },
        ...state.items,
      ].slice(0, 20)
      state.unreadCount += 1
      const notificationType = action.payload.type ?? 'TaskAssigned'
      if (notificationType === 'ProjectAssigned') {
        state.projectsRefreshToken += 1
      } else if (
        notificationType === 'TaskAssigned' ||
        notificationType === 'TaskStatusUpdated' ||
        action.payload.taskId != null
      ) {
        state.tasksRefreshToken += 1
      }
    },
    markRead(state, action: PayloadAction<{ id: number; readAt: string | null }>) {
      const item = state.items.find((n) => n.id === action.payload.id)
      if (item) {
        const wasUnread = !item.isRead
        item.isRead = true
        item.readAt = action.payload.readAt ?? item.readAt ?? new Date().toISOString()
        if (wasUnread) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      }
    },
    markAllRead(state, action: PayloadAction<string>) {
      const readAt = action.payload
      state.items.forEach((n) => {
        if (!n.isRead) {
          n.isRead = true
          n.readAt = readAt
        }
      })
      state.unreadCount = 0
    },
    removeNotification(state, action: PayloadAction<number>) {
      const item = state.items.find((n) => n.id === action.payload)
      if (item && !item.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
      state.items = state.items.filter((n) => n.id !== action.payload)
    },
    removeAllNotifications(state) {
      state.items = []
      state.unreadCount = 0
    },
    bumpTasksRefresh(state) {
      state.tasksRefreshToken += 1
    },
    bumpProjectsRefresh(state) {
      state.projectsRefreshToken += 1
    },
    clearNotifications(state) {
      state.items = []
      state.unreadCount = 0
      state.tasksRefreshToken = 0
      state.projectsRefreshToken = 0
    },
  },
})

export const {
  setLoading,
  setNotifications,
  addNotification,
  markRead,
  markAllRead,
  removeNotification,
  removeAllNotifications,
  bumpTasksRefresh,
  bumpProjectsRefresh,
  clearNotifications,
} = notificationSlice.actions

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    notifications: notificationSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

configureApiClient(
  () => ({
    accessToken: store.getState().auth.accessToken,
    refreshToken: store.getState().auth.refreshToken,
  }),
  (tokens) => {
    if (!tokens) {
      store.dispatch(logout())
      return
    }
    store.dispatch(setTokens(tokens))
  },
)
