import { useEffect, useState, type FormEvent } from 'react'
import {
  createTodo,
  deleteTodo,
  getTodos,
  TASK_STATUSES,
  updateTodo,
  type TaskItem,
  type TaskStatus,
} from '../api/todos'
import Spinner from './Spinner'

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
  | null

interface EditForm {
  name: string
  description: string
  status: TaskStatus
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function TodoList() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    description: '',
    status: 'Pending',
  })
  const [editNameError, setEditNameError] = useState(false)
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      setLoading(true)
      setError(null)
      const data = await getTodos()
      setTasks(data)
    } catch {
      setError('Could not load tasks. Check that the API is running.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTask(event: FormEvent) {
    event.preventDefault()

    const name = newTaskName.trim()
    if (!name) {
      return
    }

    try {
      setActionLoading({ type: 'create' })
      setError(null)
      const created = await createTodo({
        name,
        description: newTaskDescription.trim() || null,
        status: 'Pending',
      })
      setTasks((current) => [created, ...current])
      setNewTaskName('')
      setNewTaskDescription('')
    } catch {
      setError('Could not create task.')
    } finally {
      setActionLoading(null)
    }
  }

  function startEdit(task: TaskItem) {
    setEditingId(task.id)
    setEditForm({
      name: task.name,
      description: task.description ?? '',
      status: task.status,
    })
    setEditNameError(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditNameError(false)
  }

  async function handleSaveEdit(id: number) {
    const name = editForm.name.trim()
    if (!name) {
      setEditNameError(true)
      return
    }

    try {
      setActionLoading({ type: 'edit', id })
      setError(null)
      await updateTodo(id, {
        name,
        description: editForm.description.trim() || null,
        status: editForm.status,
      })
      setTasks((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                name,
                description: editForm.description.trim() || null,
                status: editForm.status,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      setEditingId(null)
      setEditNameError(false)
    } catch {
      setError('Could not update task.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete task "${name}"?`)) {
      return
    }

    try {
      setActionLoading({ type: 'delete', id })
      setError(null)
      await deleteTodo(id)
      setTasks((current) => current.filter((item) => item.id !== id))
      if (editingId === id) {
        setEditingId(null)
      }
    } catch {
      setError('Could not delete task.')
    } finally {
      setActionLoading(null)
    }
  }

  const isCreating = actionLoading?.type === 'create'

  return (
    <div className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Task List</h1>

      <form onSubmit={handleAddTask} className="mb-6 space-y-3">
        <input
          type="text"
          value={newTaskName}
          onChange={(event) => setNewTaskName(event.target.value)}
          placeholder="Task name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          disabled={isCreating}
        />
        <textarea
          value={newTaskDescription}
          onChange={(event) => setNewTaskDescription(event.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          disabled={isCreating}
        />
        <button
          type="submit"
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isCreating && <Spinner size="sm" label="Creating task" />}
          Add Task
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 py-16">
          <Spinner size="lg" label="Loading tasks" />
          <p className="text-sm text-slate-500">Loading tasks...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 md:table-cell">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 md:table-cell">Created</th>
                <th className="hidden px-4 py-3 lg:table-cell">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No tasks yet. Add one above.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isEditing = editingId === task.id
                  const isSaving =
                    actionLoading?.type === 'edit' &&
                    actionLoading.id === task.id
                  const isDeleting =
                    actionLoading?.type === 'delete' &&
                    actionLoading.id === task.id
                  const isRowBusy = isSaving || isDeleting

                  return (
                    <tr
                      key={task.id}
                      className={`transition-colors hover:bg-slate-50/80 ${isEditing ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {task.id}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(event) => {
                              setEditForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                              setEditNameError(false)
                            }}
                            className={`${inputClass} ${editNameError ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                            aria-label={`Edit name for task ${task.id}`}
                            disabled={isRowBusy}
                          />
                        ) : (
                          <span className="font-medium text-slate-900">
                            {task.name}
                          </span>
                        )}
                      </td>

                      <td className="hidden px-4 py-3 md:table-cell">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            className={inputClass}
                            placeholder="Description"
                            aria-label={`Edit description for task ${task.id}`}
                            disabled={isRowBusy}
                          />
                        ) : (
                          <span
                            className="block max-w-[200px] truncate text-slate-600"
                            title={task.description ?? undefined}
                          >
                            {task.description || '—'}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editForm.status}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                status: event.target.value as TaskStatus,
                              }))
                            }
                            className={inputClass}
                            aria-label={`Edit status for task ${task.id}`}
                            disabled={isRowBusy}
                          >
                            {TASK_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[task.status]}`}
                          >
                            {STATUS_LABELS[task.status]}
                          </span>
                        )}
                      </td>

                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                        {formatDate(task.createdAt)}
                      </td>

                      <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                        {formatDate(task.updatedAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(task.id)}
                                disabled={isRowBusy}
                                aria-label={`Save task ${task.id}`}
                                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {isSaving && (
                                  <Spinner size="sm" label="Saving task" />
                                )}
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isRowBusy}
                                aria-label={`Cancel edit task ${task.id}`}
                                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(task)}
                                disabled={editingId !== null || isRowBusy}
                                aria-label={`Edit task ${task.id}`}
                                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(task.id, task.name)}
                                disabled={editingId !== null || isRowBusy}
                                aria-label={`Delete task ${task.id}`}
                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isDeleting && (
                                  <Spinner size="sm" label="Deleting task" />
                                )}
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
