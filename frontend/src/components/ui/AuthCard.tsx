import type { ReactNode } from 'react'

interface AuthCardProps {
  icon: ReactNode
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export default function AuthCard({
  icon,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: AuthCardProps) {
  return (
    <div className={`mx-auto w-full ${wide ? 'max-w-lg' : 'max-w-md'}`}>
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25">
          {icon}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-sm text-sm text-slate-600">{subtitle}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>

      {footer && <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>}
    </div>
  )
}
