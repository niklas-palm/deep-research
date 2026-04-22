import { Activity, BarChart3, FileText, MessageSquare } from 'lucide-react'

type View = 'report' | 'progress' | 'chat' | 'metrics'

interface TabBarProps {
  view: View
  isCompleted: boolean
  onChange: (view: View) => void
}

const TABS: { id: View; label: string; Icon: typeof FileText; completedOnly: boolean }[] = [
  { id: 'report', label: 'Report', Icon: FileText, completedOnly: true },
  { id: 'progress', label: 'Progress', Icon: Activity, completedOnly: false },
  { id: 'chat', label: 'Chat', Icon: MessageSquare, completedOnly: true },
  { id: 'metrics', label: 'Metrics', Icon: BarChart3, completedOnly: true },
]

export function TabBar({ view, isCompleted, onChange }: TabBarProps) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)]/40">
      {TABS.map(({ id, label, Icon, completedOnly }) => {
        const disabled = completedOnly && !isCompleted
        const active = view === id
        return (
          <button
            key={id}
            onClick={() => !disabled && onChange(id)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
              active
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : disabled
                ? 'text-[var(--color-muted-foreground)]/50 cursor-not-allowed'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
