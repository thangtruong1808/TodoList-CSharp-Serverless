import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import {
  createProject,
  deleteProject,
  getManagedProjects,
  ownerDisplayName,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  updateProject,
  type ProjectListItem,
  type ProjectStatus,
} from '../api/projects'
import { getAdminUsers, userDisplayName, type UserListItem } from '../api/users'
import InlineMessage from '../components/InlineMessage'
import ProjectDeleteDialog from '../components/ProjectDeleteDialog'
import Spinner from '../components/Spinner'
import TablePagination from '../components/TablePagination'
import PageHeader from '../components/ui/PageHeader'
import {
  ClockIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '../components/icons/Icons'
import type { RootState } from '../store'

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  OnHold: 'bg-amber-100 text-amber-800',
  Completed: 'bg-blue-100 text-blue-700',
  Archived: 'bg-slate-100 text-slate-600',
}

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100'

const actionBtnClass =
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const editBtnClass = `${actionBtnClass} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`
const deleteBtnClass = `${actionBtnClass} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const
const SUCCESS_DISMISS_MS = 4000

type ActionLoading =
  | { type: 'create' }
  | { type: 'edit'; id: number }
  | { type: 'delete'; id: number }
  | null

interface DeleteTarget {
  id: number
  name: string
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(value: string) {
  const normalized = value.trim()
  const date =
    normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized)
      ? new Date(normalized)
      : new Date(`${normalized.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}


export default function ProjectsPage() {
  const currentUser = useSelector((s: RootState) => s.auth.user)
  const isAdmin = currentUser?.role === 'Admin'

  const pageSubtitle = isAdmin
    ? 'Create and manage all company projects.'
    : 'View and manage projects you own, created, or were assigned to manage by an admin.'

  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [owners, setOwners] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState<ProjectStatus>('Active')
  const [formOwnerUserId, setFormOwnerUserId] = useState<number | ''>('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const formRef = useRef<HTMLFormElement>(null)
  const hasLoadedOnce = useRef(false)

  const isEditing = editingId !== null
  const isCreating = actionLoading?.type === 'create'
  const isSavingEdit = actionLoading?.type === 'edit' && editingId !== null
  const isFormSubmitting = isCreating || isSavingEdit
  const isDeleting =
    actionLoading?.type === 'delete' &&
    deleteTarget !== null &&
    actionLoading.id === deleteTarget.id
  const isSearchDebouncing = searchInput.trim() !== searchQuery
  const isFilterLoading = refreshing
  const hasActiveFilters = Boolean(searchQuery || statusFilter)

  const emptyProjectsMessage = hasActiveFilters
    ? 'No projects match your filters.'
    : isAdmin
      ? 'No projects yet. Use Add Project to create one.'
      : 'No projects yet. Create one with Add Project or ask an admin to assign you as owner.'

  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize))

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return projects.slice(start, start + pageSize)
  }, [projects, currentPage, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, 400)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!isAdmin) return
    getAdminUsers()
      .then((users) => {
        setOwners(users.filter((u) => u.role === 'ProjectManager' || u.role === 'Admin'))
      })
      .catch(() => {
        // owner select optional
      })
  }, [isAdmin])

  useEffect(() => {
    loadProjects()
  }, [searchQuery, statusFilter])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(null), SUCCESS_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  async function loadProjects() {
    const isInitial = !hasLoadedOnce.current
    if (isInitial) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)
    try {
      const data = await getManagedProjects({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      })
      setProjects(data)
      hasLoadedOnce.current = true
    } catch {
      setError('Could not load projects.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function resetForm() {
    setEditingId(null)
    setShowAddForm(false)
    setFormName('')
    setFormCode('')
    setFormDescription('')
    setFormStatus('Active')
    setFormOwnerUserId('')
    setFormStartDate('')
    setFormDueDate('')
  }

  function cancelAddForm() {
    setShowAddForm(false)
    setFormName('')
    setFormCode('')
    setFormDescription('')
    setFormStatus('Active')
    setFormOwnerUserId('')
    setFormStartDate('')
    setFormDueDate('')
  }

  function toggleAddForm() {
    if (showAddForm) {
      cancelAddForm()
      return
    }
    if (isEditing) resetForm()
    setShowAddForm(true)
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  function startEdit(project: ProjectListItem) {
    setShowAddForm(false)
    setEditingId(project.id)
    setFormName(project.name)
    setFormCode(project.code ?? '')
    setFormDescription(project.description ?? '')
    setFormStatus(project.status)
    setFormOwnerUserId(project.ownerUserId ?? '')
    setFormStartDate(project.startDate ?? '')
    setFormDueDate(project.dueDate ?? '')
    setError(null)
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  function clearFilters() {
    setSearchInput('')
    setSearchQuery('')
    setStatusFilter('')
    setCurrentPage(1)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const name = formName.trim()
    if (!name) {
      setError('Project name is required.')
      return
    }

    const payload = {
      name,
      code: formCode.trim() || null,
      description: formDescription.trim() || null,
      status: formStatus,
      ownerUserId: formOwnerUserId === '' ? null : formOwnerUserId,
      startDate: formStartDate || null,
      dueDate: formDueDate || null,
    }

    if (isEditing && editingId !== null) {
      try {
        setActionLoading({ type: 'edit', id: editingId })
        setError(null)
        await updateProject(editingId, payload)
        await loadProjects()
        resetForm()
        setSuccessMessage(`Project "${name}" updated successfully.`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update project.')
        setSuccessMessage(null)
      } finally {
        setActionLoading(null)
      }
      return
    }

    try {
      setActionLoading({ type: 'create' })
      setError(null)
      await createProject(payload)
      await loadProjects()
      resetForm()
      setSuccessMessage(`Project "${name}" created successfully.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project.')
      setSuccessMessage(null)
    } finally {
      setActionLoading(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { id, name } = deleteTarget
    try {
      setActionLoading({ type: 'delete', id })
      setError(null)
      await deleteProject(id)
      setProjects((current) => current.filter((p) => p.id !== id))
      if (editingId === id) resetForm()
      setDeleteTarget(null)
      setSuccessMessage(`Project "${name}" deleted successfully.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete project.')
      setSuccessMessage(null)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          icon={<FolderIcon size={24} />}
          title="Project Management"
          subtitle={pageSubtitle}
        />
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 shadow-sm">
          <Spinner size="lg" label="Loading projects" />
          <p className="text-sm font-medium text-slate-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          icon={<FolderIcon size={24} />}
          title="Project Management"
          subtitle={pageSubtitle}
        />
        {!isEditing && (
          <button
            type="button"
            onClick={toggleAddForm}
            disabled={isFormSubmitting}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-70 ${
              showAddForm
                ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            aria-expanded={showAddForm}
          >
            {showAddForm ? (
              <>
                <XMarkIcon size={16} />
                Cancel
              </>
            ) : (
              <>
                <PlusIcon size={16} />
                Add Project
              </>
            )}
          </button>
        )}
      </div>

      {successMessage && (
        <InlineMessage
          variant="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {error && (
        <InlineMessage variant="error" message={error} onDismiss={() => setError(null)} />
      )}

      {(showAddForm || isEditing) && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${
            isEditing
              ? 'border-blue-200 bg-blue-50/30'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {isEditing ? `Editing Project #${editingId}` : 'New Project'}
              </p>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update project details below.'
                  : 'Fill in the details to create a new project.'}
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={cancelAddForm}
                disabled={isFormSubmitting}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-70"
              >
                <XMarkIcon size={14} />
                Close
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-slate-600">
                Project name <span className="text-red-500">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter project name"
                maxLength={200}
                required
                disabled={isFormSubmitting}
                className={selectClass}
              />
            </div>

            <div>
              <label htmlFor="project-code" className="mb-1 block text-sm font-medium text-slate-600">
                Code <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="project-code"
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. TL-WEB"
                maxLength={50}
                disabled={isFormSubmitting}
                className={selectClass}
              />
            </div>

            <div>
              <label htmlFor="project-status" className="mb-1 block text-sm font-medium text-slate-600">
                Status
              </label>
              <select
                id="project-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                disabled={isFormSubmitting}
                className={`${selectClass} ${isSavingEdit ? 'border-blue-200 bg-blue-50/40' : ''}`}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <div className="md:col-span-2">
                <label htmlFor="project-owner" className="mb-1 block text-sm font-medium text-slate-600">
                  Owner <span className="text-slate-400">(PM or Admin)</span>
                </label>
                <select
                  id="project-owner"
                  value={formOwnerUserId}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormOwnerUserId(value === '' ? '' : Number(value))
                  }}
                  disabled={isFormSubmitting}
                  className={selectClass}
                >
                  <option value="">No owner</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {userDisplayName(owner)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="project-start" className="mb-1 block text-sm font-medium text-slate-600">
                Start date
              </label>
              <input
                id="project-start"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                disabled={isFormSubmitting}
                className={selectClass}
              />
            </div>

            <div>
              <label htmlFor="project-due" className="mb-1 block text-sm font-medium text-slate-600">
                Due date
              </label>
              <input
                id="project-due"
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                disabled={isFormSubmitting}
                className={selectClass}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="project-description"
                className="mb-1 block text-sm font-medium text-slate-600"
              >
                Description <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                id="project-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Project description..."
                rows={3}
                disabled={isFormSubmitting}
                className={selectClass}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isFormSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isFormSubmitting && (
                <Spinner
                  size="sm"
                  label={isEditing ? 'Saving project' : 'Creating project'}
                />
              )}
              {isEditing ? 'Save Changes' : 'Create Project'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isFormSubmitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-70"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <section
          className="relative mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
          aria-label="Project filters"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Filters</h2>
            <div className="flex flex-wrap items-center gap-2">
              {(isSearchDebouncing || isFilterLoading) && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                  <Spinner size="sm" label="Applying filters" />
                  {isSearchDebouncing ? 'Searching...' : 'Updating...'}
                </span>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={isFilterLoading}
                  className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-60"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="project-search" className="mb-1 block text-sm font-medium text-slate-600">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="project-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search by name, code, description..."
                  className={`w-full rounded-lg border border-slate-300 py-2 pl-9 pr-10 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${isSearchDebouncing ? 'border-blue-200 bg-blue-50/30' : 'bg-white'}`}
                />
                {isSearchDebouncing && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" label="Searching projects" />
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="project-status-filter" className="mb-1 block text-sm font-medium text-slate-600">
                Status
              </label>
              <select
                id="project-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ProjectStatus | '')
                  setCurrentPage(1)
                }}
                disabled={isFilterLoading}
                className={`${selectClass} ${isFilterLoading ? 'border-blue-200 bg-blue-50/30' : ''}`}
              >
                <option value="">All statuses</option>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <p className="mb-4 text-sm text-slate-500">
          {projects.length} project{projects.length === 1 ? '' : 's'}
        </p>

        <div className="relative">
          {isFilterLoading && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-white/60 pt-8 backdrop-blur-[1px]"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm">
                <Spinner size="sm" label="Refreshing projects" />
                Updating projects...
              </span>
            </div>
          )}

          <div className="space-y-3 md:hidden">
            {projects.length === 0 ? (
              <p className="rounded-xl border border-slate-200 px-4 py-10 text-center text-slate-500">
                {emptyProjectsMessage}
              </p>
            ) : (
              paginatedProjects.map((project) => {
                const isRowEditing = actionLoading?.type === 'edit' && actionLoading.id === project.id
                const isRowDeleting = actionLoading?.type === 'delete' && actionLoading.id === project.id
                const isSelected = editingId === project.id
                return (
                  <article
                    key={project.id}
                    className={`rounded-xl border p-4 transition-colors ${isSelected ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-slate-50/40'}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{project.name}</p>
                        {project.code && (
                          <p className="text-xs font-medium text-slate-500">{project.code}</p>
                        )}
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    {project.description && (
                      <p className="mb-2 line-clamp-2 text-sm text-slate-600">{project.description}</p>
                    )}
                    <p className="text-xs text-slate-500">Owner: {ownerDisplayName(project)}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                      <ClockIcon size={12} />
                      Updated {formatDateTime(project.updatedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(project)}
                        disabled={isRowDeleting || isRowEditing || isFormSubmitting}
                        className={editBtnClass}
                      >
                        {isRowEditing && <Spinner size="sm" label="Saving project" />}
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                        disabled={isRowDeleting || isFormSubmitting}
                        className={deleteBtnClass}
                      >
                        {isRowDeleting && <Spinner size="sm" label="Deleting project" />}
                        Delete
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      {emptyProjectsMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((project) => {
                    const isRowEditing =
                      actionLoading?.type === 'edit' && actionLoading.id === project.id
                    const isRowDeleting =
                      actionLoading?.type === 'delete' && actionLoading.id === project.id
                    const isSelected = editingId === project.id
                    return (
                      <tr
                        key={project.id}
                        className={`transition-colors hover:bg-slate-50/80 ${isSelected ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <span className="block font-medium text-slate-900">{project.name}</span>
                          {project.description && (
                            <span className="mt-0.5 block max-w-xs truncate text-xs text-slate-500">
                              {project.description}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{project.code || '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{ownerDisplayName(project)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <span className="block">{formatDate(project.startDate)}</span>
                          <span className="block text-slate-400">→ {formatDate(project.dueDate)}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDateTime(project.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(project)}
                              disabled={isRowDeleting || isRowEditing || isFormSubmitting}
                              aria-busy={isRowEditing}
                              className={editBtnClass}
                            >
                              {isRowEditing && <Spinner size="sm" label="Saving project" />}
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({ id: project.id, name: project.name })
                              }
                              disabled={isRowDeleting || isFormSubmitting}
                              aria-busy={isRowDeleting}
                              className={deleteBtnClass}
                            >
                              {isRowDeleting && <Spinner size="sm" label="Deleting project" />}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {projects.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={projects.length}
              pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              disabled={isFilterLoading}
            />
          )}
        </div>
      </div>

      <ProjectDeleteDialog
        open={deleteTarget !== null}
        projectName={deleteTarget?.name ?? ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  )
}
