import { type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import TodoList from './components/TodoList'
import AdminRoute from './components/layout/AdminRoute'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 px-4 py-10 sm:py-14">
      {children}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthShell>
              <LoginPage />
            </AuthShell>
          }
        />
        <Route
          path="/register"
          element={
            <AuthShell>
              <RegisterPage />
            </AuthShell>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthShell>
              <ForgotPasswordPage />
            </AuthShell>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AuthShell>
              <ResetPasswordPage />
            </AuthShell>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<TodoList />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route element={<AdminRoute />}>
              <Route path="dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
