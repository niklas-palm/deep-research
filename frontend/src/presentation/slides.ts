import type { DiagramSlide, SlideDef } from 'unfold-ai'
import { carry } from 'unfold-ai'

// ============================================================
// Layout Strategy
//
// Pre-compact (slides 1-3): large nodes, progressive intro
//   Slide 1: [User] + [Frontend]
//   Slide 2: adds [Backend]
//   Slide 3: adds [Orchestrator]
//
// Post-compact (slide 4+): h:48 nodes, four rows
//   Row 0 (y:55):   [User]         [Frontend]
//   Row 1 (y:185):  [Backend API]  [Disk Store]
//   Row 2 (y:315):  [Orchestrator] [Researcher]
//   Row 3 (y:445):  [SearXNG]      [Jina Reader]
//
// Columns: col A (x:60, w:180) → right edge 240
//          col B (x:340, w:180) → left edge 340, right edge 520
//          100px horizontal gap fits arrow labels without clipping
//
// After the compact transition, nodes stay fixed.
// Only arrows, annotations, and focus change per slide.
// Right panel (x:580+) reserved for annotations.
// ============================================================

const slide0: SlideDef = {
  type: 'title',
  title: 'How Deep Research Works',
  subtitle: 'An orchestrator–researcher pipeline on Strands + AWS Bedrock',
  hint: 'Use arrow keys to navigate',
}

// --- Slide 1: the user and the UI ---
const slide1: DiagramSlide = {
  type: 'diagram',
  heading: 'You ask a question',
  subheading: 'A React dashboard captures the research query',
  nodes: [
    { id: 'user', label: 'You', sub: 'Researcher or analyst', x: 100, y: 200, w: 190, h: 75, color: 'sage' },
    { id: 'frontend', label: 'React Dashboard', sub: 'Vite · Tailwind', x: 460, y: 200, w: 220, h: 75, color: 'sea' },
  ],
  arrows: [
    { from: 'user', to: 'frontend', label: 'query' },
  ],
  annotations: [
    {
      type: 'text-block', x: 100, y: 320, w: 580,
      text: 'Research queries are broad and open-ended: _"How is agentic AI being adopted across industries in 2026?"_. The UI keeps it simple — one query, one click. The project title is inferred from the query automatically.',
    },
  ],
}

// --- Slide 2: the backend receives the job ---
const slide2 = carry(slide1, {
  heading: 'The backend spawns a background job',
  subheading: 'FastAPI accepts the request and kicks off an async task',
  nodes: [
    { id: 'user', label: 'You', sub: '', x: 100, y: 120, w: 180, h: 70, color: 'sage' },
    { id: 'frontend', label: 'React Dashboard', sub: '', x: 440, y: 120, w: 210, h: 70, color: 'sea' },
    { id: 'backend', label: 'Backend API', sub: 'FastAPI · Python 3.12', x: 250, y: 330, w: 250, h: 75, color: 'sand' },
  ],
  arrows: [
    { from: 'user', to: 'frontend', label: 'query' },
    { from: 'frontend', to: 'backend', label: 'POST /projects' },
  ],
  annotations: [
    {
      type: 'text-block', x: 600, y: 200, w: 290,
      text: 'Before the orchestrator starts, a fast Sonnet call turns the query into a **3–5 word title** so the sidebar stays readable.',
    },
    {
      type: 'text-block', x: 600, y: 340, w: 290,
      text: 'The endpoint returns immediately with a project id. The real work runs as an `asyncio.create_task` — the frontend polls `/projects` and `/activity` to follow along.',
    },
  ],
})

// --- Slide 3: introduce the orchestrator ---
const slide3 = carry(slide2, {
  heading: 'An orchestrator takes over',
  subheading: 'Claude Opus 4.6 runs as a Strands agent with its own toolbelt',
  nodes: [
    { id: 'user', label: 'You', sub: '', x: 60, y: 60, w: 140, h: 55, color: 'sage' },
    { id: 'frontend', label: 'React Dashboard', sub: '', x: 280, y: 60, w: 200, h: 55, color: 'sea' },
    { id: 'backend', label: 'Backend API', sub: 'FastAPI', x: 160, y: 200, w: 230, h: 60, color: 'sand' },
    { id: 'orchestrator', label: 'Orchestrator', sub: 'Claude Opus 4.6', x: 180, y: 360, w: 260, h: 80, color: 'warm' },
  ],
  arrows: [
    { from: 'user', to: 'frontend' },
    { from: 'frontend', to: 'backend', label: 'POST /projects' },
    { from: 'backend', to: 'orchestrator', label: 'run(query)' },
  ],
  annotations: [
    {
      type: 'numbered-list', x: 560, y: 200, color: 'warm',
      items: [
        { title: 'Orient', detail: '2-4 web searches to map the landscape' },
        { title: 'Plan', detail: '3-7 complementary research themes' },
        { title: 'Delegate', detail: 'One researcher per theme, in parallel' },
        { title: 'Gap analysis', detail: 'Spot what the reader would still need' },
        { title: 'Synthesize', detail: 'Weave findings into one report' },
      ],
    },
  ],
})

// --- Slide 4: COMPACT TRANSITION — reveal the full system ---
const slide4 = carry(slide3, {
  heading: 'The full system',
  subheading: 'Disk-backed state, researcher fan-out, and web tools',
  nodes: [
    // Compact the existing four
    { id: 'user', label: 'You', sub: '', x: 60, y: 55, w: 180, h: 48, color: 'sage' },
    { id: 'frontend', label: 'React Dashboard', sub: '', x: 340, y: 55, w: 180, h: 48, color: 'sea' },
    { id: 'backend', label: 'Backend API', sub: 'FastAPI', x: 60, y: 185, w: 180, h: 48, color: 'sand' },
    { id: 'orchestrator', label: 'Orchestrator', sub: 'Opus 4.6', x: 60, y: 315, w: 180, h: 48, color: 'warm' },
    // New nodes
    { id: 'disk', label: 'Disk Store', sub: 'data/projects/', x: 340, y: 185, w: 180, h: 48, color: 'slate' },
    { id: 'researcher', label: 'Researcher', sub: 'Haiku 4.5', x: 340, y: 315, w: 180, h: 48, color: 'mist' },
    { id: 'searxng', label: 'SearXNG', sub: 'metasearch', x: 60, y: 445, w: 180, h: 48, color: 'stone' },
    { id: 'jina', label: 'Jina Reader', sub: 'r.jina.ai', x: 340, y: 445, w: 180, h: 48, color: 'sky' },
  ],
  arrows: [
    { from: 'user', to: 'frontend' },
    { from: 'frontend', to: 'backend', label: 'REST' },
    { from: 'backend', to: 'orchestrator', label: 'run' },
    { from: 'backend', to: 'disk', label: 'metadata' },
    { from: 'orchestrator', to: 'researcher', label: 'delegate' },
    { from: 'researcher', to: 'searxng', label: 'search' },
    { from: 'researcher', to: 'jina', label: 'fetch' },
  ],
  annotations: [
    {
      type: 'text-block', x: 580, y: 80, w: 300,
      text: 'The orchestrator only calls researchers and (for orientation) web tools directly. Researchers do the heavy lifting.',
    },
    {
      type: 'text-block', x: 580, y: 220, w: 300,
      text: 'All state lives on disk: `metadata.json`, `activity.json`, `report.md`. No database, no queue — just the filesystem and atomic rename.',
    },
  ],
})

// --- Slide 5: researcher fan-out ---
const slide5 = carry(slide4, {
  heading: 'Researchers run in parallel',
  subheading: 'Each theme becomes its own Haiku 4.5 agent with a private tool loop',
  arrows: [
    { from: 'user', to: 'frontend' },
    { from: 'frontend', to: 'backend' },
    { from: 'backend', to: 'orchestrator' },
    { from: 'orchestrator', to: 'researcher', label: 'researcher(task)', color: 'warm' },
    { from: 'researcher', to: 'searxng', label: 'web_search' },
    { from: 'researcher', to: 'jina', label: 'web_fetch' },
  ],
  annotations: [
    {
      type: 'card-list', x: 580, y: 80, direction: 'column',
      cards: [
        { label: '3-7 initial researchers', detail: 'Launched concurrently from the orchestrator', borderColor: 'mist' },
        { label: '1-2 gap-fill researchers', detail: 'Dispatched after reviewing the first wave', borderColor: 'mist' },
        { label: 'Returns YAML', detail: 'Findings, sources, and key quotes — structured', borderColor: 'mist' },
      ],
    },
  ],
})

// --- Slide 6: live activity stream ---
const slide6 = carry(slide5, {
  heading: 'Every tool call streams live',
  subheading: 'Strands\' async event stream becomes the source of truth for UI progress',
  arrows: [
    { from: 'user', to: 'frontend' },
    { from: 'frontend', to: 'backend', label: 'GET /activity', dashed: true, color: 'sea' },
    { from: 'backend', to: 'disk', label: 'read', dashed: true, color: 'slate' },
    { from: 'backend', to: 'orchestrator' },
    { from: 'orchestrator', to: 'researcher' },
    { from: 'researcher', to: 'disk', label: 'upsert tool_use', color: 'mist' },
    { from: 'researcher', to: 'searxng' },
    { from: 'researcher', to: 'jina' },
  ],
  annotations: [
    {
      type: 'text-block', x: 580, y: 80, w: 300,
      text: 'Each researcher parses `agent.stream_async(...)` and writes a tool_use entry to disk on the fly. The UI polls every 2s and rebuilds the tree.',
    },
  ],
})

// --- Slide 7: gap analysis ---
const slide7 = carry(slide6, {
  heading: 'Gap analysis',
  subheading: 'Once the first wave returns, the orchestrator asks: what\'s missing?',
  arrows: [
    { from: 'backend', to: 'orchestrator' },
    { from: 'orchestrator', to: 'researcher', label: 'follow-up', color: 'blush' },
    { from: 'researcher', to: 'searxng' },
    { from: 'researcher', to: 'jina' },
    { from: 'researcher', to: 'disk' },
  ],
  annotations: [
    {
      type: 'card-list', x: 580, y: 80, direction: 'column',
      cards: [
        { label: 'Regulation', detail: 'Applicable rules, standards, guidance', borderColor: 'blush' },
        { label: 'Risk & trade-offs', detail: 'Failure modes, limits, unknowns', borderColor: 'blush' },
        { label: 'Competition', detail: 'What peers or alternatives have shipped', borderColor: 'blush' },
        { label: 'Impact', detail: 'Cost, ROI, organisational shifts', borderColor: 'blush' },
      ],
    },
  ],
})

// --- Slide 8: synthesis ---
const slide8 = carry(slide7, {
  heading: 'Synthesis into a single report',
  subheading: 'The orchestrator weaves researcher YAML into one markdown document',
  arrows: [
    { from: 'orchestrator', to: 'disk', label: 'report.md', color: 'warm' },
    { from: 'backend', to: 'disk', label: 'status=completed', dashed: true },
    { from: 'frontend', to: 'backend', label: 'GET /report', dashed: true, color: 'sea' },
  ],
  annotations: [
    {
      type: 'text-block', x: 580, y: 80, w: 300,
      text: 'Not concatenation — the orchestrator integrates findings, highlights where sources agree and diverge, and cites every claim inline with `[Title](url)`.',
    },
    {
      type: 'chip-list', x: 580, y: 230, color: 'warm',
      chips: ['Executive summary', 'Sections', 'References'],
    },
  ],
})

// --- Slide 9: failure modes ---
const slide9 = carry(slide8, {
  heading: 'When the web pushes back',
  subheading: 'Jina Reader rate-limits, and we surface it on the UI',
  arrows: [
    { from: 'orchestrator', to: 'researcher' },
    { from: 'researcher', to: 'searxng', label: 'ok' },
    { from: 'researcher', to: 'jina', label: '429', color: 'clay' },
    { from: 'researcher', to: 'disk', label: 'rate_limited++', color: 'clay' },
  ],
  annotations: [
    {
      type: 'status', x: 580, y: 80, variant: 'error',
      title: 'Jina 429 — content quality degraded',
      detail: 'Falls back to SearXNG snippets when full-page fetches fail.',
    },
    {
      type: 'text-block', x: 580, y: 240, w: 300,
      text: 'The `web_fetch` tool reads the active researcher from a `ContextVar` and increments the rate-limited counter. The UI shows a warning badge on that researcher\'s card.',
    },
  ],
})

// --- Slide 10: everything at once ---
const slide10 = carry(slide9, {
  heading: 'Everything at once',
  subheading: 'The full pipeline, from query to cited report',
  arrows: [
    { from: 'user', to: 'frontend' },
    { from: 'frontend', to: 'backend', label: 'REST' },
    { from: 'backend', to: 'orchestrator', label: 'run' },
    { from: 'backend', to: 'disk' },
    { from: 'orchestrator', to: 'researcher', label: 'delegate' },
    { from: 'researcher', to: 'disk', label: 'activity' },
    { from: 'researcher', to: 'searxng', label: 'search' },
    { from: 'researcher', to: 'jina', label: 'fetch' },
  ],
  annotations: [],
})

const slide11: SlideDef = {
  type: 'list',
  eyebrow: 'Takeaways',
  heading: 'What makes this tick',
  items: [
    { title: 'Right model for each job', desc: 'Opus 4.6 plans and synthesizes; Haiku 4.5 does the deep research; Sonnet 4.6 handles titles and judge evaluations.' },
    { title: 'Async tool fan-out', desc: 'Researchers are async `@tool` functions — Strands runs them concurrently so the first wave overlaps.' },
    { title: 'Stream as source of truth', desc: '`agent.stream_async` publishes every tool_use straight to disk; the UI just polls a file.' },
    { title: 'Disk-backed state', desc: 'No database. `metadata.json`, `activity.json`, `report.md` with atomic writes — easy to inspect, easy to delete.' },
    { title: 'Reader-shaped prompting', desc: 'A gap-analysis pass forces the orchestrator to think like the report\'s reader before it writes.' },
    { title: 'Degrades, not fails', desc: 'When Jina rate-limits, researchers fall back to snippets and the UI tells you quality dropped.' },
  ],
}

export const slides: SlideDef[] = [
  slide0, slide1, slide2, slide3, slide4,
  slide5, slide6, slide7, slide8, slide9,
  slide10, slide11,
]
