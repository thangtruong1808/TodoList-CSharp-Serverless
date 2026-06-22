import { useEffect, useState } from 'react'
import type { UserDto } from '../api/client'
import {
  assignProjectMember,
  getProjectMembers,
  memberDisplayName,
  removeProjectMember,
  type ProjectMemberItem,
} from '../api/projects'
import { FolderIcon, UserPlusIcon, UsersIcon, XMarkIcon } from './icons/Icons'
import Spinner from './Spinner'

interface ProjectMembersPanelProps {
  projectId: number
  projectLabel: string
  assignableUsers: UserDto[]
  onMembersChanged?: () => void
}

function formatAssignedAt(value: string) {
  const normalized = value.trim()
  const date = normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized)
    ? new Date(normalized)
    : new Date(`${normalized.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function ProjectMembersPanel({
  projectId,
  projectLabel,
  assignableUsers,
  onMembersChanged,
}: ProjectMembersPanelProps) {
  const [members, setMembers] = useState<ProjectMemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [assigning, setAssigning] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getProjectMembers(projectId)
      .then((data) => {
        if (!cancelled) setMembers(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load project members.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const memberIds = new Set(members.map((m) => m.userId))
  const availableUsers = assignableUsers.filter((u) => !memberIds.has(u.id))

  async function handleAssign() {
    if (!selectedUserId) return
    setAssigning(true)
    setError(null)
    try {
      await assignProjectMember(projectId, selectedUserId)
      const data = await getProjectMembers(projectId)
      setMembers(data)
      setSelectedUserId('')
      onMembersChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign user to project.')
    } finally {
      setAssigning(false)
    }
  }

  async function handleRemove(userId: number) {
    setRemovingUserId(userId)
    setError(null)
    try {
      await removeProjectMember(projectId, userId)
      setMembers((current) => current.filter((m) => m.userId !== userId))
      onMembersChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove user from project.')
    } finally {
      setRemovingUserId(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <UsersIcon size={16} className="text-blue-600" />
          Project team
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">
          <FolderIcon size={13} />
          {projectLabel}
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
          <Spinner size="sm" label="Loading project members" />
          Loading members...
        </div>
      ) : (
        <>
          {members.length === 0 ? (
            <p className="mb-3 text-sm text-slate-500">No users assigned to this project yet.</p>
          ) : (
            <ul className="mb-3 space-y-2">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white bg-white px-3 py-2 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {memberDisplayName(member)}
                    </p>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-slate-400 sm:inline">
                      {formatAssignedAt(member.assignedAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(member.userId)}
                      disabled={removingUserId === member.userId}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-70"
                      aria-label={`Remove ${memberDisplayName(member)}`}
                    >
                      {removingUserId === member.userId ? (
                        <Spinner size="sm" label="Removing member" />
                      ) : (
                        <XMarkIcon size={13} />
                      )}
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="project-member-select" className="mb-1 block text-xs font-medium text-slate-600">
                Assign user
              </label>
              <select
                id="project-member-select"
                value={selectedUserId}
                onChange={(e) => {
                  const value = e.target.value
                  setSelectedUserId(value === '' ? '' : Number(value))
                }}
                disabled={assigning || availableUsers.length === 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
              >
                <option value="">
                  {availableUsers.length === 0 ? 'All users already assigned' : 'Select user...'}
                </option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {memberDisplayName(user)} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAssign}
              disabled={assigning || !selectedUserId}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {assigning ? (
                <>
                  <Spinner size="sm" label="Assigning user" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlusIcon size={16} />
                  Assign
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
