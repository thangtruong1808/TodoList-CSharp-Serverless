import { Fragment, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  deleteAllNotifications,
  deleteNotification,
  formatProjectLabel,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotification,
} from '../../api/notifications'
import { BellIcon, CheckCircleIcon, ClockIcon, FolderIcon, XMarkIcon } from '../icons/Icons'
import Spinner from '../Spinner'
import {
  markAllRead,
  markRead,
  removeAllNotifications,
  removeNotification,
  setLoading,
  setNotifications,
  type AppDispatch,
  type RootState,
} from '../../store'

function parseApiDate(value: string) {
  const normalized = value.trim()
  if (normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized)
  }
  return new Date(`${normalized.replace(' ', 'T')}Z`)
}

function formatDate(value: string) {
  const date = parseApiDate(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function toStoreItem(n: ReturnType<typeof normalizeNotification>) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    taskId: n.taskId,
    projectName: n.projectName,
    projectCode: n.projectCode,
    isRead: n.isRead,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }
}

export default function NotificationBell() {
  const dispatch = useDispatch<AppDispatch>()
  const { items, unreadCount, loading } = useSelector(
    (s: RootState) => s.notifications,
  )
  const [open, setOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isRefreshing = loading && items.length > 0
  const isActionBusy = markingAll || deletingAll || isRefreshing

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function refresh() {
    dispatch(setLoading(true))
    try {
      const data = await getNotifications()
      dispatch(
        setNotifications({
          items: data.items.map(toStoreItem),
          unreadCount: data.unreadCount,
        }),
      )
    } finally {
      dispatch(setLoading(false))
    }
  }

  async function handleMarkRead(id: number) {
    setMarkingId(id)
    try {
      const updated = await markNotificationRead(id)
      dispatch(
        markRead({
          id: updated.id,
          readAt: updated.readAt ?? new Date().toISOString(),
        }),
      )
    } finally {
      setMarkingId(null)
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
      dispatch(markAllRead(new Date().toISOString()))
      await refresh()
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteNotification(id)
      dispatch(removeNotification(id))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true)
    try {
      await deleteAllNotifications()
      dispatch(removeAllNotifications())
      setConfirmDeleteAll(false)
    } finally {
      setDeletingAll(false)
    }
  }

  async function handleToggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (!willOpen) {
      setConfirmDeleteAll(false)
      return
    }
    setOpening(true)
    try {
      await refresh()
    } finally {
      setOpening(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={opening}
        className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-80"
        aria-label="Notifications"
        aria-expanded={open}
        aria-busy={opening}
      >
        {opening && <Spinner size="sm" label="Opening notifications" />}
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg sm:w-80">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              {isRefreshing ? (
                <Spinner size="sm" label="Refreshing notifications" />
              ) : (
                <BellIcon size={16} className="text-blue-600" />
              )}
              Notifications
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isActionBusy || markingAll}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-70"
                >
                  {markingAll && <Spinner size="sm" label="Marking all read" />}
                  Mark all read
                </button>
              )}
              {items.length > 0 &&
                (confirmDeleteAll ? (
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                    <span className="text-xs text-slate-600">Delete all?</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAll(false)}
                        disabled={deletingAll}
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-70"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAll}
                        disabled={deletingAll || isRefreshing}
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-70"
                      >
                        {deletingAll && <Spinner size="sm" label="Deleting all notifications" />}
                        Delete all
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(true)}
                    disabled={isActionBusy || deletingId !== null}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-70"
                  >
                    Delete all
                  </button>
                ))}
            </div>
          </div>

          <div className="relative max-h-72 overflow-y-auto">
            {isRefreshing && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center bg-white/70 py-2"
                aria-hidden="true"
              >
                <Spinner size="sm" label="Updating notifications" />
              </div>
            )}

            <ul>
              {loading && items.length === 0 ? (
                <li className="flex flex-col items-center gap-2 px-3 py-8">
                  <Spinner size="md" label="Loading notifications" />
                  <span className="text-sm text-slate-500">Loading notifications...</span>
                </li>
              ) : items.length === 0 ? (
                <li className="flex flex-col items-center gap-2 px-3 py-8 text-sm text-slate-500">
                  <BellIcon size={28} className="text-slate-300" />
                  No notifications
                </li>
              ) : (
                items.map((n, index) => (
                  <Fragment key={n.id}>
                    {index > 0 && (
                      <li aria-hidden="true" className="list-none px-3">
                        <hr className="border-0 border-t border-slate-200" />
                      </li>
                    )}
                    <li
                      className={`relative px-3 py-3 pr-10 text-sm transition-colors ${n.isRead ? 'bg-white' : 'bg-blue-50/50'} ${deletingId === n.id ? 'opacity-70' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        disabled={
                          deletingId === n.id ||
                          isActionBusy ||
                          markingId === n.id
                        }
                        aria-label="Delete notification"
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {deletingId === n.id ? (
                          <Spinner size="sm" label="Deleting notification" />
                        ) : (
                          <XMarkIcon size={14} />
                        )}
                      </button>

                      <p className="mb-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        <FolderIcon size={12} className="shrink-0 text-blue-600" />
                        <span className="truncate">
                          {formatProjectLabel(n.projectName, n.projectCode)}
                        </span>
                      </p>

                      <p className="font-medium text-slate-900">{n.title}</p>
                      <p className="mt-0.5 text-slate-600">{n.message}</p>

                      <div className="mt-2 space-y-1">
                        <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                          <ClockIcon size={13} />
                          Received {formatDate(n.createdAt)}
                        </p>

                        {n.isRead && (
                          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <CheckCircleIcon size={13} />
                            Read {formatDate(n.readAt ?? n.createdAt)}
                          </p>
                        )}
                      </div>

                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          disabled={
                            markingId === n.id ||
                            isActionBusy ||
                            deletingId === n.id
                          }
                          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-70"
                        >
                          {markingId === n.id ? (
                            <>
                              <Spinner size="sm" label="Marking read" />
                              Marking read...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon size={13} />
                              Mark read
                            </>
                          )}
                        </button>
                      )}
                    </li>
                  </Fragment>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

