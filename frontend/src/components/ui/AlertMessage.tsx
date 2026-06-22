import { ExclamationIcon } from '../icons/Icons'

interface AlertMessageProps {
  variant: 'error' | 'success' | 'info'
  message: string
}

const styles = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-amber-200 bg-amber-50 text-amber-900',
}

export default function AlertMessage({ variant, message }: AlertMessageProps) {
  const iconColor =
    variant === 'error' ? 'text-red-500' : variant === 'success' ? 'text-green-600' : 'text-amber-600'

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${styles[variant]}`}
    >
      <span className={iconColor}>
        <ExclamationIcon size={18} />
      </span>
      <p className="flex-1 pt-0.5">{message}</p>
    </div>
  )
}
