import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
  error?: string | null
  hint?: string
}

export function FormField({
  label,
  icon,
  error,
  hint,
  id,
  className = '',
  ...inputProps
}: FormFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const hasError = Boolean(error)

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
        {inputProps.required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          id={fieldId}
          aria-invalid={hasError}
          aria-describedby={
            [hasError ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={`w-full rounded-lg border px-3 py-2.5 text-slate-900 outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70 ${
            icon ? 'pl-10' : ''
          } ${
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
          } ${className}`}
          {...inputProps}
        />
      </div>
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  icon?: ReactNode
  error?: string | null
  children: ReactNode
}

export function FormSelect({
  label,
  icon,
  error,
  id,
  children,
  className = '',
  ...selectProps
}: FormSelectProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const hasError = Boolean(error)

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
        {selectProps.required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <select
          id={fieldId}
          aria-invalid={hasError}
          className={`w-full appearance-none rounded-lg border bg-white px-3 py-2.5 text-slate-900 outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70 ${
            icon ? 'pl-10' : ''
          } ${
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
          } ${className}`}
          {...selectProps}
        >
          {children}
        </select>
      </div>
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
