import { Trash2 } from 'lucide-react'
import type { Project } from '../types'
import { STATUS_CONFIG, ACTIVE_STATUSES } from './statusConfig'

interface SidebarProjectProps {
  project: Project
  children: Project[]
  depth: number
  selectedId: string | null
  onSelect: (project: Project) => void
  onDelete: (project: Project) => void
  renderChild: (child: Project) => React.ReactNode
}

export function SidebarProject({
  project,
  children,
  depth,
  selectedId,
  onSelect,
  onDelete,
  renderChild,
}: SidebarProjectProps) {
  const { color, Icon } = STATUS_CONFIG[project.status]
  const isActive = ACTIVE_STATUSES.includes(project.status)
  const isSelected = selectedId === project.id
  const indent = Math.min(depth, 3) * 14

  return (
    <div>
      <div
        onClick={() => onSelect(project)}
        className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[var(--color-secondary)]'
            : 'hover:bg-[var(--color-secondary)]/60'
        }`}
        style={{ paddingLeft: 8 + indent }}
      >
        {depth > 0 && (
          <span className="text-[var(--color-muted-foreground)] text-[10px] shrink-0">↳</span>
        )}
        <Icon
          className={`w-3 h-3 shrink-0 ${isActive ? 'animate-spin' : ''}`}
          style={{ color }}
        />
        <span
          className={`flex-1 text-xs truncate ${
            isSelected
              ? 'text-[var(--color-foreground)] font-medium'
              : 'text-[var(--color-foreground)]'
          }`}
          title={project.title}
        >
          {project.title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(project)
          }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-secondary)] transition-opacity shrink-0"
          title="Delete project"
        >
          <Trash2 className="w-3 h-3 text-[var(--color-muted-foreground)]" />
        </button>
      </div>

      {children.length > 0 && (
        <div>{children.map((c) => renderChild(c))}</div>
      )}
    </div>
  )
}
