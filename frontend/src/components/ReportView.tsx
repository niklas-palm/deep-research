import { useEffect, useState } from 'react'
import { GitBranch } from 'lucide-react'
import { fetchReport } from '../api'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Project } from '../types'
import { RevisionModal } from './RevisionModal'

interface ReportViewProps {
  project: Project
  onRevisionCreated: (revision: Project) => void
}

export function ReportView({ project, onRevisionCreated }: ReportViewProps) {
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRevision, setShowRevision] = useState(false)

  useEffect(() => {
    setReport(null)
    setError(null)
    fetchReport(project.id)
      .then(setReport)
      .catch(() => setError('Failed to load report'))
  }, [project.id])

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => setShowRevision(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-secondary)] transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          Create Revision
        </button>
      </div>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      {!report && !error && (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-4 rounded animate-pulse"
              style={{
                background: 'var(--color-secondary)',
                width: `${70 + (i * 13) % 30}%`,
              }}
            />
          ))}
        </div>
      )}

      {report && (
        <article className="bg-card border rounded-xl p-8 prose prose-sm max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
        </article>
      )}

      {showRevision && (
        <RevisionModal
          parent={project}
          onClose={() => setShowRevision(false)}
          onCreated={(rev) => {
            setShowRevision(false)
            onRevisionCreated(rev)
          }}
        />
      )}
    </div>
  )
}
