type SpinnerSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

interface SpinnerProps {
  size?: SpinnerSize
  label?: string
  className?: string
}

export default function Spinner({
  size = 'md',
  label = 'Loading',
  className = '',
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <span
        className={`animate-spin rounded-full border-slate-300 border-t-blue-600 ${sizeClasses[size]}`}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
