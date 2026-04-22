export type ProjectStatus =
  | 'pending'
  | 'planning'
  | 'researching'
  | 'synthesizing'
  | 'completed'
  | 'error'

export interface Project {
  id: string
  title: string
  query: string
  status: ProjectStatus
  created_at: string
  completed_at: string | null
  error: string | null
  parent_id: string | null
  refinement: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ToolUseEntry {
  tool_use_id: string
  name: string
  input_preview: string
  ts: string
}

export interface ResearcherActivity {
  id: string
  task: string
  status: 'running' | 'completed' | 'interrupted'
  started_at: string
  completed_at?: string
  tools: ToolUseEntry[]
  rate_limited?: number
  findings?: string
  span_id?: string
}

export interface ProjectActivity {
  status: ProjectStatus
  error: string | null
  researchers: ResearcherActivity[]
  orchestrator_events: ToolUseEntry[]
}

export interface Score {
  name: string
  value: number
  data_type: 'BOOLEAN' | 'NUMERIC'
  comment: string
  observation_id: string | null
  researcher_id: string | null
}

export interface ProjectMetrics {
  trace_id: string | null
  generated_at: string
  report_scores: Score[]
  researcher_scores: Score[]
}
