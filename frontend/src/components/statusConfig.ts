import type { LucideProps } from 'lucide-react'
import { Clock, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import type { ProjectStatus } from '../types'

export interface StatusConfigEntry {
  label: string
  color: string
  Icon: React.ComponentType<LucideProps>
}

export const STATUS_CONFIG: Record<ProjectStatus, StatusConfigEntry> = {
  pending: { label: 'Pending', color: 'var(--color-warning)', Icon: Clock },
  planning: { label: 'Planning', color: 'var(--color-accent)', Icon: Loader2 },
  researching: { label: 'Researching', color: 'var(--color-accent)', Icon: Loader2 },
  synthesizing: { label: 'Synthesizing', color: 'var(--color-accent)', Icon: Sparkles },
  completed: { label: 'Completed', color: 'var(--color-success)', Icon: CheckCircle2 },
  error: { label: 'Error', color: 'var(--color-error)', Icon: AlertCircle },
}

export const ACTIVE_STATUSES: ProjectStatus[] = ['planning', 'researching', 'synthesizing']
