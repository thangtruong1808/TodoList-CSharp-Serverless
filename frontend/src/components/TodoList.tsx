import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import {
  assignTodo,
  createTodo,
  deleteTodo,
  getTodos,
  TASK_STATUSES,
  updateTodo,
  updateTodoStatus,
  type TaskItem,
  type TaskStatus,
} from '../api/todos'
import { getAssignableUsers } from '../api/users'
import { getProjects, getProjectAssignableUsers, type ProjectItem } from '../api/projects'
import type { UserDto } from '../api/client'
import type { RootState } from '../store'
import DeleteDialog from './DeleteDialog'
import { CharacterCount, FieldError, fieldErrorClass } from './FormFieldHelpers'
import InlineMessage from './InlineMessage'
import ProjectMembersPanel from './ProjectMembersPanel'
import Spinner from './Spinner'
import TablePagination from './TablePagination'
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from './icons/Icons'
import {
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_NAME_MAX_LENGTH,
  hasFormErrors,
  validateTaskDescription,
  validateTaskForm,
  validateTaskName,
  type TaskFormErrors,
} from '../utils/taskValidation'

const STATUS_LABELS: Record<TaskStatus, string> = {
  Pending: 'Pending',
  InProgress: 'In Progress',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  Pending: 'bg-slate-100 text-slate-700',
  InProgress: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
}

type ActionLoading =
  | { type: 'create' }
  | { type: 'edit'; id: number }
  | { type: 'delete'; id: number }
  | { type: 'assign'; id: number }
  | null

interface DeleteTarget {
  id: number
  name: string
}

const selectClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

const actionBtnClass =
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const editActionBtnClass = `${actionBtnClass} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`

const deleteActionBtnClass = `${actionBtnClass} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`

const SUCCESS_DISMISS_MS = 4000
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const

const STATUS_ORDER: Record<TaskStatus, number> = {
  Pending: 0,
  InProgress: 1,
  Completed: 2,
  Cancelled: 3,
}

type SortKey = 'id' | 'name' | 'description' | 'status' | 'createdAt' | 'updatedAt'
type SortDirection = 'asc' | 'desc'

interface SortState {
  key: SortKey
  direction: SortDirection
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function parseApiDate(value: string): Date {
  const normalized = value.trim()

  if (
    normalized.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(normalized)
  ) {
    return new Date(normalized)
  }

  // API stores UTC but may serialize without a timezone suffix.
  return new Date(`${normalized}Z`)
}

function formatDate(value: string) {
  const date = parseApiDate(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean
  direction: SortDirection
}) {
  return (
    <span
      className={`inline-flex flex-col leading-none ${active ? 'text-blue-600' : 'text-slate-400'}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 8 5"
        className={`h-2 w-2 ${active && direction === 'asc' ? 'opacity-100' : 'opacity-40'}`}
      >
        <path d="M4 0 7.5 4.5H0.5L4 0z" fill="currentColor" />
      </svg>
      <svg
        viewBox="0 0 8 5"
        className={`-mt-0.5 h-2 w-2 ${active && direction === 'desc' ? 'opacity-100' : 'opacity-40'}`}
      >
        <path d="M4 5 0.5 0.5h7L4 5z" fill="currentColor" />
      </svg>
    </span>
  )
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
}: {
  label: string
  sortKey: SortKey
  currentSort: SortState
  onSort: (key: SortKey) => void
  className?: string
}) {
  const isActive = currentSort.key === sortKey

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-left transition-colors hover:text-slate-900"
        aria-label={`Sort by ${label}`}
        aria-sort={
          isActive
            ? currentSort.direction === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
        }
      >
        <span>{label}</span>
        <SortIndicator active={isActive} direction={currentSort.direction} />
      </button>
    </th>
  )
}

function compareTasks(a: TaskItem, b: TaskItem, sortState: SortState): number {
  let comparison = 0

  switch (sortState.key) {
    case 'id':
      comparison = a.id - b.id
      break
    case 'name':
      comparison = a.name.localeCompare(b.name, undefined, {
        sensitivity: 'base',
      })
      break
    case 'description':
      comparison = (a.description ?? '').localeCompare(b.description ?? '', undefined, {
        sensitivity: 'base',
      })
      break
    case 'status':
      comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      break
    case 'createdAt':
      comparison =
        parseApiDate(a.createdAt).getTime() - parseApiDate(b.createdAt).getTime()
      break
    case 'updatedAt':
      comparison =
        parseApiDate(a.updatedAt).getTime() - parseApiDate(b.updatedAt).getTime()
      break
  }

  return sortState.direction === 'asc' ? comparison : -comparison
}

export default function TodoList() {
  const user = useSelector((s: RootState) => s.auth.user)
  const tasksRefreshToken = useSelector((s: RootState) => s.notifications.tasksRefreshToken)
  const projectsRefreshToken = useSelector((s: RootState) => s.notifications.projectsRefreshToken)
  const isAdmin = user?.role === 'Admin'
  const isProjectManager = user?.role === 'ProjectManager'
  const canEditTaskDetails = isAdmin || isProjectManager
  const canCreateTask = isAdmin || isProjectManager
  const canDeleteTask = isAdmin || isProjectManager
  const canAssign = isProjectManager

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('')
  const [projectFilter, setProjectFilter] = useState<number | ''>('')
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [newTaskProjectId, setNewTaskProjectId] = useState<number | ''>('')
  const [assignableUsers, setAssignableUsers] = useState<UserDto[]>([])
  const [projectAssignableUsers, setProjectAssignableUsers] = useState<Record<number, UserDto[]>>({})
  const [assignableLoadingByProject, setAssignableLoadingByProject] = useState<Record<number, boolean>>({})
  const assignableLoadStarted = useRef(new Set<number>())
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<TaskFormErrors>({})
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [sortState, setSortState] = useState<SortState>({
    key: 'updatedAt',
    direction: 'desc',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const taskFormRef = useRef<HTMLFormElement>(null)
  const taskQueryRef = useRef({
    searchQuery: '',
    statusFilter: '' as TaskStatus | '',
    projectFilter: '' as number | '',
  })

  taskQueryRef.current = { searchQuery, statusFilter, projectFilter }

  const isEditing = editingId !== null
  const isNameDescriptionReadOnly = isEditing && !canEditTaskDetails
  const isCreating = actionLoading?.type === 'create'
  const isSavingEdit =
    actionLoading?.type === 'edit' && editingId !== null
  const isFormSubmitting = isCreating || isSavingEdit
  const isDeleting =
    actionLoading?.type === 'delete' &&
    deleteTarget !== null &&
    actionLoading.id === deleteTarget.id
  const isSearchDebouncing = searchInput.trim() !== searchQuery
  const isFilterLoading = loading && tasks.length > 0
  const hasActiveFilters = Boolean(searchQuery || statusFilter || projectFilter)

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => compareTasks(a, b, sortState))
  }, [tasks, sortState])

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize))

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedTasks.slice(start, start + pageSize)
  }, [sortedTasks, currentPage, pageSize])

  const selectedProject = useMemo(
    () => (projectFilter === '' ? null : projects.find((p) => p.id === projectFilter) ?? null),
    [projectFilter, projects],
  )

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
    loadTasks()
  }, [searchQuery, statusFilter, projectFilter])

  useEffect(() => {
    if (tasksRefreshToken === 0) return

    let cancelled = false

    async function refreshTasksFromNotification() {
      const query = taskQueryRef.current
      setRefreshing(true)
      try {
        const data = await getTodos({
          search: query.searchQuery || undefined,
          status: query.statusFilter || undefined,
          projectId: query.projectFilter || undefined,
        })
        if (!cancelled) {
          setTasks(data)
        }
      } catch {
        // Keep existing table data if background refresh fails.
      } finally {
        if (!cancelled) {
          setRefreshing(false)
        }
      }
    }

    void refreshTasksFromNotification()

    return () => {
      cancelled = true
    }
  }, [tasksRefreshToken])

  useEffect(() => {
    if (projectsRefreshToken === 0) return

    let cancelled = false

    async function refreshProjectsFromNotification() {
      setProjectsLoading(true)
      try {
        const data = await getProjects()
        if (!cancelled) {
          setProjects(data)
        }
      } catch {
        // Keep existing project list if background refresh fails.
      } finally {
        if (!cancelled) {
          setProjectsLoading(false)
        }
      }
    }

    void refreshProjectsFromNotification()

    return () => {
      cancelled = true
    }
  }, [projectsRefreshToken])

  useEffect(() => {
    setProjectsLoading(true)
    getProjects()
      .then((data) => {
        setProjects(data)
        if (data.length > 0 && newTaskProjectId === '') {
          setNewTaskProjectId(data[0].id)
        }
      })
      .catch(() => {
        // project filter optional if fetch fails
      })
      .finally(() => setProjectsLoading(false))
  }, [])

  const canManageProjectTeam = isAdmin || isProjectManager

  useEffect(() => {
    if (!canManageProjectTeam) return
    getAssignableUsers()
      .then(setAssignableUsers)
      .catch(() => {
        // assign UI optional if fetch fails
      })
  }, [canManageProjectTeam])

  useEffect(() => {
    if (!isProjectManager) {
      assignableLoadStarted.current.clear()
      setProjectAssignableUsers({})
      setAssignableLoadingByProject({})
      return
    }

    if (projects.length === 0) {
      return
    }

    projects.forEach((project) => {
      void ensureAssignableLoaded(project.id)
    })
  }, [isProjectManager, projects])

  useEffect(() => {
    if (!isProjectManager || tasks.length === 0) {
      return
    }

    const projectIds = new Set(tasks.map((task) => Number(task.projectId)))
    if (projectFilter !== '') {
      projectIds.add(Number(projectFilter))
    }

    projectIds.forEach((projectId) => {
      void ensureAssignableLoaded(projectId)
    })
  }, [isProjectManager, tasks, projectFilter])

  async function ensureAssignableLoaded(projectId: number) {
    const id = Number(projectId)
    if (!Number.isFinite(id) || id <= 0 || assignableLoadStarted.current.has(id)) {
      return
    }

    assignableLoadStarted.current.add(id)
    setAssignableLoadingByProject((current) => ({ ...current, [id]: true }))

    try {
      const users = await getProjectAssignableUsers(id)
      setProjectAssignableUsers((current) => ({ ...current, [id]: users }))
    } catch {
      setProjectAssignableUsers((current) => ({ ...current, [id]: [] }))
    } finally {
      setAssignableLoadingByProject((current) => ({ ...current, [id]: false }))
    }
  }

  function refreshAssignableForProject(projectId: number) {
    const id = Number(projectId)
    if (!Number.isFinite(id) || id <= 0) {
      return
    }
    assignableLoadStarted.current.delete(id)
    void ensureAssignableLoaded(id)
  }

  useEffect(() => {
    if (!successMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null)
    }, SUCCESS_DISMISS_MS)

    return () => window.clearTimeout(timer)
  }, [successMessage])

  function resetTaskForm() {
    setEditingId(null)
    setShowAddForm(false)
    setNewTaskName('')
    setNewTaskDescription('')
    setNewTaskStatus('')
    setNewTaskProjectId(projects[0]?.id ?? '')
    setFormErrors({})
  }

  function cancelAddForm() {
    setShowAddForm(false)
    setNewTaskName('')
    setNewTaskDescription('')
    setNewTaskStatus('')
    setNewTaskProjectId(projects[0]?.id ?? '')
    setFormErrors({})
  }

  function clearFilters() {
    setSearchInput('')
    setSearchQuery('')
    setStatusFilter('')
    setProjectFilter('')
    setCurrentPage(1)
  }

  function toggleAddForm() {
    if (showAddForm) {
      cancelAddForm()
      return
    }

    if (isEditing) {
      resetTaskForm()
    }

    setShowAddForm(true)
    window.requestAnimationFrame(() => {
      taskFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  function clearFieldError(field: keyof TaskFormErrors) {
    setFormErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function loadTasks() {
    try {
      setLoading(true)
      setError(null)
      const data = await getTodos({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        projectId: projectFilter || undefined,
      })
      setTasks(data)
    } catch {
      setError('Could not load tasks. Check that the API is running.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign(taskId: number, userId: number) {
    try {
      setActionLoading({ type: 'assign', id: taskId })
      setError(null)
      await assignTodo(taskId, userId)
      await loadTasks()
      showSuccess('Task assigned successfully.')
    } catch {
      setError('Could not assign task.')
      setSuccessMessage(null)
    } finally {
      setActionLoading(null)
    }
  }

  function showSuccess(message: string) {
    setSuccessMessage(message)
    setError(null)
  }

  async function handleSubmitTask(event: FormEvent) {
    event.preventDefault()

    if (isEditing && !canEditTaskDetails) {
      if (!newTaskStatus) {
        setError('Please select a status.')
        return
      }
    } else {
      const errors = validateTaskForm({
        name: newTaskName,
        description: newTaskDescription,
      })

      if (hasFormErrors(errors)) {
        setFormErrors(errors)
        return
      }
    }

    const name = newTaskName.trim()
    const description = newTaskDescription.trim() || null
    setFormErrors({})

    if (isEditing) {
      const id = editingId

      try {
        setActionLoading({ type: 'edit', id })
        setError(null)
        if (canEditTaskDetails) {
          await updateTodo(id, {
            name,
            description,
            status: newTaskStatus as TaskStatus,
          })
          setTasks((current) =>
            current.map((item) =>
              item.id === id
                ? {
                    ...item,
                    name,
                    description,
                    status: newTaskStatus as TaskStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          )
          resetTaskForm()
          showSuccess(`Task "${name}" updated successfully.`)
        } else {
          await updateTodoStatus(id, newTaskStatus as TaskStatus)
          setTasks((current) =>
            current.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: newTaskStatus as TaskStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          )
          resetTaskForm()
          showSuccess('Task status updated successfully.')
        }
      } catch {
        setError(
          canEditTaskDetails
            ? 'Could not update task.'
            : 'Could not update task status.',
        )
        setSuccessMessage(null)
      } finally {
        setActionLoading(null)
      }

      return
    }

    try {
      setActionLoading({ type: 'create' })
      setError(null)
      if (!newTaskProjectId) {
        setError('Please select a project.')
        setActionLoading(null)
        return
      }
      const created = await createTodo({
        name,
        description,
        status: newTaskStatus || undefined,
        projectId: newTaskProjectId,
      })
      setTasks((current) => [created, ...current])
      resetTaskForm()
      showSuccess(`Task "${name}" created successfully.`)
    } catch {
      setError('Could not create task.')
      setSuccessMessage(null)
    } finally {
      setActionLoading(null)
    }
  }

  function startEdit(task: TaskItem) {
    setShowAddForm(false)
    setEditingId(task.id)
    setNewTaskName(task.name)
    setNewTaskDescription(task.description ?? '')
    setNewTaskStatus(task.status)
    setFormErrors({})
    setError(null)

    window.requestAnimationFrame(() => {
      taskFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  function cancelEdit() {
    resetTaskForm()
  }

  function requestDelete(id: number, name: string) {
    setDeleteTarget({ id, name })
  }

  function handleSort(key: SortKey) {
    setSortState((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return { key, direction: 'asc' }
    })
    setCurrentPage(1)
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setCurrentPage(1)
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    const { id, name } = deleteTarget

    try {
      setActionLoading({ type: 'delete', id })
      setError(null)
      await deleteTodo(id)
      setTasks((current) => current.filter((item) => item.id !== id))
      if (editingId === id) {
        resetTaskForm()
      }
      setDeleteTarget(null)
      showSuccess(`Task "${name}" deleted successfully.`)
    } catch {
      setError('Could not delete task.')
      setSuccessMessage(null)
    } finally {
      setActionLoading(null)
    }
  }

  const emptyMessage = canCreateTask
    ? hasActiveFilters
      ? 'No tasks match your filters.'
      : 'No tasks yet. Use Add Task to create one.'
    : 'No tasks assigned to you yet.'

  function usersForTask(projectId: number) {
    return projectAssignableUsers[Number(projectId)] ?? []
  }

  function isAssignableLoading(projectId: number) {
    return assignableLoadingByProject[Number(projectId)] ?? false
  }

  function AssignToSelect({
    task,
    isRowAssigning,
    isRowDeleting,
  }: {
    task: TaskItem
    isRowAssigning: boolean
    isRowDeleting: boolean
  }) {
    const users = usersForTask(task.projectId)
    const loadingUsers = isAssignableLoading(task.projectId)
    const loaded = projectAssignableUsers[Number(task.projectId)] !== undefined

    return (
      <div className="relative w-full min-w-[9rem]">
        <select
          value={task.assignedToUserId ?? ''}
          onChange={(e) => {
            const userId = Number(e.target.value)
            if (userId) handleAssign(task.id, userId)
          }}
          disabled={isRowDeleting || isRowAssigning || loadingUsers}
          className={`${selectClass} ${loadingUsers ? 'border-blue-200 bg-blue-50/40' : ''}`}
          aria-label={`Assign task ${task.id}`}
          aria-busy={loadingUsers || isRowAssigning}
        >
          <option value="" disabled>
            {loadingUsers ? 'Loading users...' : 'Select user...'}
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
        {loadingUsers && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px]"
            aria-hidden="true"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 shadow-sm">
              <Spinner size="sm" label="Loading users" />
              Loading...
            </span>
          </div>
        )}
        {isRowAssigning && !loadingUsers && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600">
            <Spinner size="sm" label="Assigning task" />
            Assigning...
          </p>
        )}
        {loaded && !loadingUsers && users.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">
            {canAssign
              ? 'No users in this project. Filter by project above and add team members.'
              : 'No users available in this project.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Task List</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter, and manage tasks across your projects.
          </p>
        </div>
        {canCreateTask && !isEditing && (
          <button
            type="button"
            onClick={toggleAddForm}
            disabled={isFormSubmitting}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
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
                Add Task
              </>
            )}
          </button>
        )}
      </div>

      <section
        className="relative mb-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
        aria-label="Task filters"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Filters</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(isSearchDebouncing || isFilterLoading) && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <Spinner size="sm" label="Applying filters" />
                {isSearchDebouncing ? 'Searching...' : 'Updating results...'}
              </span>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                disabled={loading}
                className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-60"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-5">
            <label htmlFor="task-search" className="mb-1 block text-sm font-medium text-slate-600">
              Search by name
            </label>
            <div className="relative">
              <MagnifyingGlassIcon
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="task-search"
                type="search"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search tasks..."
                className={`w-full rounded-lg border border-slate-300 py-2 pl-9 pr-10 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${isSearchDebouncing ? 'border-blue-200 bg-blue-50/30' : 'bg-white'}`}
              />
              {isSearchDebouncing && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" label="Searching tasks" />
                </span>
              )}
            </div>
          </div>

          <div className="sm:col-span-1 lg:col-span-3">
            <label htmlFor="status-filter" className="mb-1 block text-sm font-medium text-slate-600">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value
                setStatusFilter(value === '' ? '' : (value as TaskStatus))
                setCurrentPage(1)
              }}
              disabled={loading && tasks.length === 0}
              className={`${selectClass} ${isFilterLoading ? 'border-blue-200 bg-blue-50/30' : 'bg-white'}`}
            >
              <option value="">All statuses</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1 lg:col-span-4">
            <label htmlFor="project-filter" className="mb-1 block text-sm font-medium text-slate-600">
              Project
            </label>
            <div className="relative">
              {(projectsLoading || isFilterLoading) && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                  <Spinner
                    size="sm"
                    label={projectsLoading ? 'Loading projects' : 'Loading tasks'}
                  />
                </span>
              )}
              <select
                id="project-filter"
                value={projectFilter}
                onChange={(e) => {
                  const value = e.target.value
                  setProjectFilter(value === '' ? '' : Number(value))
                  setCurrentPage(1)
                }}
                disabled={projectsLoading}
                className={`${selectClass} ${projectsLoading || isFilterLoading ? 'border-blue-200 bg-blue-50/30 pr-10' : 'bg-white'}`}
              >
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code ? `${project.code} — ${project.name}` : project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {canManageProjectTeam && projectFilter !== '' && selectedProject && (
        <div className="mb-4">
          <ProjectMembersPanel
            projectId={projectFilter}
            projectLabel={
              selectedProject.code
                ? `${selectedProject.code} — ${selectedProject.name}`
                : selectedProject.name
            }
            assignableUsers={assignableUsers}
            onMembersChanged={() => refreshAssignableForProject(projectFilter)}
          />
        </div>
      )}

      {(isEditing || (showAddForm && canCreateTask)) && (
      <form
        ref={taskFormRef}
        onSubmit={handleSubmitTask}
        className={`mb-6 space-y-4 ${
          isEditing
            ? 'rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:p-5'
            : 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
        }`}
      >
        {isEditing ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Editing Task #{editingId}
              </p>
              {isNameDescriptionReadOnly && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Task name and description are read-only. You can update status only.
                </p>
              )}
            </div>
            <StatusBadge status={newTaskStatus as TaskStatus} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">New Task</p>
              <p className="text-xs text-slate-500">
                Create a task in one of your projects.
              </p>
            </div>
            <button
              type="button"
              onClick={cancelAddForm}
              disabled={isFormSubmitting}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-70"
            >
              <XMarkIcon size={14} />
              Close
            </button>
          </div>
        )}

        {canCreateTask && !isEditing && (
          <div>
            <label htmlFor="task-project" className="mb-1 block text-sm font-medium text-slate-600">
              Project <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {projectsLoading && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" label="Loading projects" />
                </span>
              )}
              <select
                id="task-project"
                value={newTaskProjectId}
                onChange={(e) => {
                  const value = e.target.value
                  setNewTaskProjectId(value === '' ? '' : Number(value))
                }}
                required
                disabled={isFormSubmitting || projectsLoading}
                className={`${selectClass} ${projectsLoading ? 'border-blue-200 bg-blue-50/40 pr-10' : ''}`}
              >
                <option value="" disabled>
                  {projectsLoading ? 'Loading projects...' : 'Select project...'}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code ? `${project.code} — ${project.name}` : project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="task-name"
            className="mb-1 block text-sm font-medium text-slate-600"
          >
            Task name <span className="text-red-500">*</span>
            {isNameDescriptionReadOnly && (
              <span className="ml-1 font-normal text-slate-400">(read-only)</span>
            )}
          </label>
          <input
            id="task-name"
            type="text"
            value={newTaskName}
            onChange={(event) => {
              setNewTaskName(event.target.value)
              clearFieldError('name')
            }}
            onBlur={() => {
              if (isNameDescriptionReadOnly) return
              const nameError = validateTaskName(newTaskName)
              setFormErrors((current) => {
                const next = { ...current }
                if (nameError) {
                  next.name = nameError
                } else {
                  delete next.name
                }
                return next
              })
            }}
            placeholder="Enter task name"
            maxLength={TASK_NAME_MAX_LENGTH}
            aria-invalid={Boolean(formErrors.name)}
            aria-describedby={
              [formErrors.name ? 'task-name-error' : null, 'task-name-count']
                .filter(Boolean)
                .join(' ') || undefined
            }
            readOnly={isNameDescriptionReadOnly}
            className={`w-full rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 ${fieldErrorClass(Boolean(formErrors.name))} ${isNameDescriptionReadOnly ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-600' : ''}`}
            disabled={isFormSubmitting || isNameDescriptionReadOnly}
          />
          <FieldError id="task-name-error" message={formErrors.name} />
          <CharacterCount
            id="task-name-count"
            current={newTaskName.trim().length}
            max={TASK_NAME_MAX_LENGTH}
          />
        </div>

        <div>
          <label
            htmlFor="task-description"
            className="mb-1 block text-sm font-medium text-slate-600"
          >
            Description <span className="text-slate-400">(optional)</span>
            {isNameDescriptionReadOnly && (
              <span className="ml-1 font-normal text-slate-400">(read-only)</span>
            )}
          </label>
          <textarea
            id="task-description"
            value={newTaskDescription}
            onChange={(event) => {
              setNewTaskDescription(event.target.value)
              clearFieldError('description')
            }}
            onBlur={() => {
              if (isNameDescriptionReadOnly) return
              const descriptionError = validateTaskDescription(newTaskDescription)
              setFormErrors((current) => {
                const next = { ...current }
                if (descriptionError) {
                  next.description = descriptionError
                } else {
                  delete next.description
                }
                return next
              })
            }}
            placeholder="Enter task description"
            rows={3}
            maxLength={TASK_DESCRIPTION_MAX_LENGTH}
            aria-invalid={Boolean(formErrors.description)}
            aria-describedby={
              [
                formErrors.description ? 'task-description-error' : null,
                'task-description-count',
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            readOnly={isNameDescriptionReadOnly}
            className={`w-full rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 ${fieldErrorClass(Boolean(formErrors.description))} ${isNameDescriptionReadOnly ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-600' : ''}`}
            disabled={isFormSubmitting || isNameDescriptionReadOnly}
          />
          <FieldError
            id="task-description-error"
            message={formErrors.description}
          />
          <CharacterCount
            id="task-description-count"
            current={newTaskDescription.trim().length}
            max={TASK_DESCRIPTION_MAX_LENGTH}
          />
        </div>
        <div>
          <label
            htmlFor="task-status"
            className="mb-1 block text-sm font-medium text-slate-600"
          >
            Status
          </label>
          <select
            id="task-status"
            value={newTaskStatus}
            onChange={(event) => {
              const value = event.target.value
              setNewTaskStatus(value === '' ? '' : (value as TaskStatus))
            }}
            className={`${selectClass} ${isSavingEdit ? 'border-blue-200 bg-blue-50/40' : ''}`}
            disabled={isFormSubmitting}
            aria-busy={isSavingEdit}
          >
            <option value="" disabled={isEditing}>
              Select status...
            </option>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {isSavingEdit && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-blue-600">
              <Spinner size="sm" label="Saving task status" />
              Saving changes...
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isFormSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isFormSubmitting && (
              <Spinner
                size="sm"
                label={isEditing ? 'Saving task' : 'Creating task'}
              />
            )}
            {isEditing ? (canEditTaskDetails ? 'Save Changes' : 'Save Status') : 'Add Task'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isFormSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      )}

      {successMessage && (
        <InlineMessage
          variant="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {error && (
        <InlineMessage
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {loading && tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 py-16">
          <Spinner size="lg" label="Loading tasks" />
          <p className="text-sm text-slate-500">Loading tasks...</p>
        </div>
      ) : (
        <div className="relative">
          {(refreshing || isFilterLoading) && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-white/60 pt-8 backdrop-blur-[1px] md:pt-10"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm">
                <Spinner size="sm" label={refreshing ? 'Refreshing tasks' : 'Loading filtered tasks'} />
                {refreshing ? 'Updating tasks...' : 'Applying filters...'}
              </span>
            </div>
          )}
        <>
          <div className="space-y-3 md:hidden">
            {tasks.length === 0 ? (
              <p className="rounded-xl border border-slate-200 px-4 py-12 text-center text-slate-500">
                {emptyMessage}
              </p>
            ) : (
              paginatedTasks.map((task, index) => {
                const isSelected = editingId === task.id
                const isRowDeleting =
                  actionLoading?.type === 'delete' &&
                  actionLoading.id === task.id
                const isRowAssigning =
                  actionLoading?.type === 'assign' &&
                  actionLoading.id === task.id
                const isRowEditing =
                  actionLoading?.type === 'edit' &&
                  actionLoading.id === task.id
                const sequenceNumber = (currentPage - 1) * pageSize + index + 1

                return (
                  <article
                    key={task.id}
                    className={`rounded-xl border p-4 transition-colors ${isSelected ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">
                        #{sequenceNumber} · Task ID {task.id}
                      </p>
                      <StatusBadge status={task.status} />
                    </div>

                    <h2 className="mb-1 font-semibold text-slate-900">
                      {task.name}
                    </h2>
                    {task.description && (
                      <p className="mb-2 text-sm text-slate-600">
                        {task.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      Updated: {formatDate(task.updatedAt)}
                    </p>

                    {canAssign && (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          Assign to
                        </label>
                        <AssignToSelect
                          task={task}
                          isRowAssigning={isRowAssigning}
                          isRowDeleting={isRowDeleting}
                        />
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(task)}
                        disabled={isRowDeleting || isRowEditing || isSavingEdit}
                        aria-busy={isRowEditing}
                        className={editActionBtnClass}
                      >
                        {isRowEditing && (
                          <Spinner size="sm" label="Saving task" />
                        )}
                        Edit
                      </button>
                      {canDeleteTask && (
                      <button
                        type="button"
                        onClick={() => requestDelete(task.id, task.name)}
                        disabled={isRowDeleting || isRowEditing || isSavingEdit}
                        aria-busy={isRowDeleting}
                        className={deleteActionBtnClass}
                      >
                        {isRowDeleting && (
                          <Spinner size="sm" label="Deleting task" />
                        )}
                        Delete
                      </button>
                      )}
                    </div>
                  </article>
                )
              })
            )}

            {tasks.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={sortedTasks.length}
                pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>

          <div className="hidden rounded-xl border border-slate-200 md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="w-[3rem] whitespace-nowrap px-3 py-3 sm:px-4">
                    #
                  </th>
                  <SortableHeader
                    label="ID"
                    sortKey="id"
                    currentSort={sortState}
                    onSort={handleSort}
                    className="w-[3.5rem] whitespace-nowrap px-3 py-3 sm:px-4"
                  />
                  <SortableHeader
                    label="Name"
                    sortKey="name"
                    currentSort={sortState}
                    onSort={handleSort}
                    className="w-[18%] px-3 py-3 sm:px-4"
                  />
                  <SortableHeader
                    label="Description"
                    sortKey="description"
                    currentSort={sortState}
                    onSort={handleSort}
                    className="hidden w-[22%] px-3 py-3 lg:table-cell sm:px-4"
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    currentSort={sortState}
                    onSort={handleSort}
                    className="w-[7.5rem] whitespace-nowrap px-3 py-3 sm:px-4"
                  />
                  <SortableHeader
                    label="Created"
                    sortKey="createdAt"
                    currentSort={sortState}
                    onSort={handleSort}
                    className="hidden w-[11rem] whitespace-nowrap px-3 py-3 lg:table-cell sm:px-4"
                  />
                  <SortableHeader
                    label="Updated"
                    sortKey="updatedAt"
                    currentSort={sortState}
                    onSort={handleSort}
                    className="hidden w-[11rem] whitespace-nowrap px-3 py-3 xl:table-cell sm:px-4"
                  />
                  {canAssign && (
                    <th className="hidden w-[10rem] whitespace-nowrap px-3 py-3 lg:table-cell sm:px-4">
                      Assign to
                    </th>
                  )}
                  <th className="w-[9.5rem] whitespace-nowrap px-3 py-3 text-right sm:px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canAssign ? 9 : 8}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedTasks.map((task, index) => {
                    const isSelected = editingId === task.id
                    const isRowDeleting =
                      actionLoading?.type === 'delete' &&
                      actionLoading.id === task.id
                    const isRowAssigning =
                      actionLoading?.type === 'assign' &&
                      actionLoading.id === task.id
                    const isRowEditing =
                      actionLoading?.type === 'edit' &&
                      actionLoading.id === task.id
                    const sequenceNumber = (currentPage - 1) * pageSize + index + 1

                    return (
                      <tr
                        key={task.id}
                        className={`transition-colors hover:bg-slate-50/80 ${isSelected ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-500 sm:px-4">
                          {sequenceNumber}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700 sm:px-4">
                          {task.id}
                        </td>

                        <td className="px-3 py-3 sm:px-4">
                          <span className="block truncate font-medium text-slate-900">
                            {task.name}
                          </span>
                        </td>

                        <td className="hidden px-3 py-3 lg:table-cell sm:px-4">
                          <span
                            className="block truncate text-slate-600"
                            title={task.description ?? undefined}
                          >
                            {task.description || '—'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                          <StatusBadge status={task.status} />
                        </td>

                        <td className="hidden px-3 py-3 text-xs text-slate-500 lg:table-cell sm:px-4">
                          {formatDate(task.createdAt)}
                        </td>

                        <td className="hidden px-3 py-3 text-xs text-slate-500 xl:table-cell sm:px-4">
                          {formatDate(task.updatedAt)}
                        </td>

                        {canAssign && (
                          <td className="hidden px-3 py-3 lg:table-cell sm:px-4">
                            <AssignToSelect
                              task={task}
                              isRowAssigning={isRowAssigning}
                              isRowDeleting={isRowDeleting}
                            />
                          </td>
                        )}

                        <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(task)}
                              disabled={isRowDeleting || isRowEditing || isSavingEdit}
                              aria-label={`Edit task ${task.id}`}
                              aria-busy={isRowEditing}
                              className={editActionBtnClass}
                            >
                              {isRowEditing && (
                                <Spinner size="sm" label="Saving task" />
                              )}
                              Edit
                            </button>
                            {canDeleteTask && (
                            <button
                              type="button"
                              onClick={() => requestDelete(task.id, task.name)}
                              disabled={isRowDeleting || isRowEditing || isSavingEdit}
                              aria-label={`Delete task ${task.id}`}
                              aria-busy={isRowDeleting}
                              className={deleteActionBtnClass}
                            >
                              {isRowDeleting && (
                                <Spinner size="sm" label="Deleting task" />
                              )}
                              Delete
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {tasks.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={sortedTasks.length}
                pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        </>
        </div>
      )}

      {canDeleteTask && (
      <DeleteDialog
        open={deleteTarget !== null}
        taskName={deleteTarget?.name ?? ''}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!isDeleting) {
            setDeleteTarget(null)
          }
        }}
        isDeleting={isDeleting}
      />
      )}
    </div>
  )
}
