import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { register } from '../api/auth'
import type { UserRole } from '../api/client'
import {
  EmailIcon,
  LockIcon,
  PhoneIcon,
  UserIcon,
  UserPlusIcon,
} from '../components/icons/Icons'
import AlertMessage from '../components/ui/AlertMessage'
import AuthCard from '../components/ui/AuthCard'
import { FormField } from '../components/ui/FormField'
import RoleSelector from '../components/ui/RoleSelector'
import SubmitButton from '../components/ui/SubmitButton'
import { setCredentials, type AppDispatch } from '../store'

export default function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'User' as UserRole,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validateForm() {
    const errors: Record<string, string> = {}
    if (!form.firstName.trim()) errors.firstName = 'First name is required.'
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.'
    if (!form.email.trim()) errors.email = 'Email is required.'
    if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    try {
      const data = await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || null,
        role: form.role,
      })
      dispatch(setCredentials(data))
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      wide
      icon={<UserPlusIcon size={28} />}
      title="Create account"
      subtitle="Join TodoList — choose a role to explore the full portfolio demo."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            icon={<UserIcon size={18} />}
            value={form.firstName}
            onChange={(e) => {
              setForm({ ...form, firstName: e.target.value })
              setFieldErrors((c) => ({ ...c, firstName: '' }))
            }}
            placeholder="John"
            required
            disabled={loading}
            error={fieldErrors.firstName}
            autoComplete="given-name"
          />
          <FormField
            label="Last name"
            icon={<UserIcon size={18} />}
            value={form.lastName}
            onChange={(e) => {
              setForm({ ...form, lastName: e.target.value })
              setFieldErrors((c) => ({ ...c, lastName: '' }))
            }}
            placeholder="Doe"
            required
            disabled={loading}
            error={fieldErrors.lastName}
            autoComplete="family-name"
          />
        </div>

        <FormField
          label="Email"
          type="email"
          icon={<EmailIcon size={18} />}
          value={form.email}
          onChange={(e) => {
            setForm({ ...form, email: e.target.value })
            setFieldErrors((c) => ({ ...c, email: '' }))
          }}
          placeholder="you@example.com"
          required
          disabled={loading}
          error={fieldErrors.email}
          autoComplete="email"
        />

        <FormField
          label="Phone"
          type="tel"
          icon={<PhoneIcon size={18} />}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Optional"
          disabled={loading}
          autoComplete="tel"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Password"
            type="password"
            icon={<LockIcon size={18} />}
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value })
              setFieldErrors((c) => ({ ...c, password: '' }))
            }}
            placeholder="Min. 8 characters"
            required
            minLength={8}
            disabled={loading}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <FormField
            label="Confirm password"
            type="password"
            icon={<LockIcon size={18} />}
            value={form.confirmPassword}
            onChange={(e) => {
              setForm({ ...form, confirmPassword: e.target.value })
              setFieldErrors((c) => ({ ...c, confirmPassword: '' }))
            }}
            placeholder="Re-enter password"
            required
            disabled={loading}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />
        </div>

        <RoleSelector
          value={form.role}
          onChange={(role) => setForm({ ...form, role })}
          disabled={loading}
        />

        {error && <AlertMessage variant="error" message={error} />}

        <SubmitButton
          loading={loading}
          loadingLabel="Creating account..."
          icon={<UserPlusIcon size={18} />}
        >
          Create account
        </SubmitButton>
      </form>
    </AuthCard>
  )
}
