import { HelpCircle, Plus } from 'lucide-react'
import type { Project } from '../types'
import { SidebarProject } from './SidebarProject'

interface SidebarProps {
  projects: Project[]
  selectedId: string | null
  onSelect: (project: Project) => void
  onDelete: (project: Project) => void
  onNew: () => void
}

export function Sidebar({ projects, selectedId, onSelect, onDelete, onNew }: SidebarProps) {
  const byParent = new Map<string | null, Project[]>()
  for (const p of projects) {
    const key = p.parent_id ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(p)
  }
  const roots = byParent.get(null) ?? []

  const renderProject = (project: Project, depth: number): React.ReactNode => {
    const children = byParent.get(project.id) ?? []
    return (
      <SidebarProject
        key={project.id}
        project={project}
        children={children}
        depth={depth}
        selectedId={selectedId}
        onSelect={onSelect}
        onDelete={onDelete}
        renderChild={(child) => renderProject(child, depth + 1)}
      />
    )
  }

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--color-border)] bg-card flex flex-col h-screen">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h1 className="text-sm font-semibold tracking-tight">Deep Research</h1>
        <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
          Institutional thematic reports
        </p>
      </div>

      <div className="p-3 border-b border-[var(--color-border)]">
        <button
          onClick={onNew}
          className="btn-accent w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Research
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {roots.length === 0 ? (
          <p className="text-[11px] text-[var(--color-muted-foreground)] italic px-2 py-4">
            No research projects yet.
          </p>
        ) : (
          <div className="space-y-0.5">{roots.map((p) => renderProject(p, 0))}</div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--color-border)]">
        <a
          href="#/how-it-works"
          className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] rounded-md transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          How it works
        </a>
      </div>
    </aside>
  )
}
