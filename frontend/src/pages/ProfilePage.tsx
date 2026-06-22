import { useEffect, useState, type FormEvent } from 'react'
import { useDispatch } from 'react-redux'
import { changePassword, getProfile, updateProfile } from '../api/users'
import {
  EmailIcon,
  LockIcon,
  PhoneIcon,
  ProfileIcon,
  UserIcon,
} from '../components/icons/Icons'
import InlineMessage from '../components/InlineMessage'
import Spinner from '../components/Spinner'
import { FormField } from '../components/ui/FormField'
import PageHeader from '../components/ui/PageHeader'
import SubmitButton from '../components/ui/SubmitButton'
import { updateUser, type AppDispatch } from '../store'

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then((p) => {
        setFirstName(p.firstName)
        setLastName(p.lastName)
        setPhone(p.phone ?? '')
        setEmail(p.email)
        dispatch(updateUser(p))
      })
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false))
  }, [dispatch])

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateProfile({ firstName, lastName, phone: phone || null })
      const p = await getProfile()
      dispatch(updateUser(p))
      setSuccess('Profile updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.')
      return
    }
    setPwdError(null)
    setPwdSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Password changed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed')
    } finally {
      setPwdSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Spinner size="lg" label="Loading profile" />
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        icon={<ProfileIcon size={24} />}
        title="Profile"
        subtitle="Manage your personal information and account security."
      />

      {success && <InlineMessage variant="success" message={success} onDismiss={() => setSuccess(null)} />}
      {error && <InlineMessage variant="error" message={error} onDismiss={() => setError(null)} />}

      <form
        onSubmit={handleProfileSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="flex items-center gap-2 font-medium text-slate-900">
          <UserIcon size={18} className="text-blue-600" />
          Personal information
        </h2>
        <FormField
          label="Email"
          type="email"
          icon={<EmailIcon size={18} />}
          value={email}
          disabled
          className="bg-slate-50 text-slate-500"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            icon={<UserIcon size={18} />}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={saving}
          />
          <FormField
            label="Last name"
            icon={<UserIcon size={18} />}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={saving}
          />
        </div>
        <FormField
          label="Phone"
          type="tel"
          icon={<PhoneIcon size={18} />}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Optional"
          disabled={saving}
        />
        <div className="pt-1">
          <SubmitButton loading={saving} loadingLabel="Saving profile..." icon={<UserIcon size={18} />}>
            Save profile
          </SubmitButton>
        </div>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="flex items-center gap-2 font-medium text-slate-900">
          <LockIcon size={18} className="text-blue-600" />
          Change password
        </h2>
        <FormField
          label="Current password"
          type="password"
          icon={<LockIcon size={18} />}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={pwdSaving}
          autoComplete="current-password"
        />
        <FormField
          label="New password"
          type="password"
          icon={<LockIcon size={18} />}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value)
            setPwdError(null)
          }}
          required
          minLength={8}
          disabled={pwdSaving}
          autoComplete="new-password"
        />
        <FormField
          label="Confirm new password"
          type="password"
          icon={<LockIcon size={18} />}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            setPwdError(null)
          }}
          required
          disabled={pwdSaving}
          error={pwdError}
          autoComplete="new-password"
        />
        <div className="pt-1">
          <SubmitButton
            loading={pwdSaving}
            loadingLabel="Changing password..."
            icon={<LockIcon size={18} />}
          >
            Change password
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
