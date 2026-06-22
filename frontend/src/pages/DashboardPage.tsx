import { useEffect, useState } from 'react'
import { getDashboardStats, type DashboardStats } from '../api/dashboard'
import {
  ChartIcon,
  ClipboardIcon,
  IdentificationIcon,
  UsersIcon,
} from '../components/icons/Icons'
import InlineMessage from '../components/InlineMessage'
import Spinner from '../components/Spinner'
import PageHeader from '../components/ui/PageHeader'

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Pending',
  InProgress: 'In Progress',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

function formatDate(value: string) {
  const normalized = value.trim()
  const date = normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized)
    ? new Date(normalized)
    : new Date(`${normalized}Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Could not load dashboard stats.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Spinner size="lg" label="Loading dashboard" />
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-4xl">
        <InlineMessage variant="error" message={error ?? 'No data'} onDismiss={() => setError(null)} />
      </div>
    )
  }

  const statusCards = [
    { label: 'Pending', value: stats.pendingTasks, color: 'bg-slate-100 text-slate-800', icon: <ClipboardIcon size={18} /> },
    { label: 'In Progress', value: stats.inProgressTasks, color: 'bg-blue-100 text-blue-800', icon: <ChartIcon size={18} /> },
    { label: 'Completed', value: stats.completedTasks, color: 'bg-green-100 text-green-800', icon: <ChartIcon size={18} /> },
    { label: 'Cancelled', value: stats.cancelledTasks, color: 'bg-red-100 text-red-800', icon: <ClipboardIcon size={18} /> },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        icon={<ChartIcon size={24} />}
        title="Admin Dashboard"
        subtitle="Overview of tasks, users, and recent assignments."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <ClipboardIcon size={18} />
            <p className="text-sm">Total tasks</p>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{stats.totalTasks}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <UsersIcon size={18} />
            <p className="text-sm">Total users</p>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{stats.totalUsers}</p>
        </div>
        {statusCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              {card.icon}
              <p className="text-sm">{card.label}</p>
            </div>
            <p className={`inline-flex rounded-full px-3 py-1 text-2xl font-semibold ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <IdentificationIcon size={20} className="text-blue-600" />
          Recent assignments
        </h2>
        {stats.recentAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">No recent assignments.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned to</th>
                  <th className="px-4 py-3">Assigned at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentAssignments.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{task.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {STATUS_LABELS[task.status] ?? task.status}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {task.assignedToUserId ? `User #${task.assignedToUserId}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {task.assignedAt ? formatDate(task.assignedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
