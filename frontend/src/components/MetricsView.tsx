import { useEffect, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'
import { fetchActivity, fetchMetrics } from '../api'
import type { Project, ProjectMetrics, ResearcherActivity, Score } from '../types'

interface MetricsViewProps {
  project: Project
}

const SCORE_LABELS: Record<string, string> = {
  structure_compliance: 'Structure compliance',
  citation_density: 'Citation density',
  source_diversity: 'Source diversity',
  data_specificity: 'Data specificity',
  plan_quality: 'Plan quality',
  research_quality: 'Research quality',
}

const SCORE_EXPLANATIONS: Record<string, string> = {
  structure_compliance:
    'Checks that the report has all required section headings (Investment Thesis, Market Opportunity, Key Players, etc.) and at least one inline citation. Pass/fail — a missing heading fails the whole report.',
  citation_density:
    'Inline citation links divided by body paragraphs (capped at 1.0). Signals whether claims throughout the report carry sources, not just a final References block.',
  source_diversity:
    'Distinct citation hostnames in the body, normalised against expected richness (≈1 distinct source per 150 words of prose). Penalises reports that re-cite the same 2–3 sources throughout.',
  data_specificity:
    'Count of concrete data points (currency amounts, percentages, year references, tickers) per ~200 words. Catches reports that read like prose essays instead of numbers-backed analysis.',
  plan_quality:
    'LLM judge (Sonnet 4.6) scoring the orchestrator\'s research plan 1–5 on whether the delegated tasks together cover the dimensions an institutional thematic report needs: market sizing, industry structure, key players, catalysts, risks, regulatory, investment implications.',
  research_quality:
    'LLM judge (Sonnet 4.6) scoring each researcher\'s YAML findings 1–5 on usefulness to a portfolio manager: specificity (numbers, tickers, named regulations), source quality (regulators > filings > sell-side > press > blogs), and balance (bull and bear views).',
}

const DETERMINISTIC = new Set([
  'structure_compliance',
  'citation_density',
  'source_diversity',
  'data_specificity',
])

function formatValue(score: Score): string {
  if (score.data_type === 'BOOLEAN') return score.value ? 'Pass' : 'Fail'
  const name = score.name
  if (name === 'plan_quality' || name === 'research_quality') {
    return `${score.value} / 5`
  }
  return score.value.toFixed(2)
}

function scoreTone(score: Score): string {
  if (score.data_type === 'BOOLEAN') {
    return score.value ? 'text-[var(--color-accent)]' : 'text-[var(--color-error)]'
  }
  const max = score.name === 'plan_quality' || score.name === 'research_quality' ? 5 : 1
  const ratio = score.value / max
  if (ratio >= 0.75) return 'text-[var(--color-accent)]'
  if (ratio >= 0.4) return 'text-[var(--color-foreground)]'
  return 'text-[var(--color-error)]'
}

function InfoPopover({ metricName, openId, setOpenId }: {
  metricName: string
  openId: string | null
  setOpenId: (id: string | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const open = openId === metricName
  const explanation = SCORE_EXPLANATIONS[metricName]

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpenId])

  if (!explanation) return null

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpenId(open ? null : metricName)}
        aria-label={`About ${SCORE_LABELS[metricName] ?? metricName}`}
        aria-expanded={open}
        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-accent)] transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-full mt-1.5 z-10 w-72 p-3 rounded-lg border bg-card shadow-lg text-xs leading-relaxed text-[var(--color-foreground)]"
        >
          {explanation}
        </div>
      )}
    </div>
  )
}

function ScoreCard({ score, openId, setOpenId }: {
  score: Score
  openId: string | null
  setOpenId: (id: string | null) => void
}) {
  const label = SCORE_LABELS[score.name] ?? score.name
  const kind = DETERMINISTIC.has(score.name) ? 'Deterministic' : 'LLM judge'
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
          <InfoPopover metricName={score.name} openId={openId} setOpenId={setOpenId} />
        </div>
        <span className={`text-lg font-semibold tabular-nums ${scoreTone(score)}`}>
          {formatValue(score)}
        </span>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mt-0.5">
        {kind}
      </p>
      {score.comment && (
        <p className="text-xs text-[var(--color-muted-foreground)] mt-2 leading-relaxed">
          {score.comment}
        </p>
      )}
    </div>
  )
}

interface ResearcherModalData {
  label: string
  score: Score
  researcher: ResearcherActivity | undefined
}

function ResearcherModal({ data, onClose }: {
  data: ResearcherModalData
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const { label, score, researcher } = data

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-xl shadow-xl w-full max-w-3xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b">
          <div className="flex items-baseline gap-3 min-w-0">
            <h2 className="text-base font-semibold tracking-tight">{label}</h2>
            <span className={`text-xl font-semibold tabular-nums ${scoreTone(score)}`}>
              {formatValue(score)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-5 text-sm">
          {researcher?.task && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
                Task (input to researcher)
              </h3>
              <p className="text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap">
                {researcher.task}
              </p>
            </section>
          )}

          {score.comment && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
                Judge comment
              </h3>
              <p className="text-[var(--color-foreground)] leading-relaxed">
                {score.comment}
              </p>
            </section>
          )}

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
              Returned YAML findings
            </h3>
            {researcher?.findings ? (
              <pre className="bg-[var(--color-secondary)] border rounded-lg p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
                {researcher.findings}
              </pre>
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)] italic">
                No findings were captured for this researcher.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export function MetricsView({ project }: MetricsViewProps) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null)
  const [researchers, setResearchers] = useState<ResearcherActivity[]>([])
  const [state, setState] = useState<'loading' | 'pending' | 'ready' | 'error'>('loading')
  const [openInfoId, setOpenInfoId] = useState<string | null>(null)
  const [modalData, setModalData] = useState<ResearcherModalData | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    async function load() {
      try {
        const [m, activity] = await Promise.all([
          fetchMetrics(project.id),
          fetchActivity(project.id).catch(() => null),
        ])
        if (cancelled) return
        if (activity) setResearchers(activity.researchers)
        if (m) {
          setMetrics(m)
          setState('ready')
        } else {
          setState('pending')
          timer = window.setTimeout(load, 3000)
        }
      } catch {
        if (!cancelled) setState('error')
      }
    }

    load()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [project.id])

  if (state === 'loading') {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Loading metrics…</p>
  }
  if (state === 'error') {
    return <p className="text-sm text-[var(--color-error)]">Failed to load metrics.</p>
  }
  if (state === 'pending' || !metrics) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Evaluators are still running. This page will refresh when scores are ready.
      </p>
    )
  }

  const researcherLookup = new Map(researchers.map((r, i) => [r.id, { r, i }]))

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-2">
          Report scores
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metrics.report_scores.map((s) => (
            <ScoreCard key={s.name} score={s} openId={openInfoId} setOpenId={setOpenInfoId} />
          ))}
        </div>
      </section>

      {metrics.researcher_scores.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Per-researcher scores
            </h2>
            <InfoPopover
              metricName="research_quality"
              openId={openInfoId}
              setOpenId={setOpenInfoId}
            />
          </div>
          <div className="space-y-2">
            {metrics.researcher_scores.map((s, idx) => {
              const entry = s.researcher_id ? researcherLookup.get(s.researcher_id) : undefined
              const label = entry
                ? `Researcher ${entry.i + 1}`
                : `Researcher ${idx + 1}`
              return (
                <button
                  key={`${s.researcher_id ?? 'x'}-${idx}`}
                  onClick={() =>
                    setModalData({ label, score: s, researcher: entry?.r })
                  }
                  className="w-full text-left bg-card border rounded-xl p-4 hover:border-[var(--color-accent)]/40 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
                    <span className={`text-lg font-semibold tabular-nums ${scoreTone(s)}`}>
                      {formatValue(s)}
                    </span>
                  </div>
                  {entry?.r.task && (
                    <div className="mb-2">
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
                        Task
                      </h4>
                      <p className="text-xs text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap">
                        {entry.r.task}
                      </p>
                    </div>
                  )}
                  {s.comment && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
                        Judge comment
                      </h4>
                      <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                        {s.comment}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-[var(--color-muted-foreground)]">
                    Click to view returned YAML findings
                  </p>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <p className="text-[10px] text-[var(--color-muted-foreground)]">
        Generated {new Date(metrics.generated_at).toLocaleString()}
        {metrics.trace_id && ' · also pushed to Langfuse'}
      </p>

      {modalData && (
        <ResearcherModal data={modalData} onClose={() => setModalData(null)} />
      )}
    </div>
  )
}
