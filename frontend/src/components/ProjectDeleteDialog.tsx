import Spinner from './Spinner'

interface ProjectDeleteDialogProps {
  open: boolean
  projectName: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}

export default function ProjectDeleteDialog({
  open,
  projectName,
  onConfirm,
  onCancel,
  isDeleting,
}: ProjectDeleteDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close delete dialog"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onCancel}
        disabled={isDeleting}
      />
      <div
        role="alertdialog"
        aria-labelledby="delete-project-title"
        aria-describedby="delete-project-description"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="delete-project-title" className="text-lg font-semibold text-slate-900">
          Delete Project
        </h2>
        <p id="delete-project-description" className="mt-2 text-sm text-slate-600">
          This will archive the project and remove it from active listings. Tasks linked to
          this project are not deleted.
        </p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          Are you sure you want to delete{' '}
          <span className="font-semibold">&quot;{projectName}&quot;</span>?
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting && <Spinner size="sm" label="Deleting project" />}
            Delete Project
          </button>
        </div>
      </div>
    </div>
  )
}
