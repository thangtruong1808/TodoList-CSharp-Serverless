import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  KeyIcon,
  LockIcon,
} from '../components/icons/Icons'
import AlertMessage from '../components/ui/AlertMessage'
import AuthCard from '../components/ui/AuthCard'
import { FormField } from '../components/ui/FormField'
import SubmitButton from '../components/ui/SubmitButton'
import Spinner from '../components/Spinner'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setFieldError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match.')
      return
    }
    setFieldError(null)
    setLoading(true)
    setError(null)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
      window.setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      icon={<LockIcon size={28} />}
      title="Reset password"
      subtitle="Enter your reset token and choose a new password."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-1.5 font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          <ArrowLeftIcon size={16} />
          Back to sign in
        </Link>
      }
    >
      {success ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="text-green-600">
            <CheckCircleIcon size={40} />
          </span>
          <p className="text-sm font-medium text-green-700">Password updated successfully.</p>
          <p className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Spinner size="sm" label="Redirecting" />
            Redirecting to sign in...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Reset token"
            icon={<KeyIcon size={18} />}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your reset token"
            required
            disabled={loading}
          />
          <FormField
            label="New password"
            type="password"
            icon={<LockIcon size={18} />}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setFieldError(null)
            }}
            placeholder="Min. 8 characters"
            required
            minLength={8}
            disabled={loading}
            autoComplete="new-password"
          />
          <FormField
            label="Confirm password"
            type="password"
            icon={<LockIcon size={18} />}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setFieldError(null)
            }}
            placeholder="Re-enter new password"
            required
            disabled={loading}
            error={fieldError}
            autoComplete="new-password"
          />
          {error && <AlertMessage variant="error" message={error} />}
          <SubmitButton loading={loading} loadingLabel="Resetting..." icon={<LockIcon size={18} />}>
            Reset password
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  )
}
