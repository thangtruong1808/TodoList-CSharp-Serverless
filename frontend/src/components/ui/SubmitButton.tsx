import type { ReactNode } from 'react'
import Spinner from '../Spinner'

interface SubmitButtonProps {
  loading: boolean
  loadingLabel: string
  children: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export default function SubmitButton({
  loading,
  loadingLabel,
  children,
  icon,
  disabled = false,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <>
          <Spinner size="sm" label={loadingLabel} />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}
