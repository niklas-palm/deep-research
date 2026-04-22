import { useState } from 'react'
import { GitBranch, X } from 'lucide-react'
import { createRevision } from '../api'
import type { Project } from '../types'

interface RevisionModalProps {
  parent: Project
  onClose: () => void
  onCreated: (revision: Project) => void
}

export function RevisionModal({ parent, onClose, onCreated }: RevisionModalProps) {
  const [refinement, setRefinement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refinement.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await createRevision(parent.id, refinement.trim())
      onCreated(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create revision')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'hsla(220, 20%, 14%, 0.2)' }}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-card border rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold tracking-tight">Create Revision</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-secondary)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--color-muted-foreground)]" />
          </button>
        </div>

        <p className="text-xs text-[var(--color-muted-foreground)] mb-4">
          Building on <span className="font-medium text-[var(--color-foreground)]">{parent.title}</span>.
          The new run uses the prior report as context and leans into your refinement.
        </p>

        <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1.5">
          What do you want to focus on?
        </label>
        <textarea
          value={refinement}
          onChange={(e) => setRefinement(e.target.value)}
          placeholder="e.g. Go deeper on electrolyzer manufacturers and their cost curves."
          rows={4}
          autoFocus
          className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-colors resize-none"
        />

        {error && (
          <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-[var(--color-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!refinement.trim() || submitting}
            className="btn-accent px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Starting…' : 'Start Revision'}
          </button>
        </div>
      </form>
    </div>
  )
}
