import { useState } from 'react'
import { Clock, X } from 'lucide-react'

interface NewProjectModalProps {
  onClose: () => void
  onSubmit: (query: string) => void
}

export function NewProjectModal({ onClose, onSubmit }: NewProjectModalProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSubmit(query.trim())
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'hsla(220, 20%, 14%, 0.2)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-card border rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight">New Research</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-secondary)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--color-muted-foreground)]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1.5">
              Research Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="A word, a theme, or a paragraph — whatever gets the research going."
              rows={5}
              autoFocus
              className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-colors resize-none"
            />
          </div>

          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
            style={{ background: 'var(--color-secondary)' }}
          >
            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              Deep research runs typically take <strong className="text-[var(--color-foreground)]">10–15 minutes</strong>. The orchestrator spawns multiple researchers in parallel, performs a gap-analysis pass, and synthesizes a full report.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-[var(--color-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!query.trim()}
            className="btn-accent px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Research
          </button>
        </div>
      </form>
    </div>
  )
}
