import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store'

export default function PmAdminRoute() {
  const user = useSelector((s: RootState) => s.auth.user)
  if (user?.role !== 'Admin' && user?.role !== 'ProjectManager') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
