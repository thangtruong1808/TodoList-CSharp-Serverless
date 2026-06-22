import type { ReactNode } from 'react'
import type { UserRole } from '../../api/client'
import { ShieldIcon, UserIcon } from '../icons/Icons'

interface RoleSelectorProps {
  value: UserRole
  onChange: (role: UserRole) => void
  disabled?: boolean
  error?: string | null
}

const options: Array<{
  value: UserRole
  label: string
  description: string
  icon: ReactNode
}> = [
  {
    value: 'User',
    label: 'User',
    description: 'View and manage assigned tasks',
    icon: <UserIcon size={22} />,
  },
  {
    value: 'Admin',
    label: 'Admin',
    description: 'Full access, dashboard & task assignment',
    icon: <ShieldIcon size={22} />,
  },
]

export default function RoleSelector({ value, onChange, disabled, error }: RoleSelectorProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 block text-sm font-medium text-slate-700">
        Account role <span className="text-red-500">*</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <label
              key={option.value}
              className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className={`mb-2 ${selected ? 'text-blue-600' : 'text-slate-500'}`}>
                {option.icon}
              </span>
              <span className="font-semibold text-slate-900">{option.label}</span>
              <span className="mt-1 text-xs leading-relaxed text-slate-600">
                {option.description}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  )
}
