import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, ExternalLink, Loader2, RefreshCw, Search, Wrench, XCircle } from 'lucide-react'
import { fetchActivity, retryProject } from '../api'
import { STATUS_CONFIG, ACTIVE_STATUSES } from './statusConfig'
import type { Project, ProjectActivity, ResearcherActivity, ToolUseEntry } from '../types'

const COLLAPSED_TOOL_COUNT = 3

interface ProgressViewProps {
  project: Project
  onCompleted: () => void
  onRetry?: () => void
}

const EMPTY_STATE_MESSAGES: Record<string, string> = {
  planning: 'Planning research tasks...',
  synthesizing: 'Synthesizing final report...',
}

function relativeTime(ts: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}

const TOOL_ICONS: Record<string, typeof Search> = {
  web_search: Search,
  web_fetch: ExternalLink,
  current_time: Clock,
}

function ToolRow({ tool, faded }: { tool: ToolUseEntry; faded: boolean }) {
  const Icon = TOOL_ICONS[tool.name] ?? Wrench
  return (
    <div className={`flex items-center gap-2 text-[11px] ${faded ? 'opacity-50' : ''}`}>
      <Icon className="w-3 h-3 shrink-0 text-[var(--color-accent)]" />
      <span className="font-mono text-[var(--color-muted-foreground)] shrink-0">
        {tool.name}
      </span>
      <span className="truncate text-[var(--color-foreground)]">
        {tool.input_preview || <em className="opacity-60">…</em>}
      </span>
      <span className="ml-auto shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
        {relativeTime(tool.ts)}
      </span>
    </div>
  )
}

function OrchestratorRow({ event }: { event: ToolUseEntry }) {
  const Icon = TOOL_ICONS[event.name] ?? Wrench
  return (
    <div className="bg-[var(--color-secondary)]/50 border border-dashed rounded-lg px-3 py-2 flex items-center gap-2 text-[11px]">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] shrink-0">
        Orchestrator
      </span>
      <Icon className="w-3 h-3 shrink-0 text-[var(--color-accent)]" />
      <span className="font-mono text-[var(--color-muted-foreground)] shrink-0">
        {event.name}
      </span>
      <span className="truncate text-[var(--color-foreground)]">
        {event.input_preview || <em className="opacity-60">…</em>}
      </span>
      <span className="ml-auto shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
        {relativeTime(event.ts)}
      </span>
    </div>
  )
}

function ResearcherCard({ researcher, index }: { researcher: ResearcherActivity; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const running = researcher.status === 'running'
  const allTools = researcher.tools
  const visibleTools = expanded ? allTools : allTools.slice(-COLLAPSED_TOOL_COUNT)
  const hiddenCount = allTools.length - visibleTools.length

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2 p-4 text-left hover:bg-[var(--color-secondary)] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-muted-foreground)]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-muted-foreground)]" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Researcher {index + 1}
            </span>
            {running ? (
              <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-accent)]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Running
              </div>
            ) : researcher.status === 'interrupted' ? (
              <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-error)]">
                <XCircle className="w-3 h-3" />
                Interrupted
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-success)]">
                <CheckCircle2 className="w-3 h-3" />
                Done
              </div>
            )}
            <span className="ml-auto text-[10px] text-[var(--color-muted-foreground)]">
              {allTools.length} tool {allTools.length === 1 ? 'call' : 'calls'}
            </span>
            {researcher.rate_limited ? (
              <span
                className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-warning)]"
                title="Jina Reader returned 429 — content quality degraded"
              >
                <AlertTriangle className="w-3 h-3" />
                {researcher.rate_limited} rate-limited
              </span>
            ) : null}
          </div>
          <p className={`text-xs text-[var(--color-foreground)] ${expanded ? '' : 'line-clamp-2'}`}>
            {researcher.task}
          </p>
        </div>
      </button>

      {visibleTools.length > 0 && (
        <div className="px-4 pb-4 space-y-1.5 pt-3 border-t border-[var(--color-border)]">
          {!expanded && hiddenCount > 0 && (
            <div className="text-[10px] text-[var(--color-muted-foreground)] italic">
              +{hiddenCount} earlier {hiddenCount === 1 ? 'call' : 'calls'}
            </div>
          )}
          {visibleTools.map((tool, i) => (
            <ToolRow
              key={tool.tool_use_id ?? `${tool.ts}-${i}`}
              tool={tool}
              faded={!expanded && i === 0 && visibleTools.length === COLLAPSED_TOOL_COUNT}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ProgressView({ project, onCompleted, onRetry }: ProgressViewProps) {
  const [activity, setActivity] = useState<ProjectActivity | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryTick, setRetryTick] = useState(0)
  const wasRunningRef = useRef(project.status !== 'completed' && project.status !== 'error')

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      try {
        const data = await fetchActivity(project.id)
        if (cancelled) return
        setActivity(data)
        const terminal = data.status === 'completed' || data.status === 'error'
        if (terminal) {
          if (interval) clearInterval(interval)
          if (data.status === 'completed' && wasRunningRef.current) {
            wasRunningRef.current = false
            onCompleted()
          }
        }
      } catch {
        // Silently retry on next tick
      }
    }

    poll()
    interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [project.id, onCompleted, retryTick])

  const phase = activity?.status ?? project.status
  const phaseConfig = STATUS_CONFIG[phase]
  const phaseActive = ACTIVE_STATUSES.includes(phase)
  const researchers = activity?.researchers ?? []
  const orchEvents = activity?.orchestrator_events ?? []
  const errorMessage = activity?.status === 'error' ? activity.error : null
  const runningCount = researchers.filter((r) => r.status === 'running').length
  const completedCount = researchers.length - runningCount

  type TimelineItem =
    | { kind: 'researcher'; ts: string; researcher: ResearcherActivity; index: number }
    | { kind: 'orch'; ts: string; event: ToolUseEntry }
  const timeline: TimelineItem[] = [
    ...researchers.map((r, index) => ({
      kind: 'researcher' as const,
      ts: r.started_at,
      researcher: r,
      index,
    })),
    ...orchEvents.map((e) => ({ kind: 'orch' as const, ts: e.ts, event: e })),
  ].sort((a, b) => a.ts.localeCompare(b.ts))

  return (
    <div>
      {errorMessage && (
        <div className="mb-4 flex items-start justify-between gap-3 bg-card border border-[var(--color-error)]/30 rounded-xl p-4">
          <p className="text-sm text-[var(--color-error)]">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={async () => {
                setRetrying(true)
                try {
                  await retryProject(project.id)
                  // Drop the stale errored activity so the banner disappears
                  // immediately; the poller will refill it within 2s.
                  setActivity(null)
                  wasRunningRef.current = true
                  setRetryTick((n) => n + 1)
                  onRetry()
                } finally {
                  setRetrying(false)
                }
              }}
              disabled={retrying}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60 disabled:cursor-wait transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>
      )}

      <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
        <phaseConfig.Icon
          className={`w-4 h-4 ${phaseActive ? 'animate-spin' : ''}`}
          style={{ color: phaseConfig.color }}
        />
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
            Orchestrator
          </div>
          <div className="text-sm font-medium" style={{ color: phaseConfig.color }}>
            {phaseConfig.label}
          </div>
        </div>
        {researchers.length > 0 && (
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Researchers
            </div>
            <div className="text-xs font-medium text-[var(--color-foreground)]">
              {completedCount} done{runningCount > 0 && ` · ${runningCount} running`}
            </div>
          </div>
        )}
      </div>

      <div className="ml-5 mt-2 pl-5 border-l border-[var(--color-border)] space-y-3 py-2">
        {timeline.length === 0 ? (
          <div className="text-xs text-[var(--color-muted-foreground)] italic py-4">
            {EMPTY_STATE_MESSAGES[phase] ?? 'Waiting for the orchestrator to start...'}
          </div>
        ) : (
          timeline.map((item) =>
            item.kind === 'researcher' ? (
              <ResearcherCard
                key={item.researcher.id}
                researcher={item.researcher}
                index={item.index}
              />
            ) : (
              <OrchestratorRow key={item.event.tool_use_id} event={item.event} />
            ),
          )
        )}
      </div>
    </div>
  )
}
