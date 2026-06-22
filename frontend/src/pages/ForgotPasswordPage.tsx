import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import { ArrowLeftIcon, EmailIcon, KeyIcon } from '../components/icons/Icons'
import AlertMessage from '../components/ui/AlertMessage'
import AuthCard from '../components/ui/AuthCard'
import { FormField } from '../components/ui/FormField'
import SubmitButton from '../components/ui/SubmitButton'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ message: string; resetToken?: string; resetUrl?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await forgotPassword(email)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      icon={<KeyIcon size={28} />}
      title="Forgot password"
      subtitle="Enter your email and we'll provide a reset token (dev mode)."
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Email"
          type="email"
          icon={<EmailIcon size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={loading}
          autoComplete="email"
        />
        {error && <AlertMessage variant="error" message={error} />}
        {result && (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">{result.message}</p>
            {result.resetToken && (
              <p className="break-all rounded-md bg-white/70 px-2 py-1.5 font-mono text-xs">
                {result.resetToken}
              </p>
            )}
            {result.resetUrl && (
              <Link
                to={result.resetUrl}
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
              >
                <KeyIcon size={16} />
                Open reset page
              </Link>
            )}
          </div>
        )}
        <SubmitButton loading={loading} loadingLabel="Sending..." icon={<EmailIcon size={18} />}>
          Send reset link
        </SubmitButton>
      </form>
    </AuthCard>
  )
}
