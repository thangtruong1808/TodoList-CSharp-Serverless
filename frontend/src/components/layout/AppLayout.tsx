import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'
import { logout as logoutApi } from '../../api/auth'
import { useSignalR } from '../../hooks/useSignalR'
import {
  ChartIcon,
  ClipboardIcon,
  FolderIcon,
  LogoutIcon,
  ProfileIcon,
  UsersIcon,
} from '../icons/Icons'
import Spinner from '../Spinner'
import { logout, type AppDispatch, type RootState } from '../../store'
import NotificationBell from '../notifications/NotificationBell'

export default function AppLayout() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const refreshToken = useSelector((s: RootState) => s.auth.refreshToken)
  const [loggingOut, setLoggingOut] = useState(false)

  useSignalR()

  async function handleLogout() {
    setLoggingOut(true)
    if (refreshToken) {
      try {
        await logoutApi(refreshToken)
      } catch {
        // ignore
      }
    }
    dispatch(logout())
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ClipboardIcon size={18} />
            </span>
            TodoList
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" className={linkClass} end>
              <ClipboardIcon size={16} />
              Tasks
            </NavLink>
            {(user?.role === 'Admin' || user?.role === 'ProjectManager') && (
              <NavLink to="/projects" className={linkClass}>
                <FolderIcon size={16} />
                Projects
              </NavLink>
            )}
            {user?.role === 'Admin' && (
              <NavLink to="/dashboard" className={linkClass}>
                <ChartIcon size={16} />
                Dashboard
              </NavLink>
            )}
            {user?.role === 'Admin' && (
              <NavLink to="/users" className={linkClass}>
                <UsersIcon size={16} />
                Users
              </NavLink>
            )}
            <NavLink to="/profile" className={linkClass}>
              <ProfileIcon size={16} />
              Profile
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden text-sm text-slate-600 sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70"
            >
              {loggingOut ? (
                <Spinner size="sm" label="Signing out" />
              ) : (
                <LogoutIcon size={16} />
              )}
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
