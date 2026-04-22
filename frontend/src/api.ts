import type { ChatMessage, Project, ProjectActivity, ProjectMetrics } from './types'

const BASE = '/api'

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE}/projects`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

export async function createProject(query: string): Promise<Project> {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error('Failed to create project')
  return res.json()
}

export async function createRevision(parentId: string, refinement: string): Promise<Project> {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent_id: parentId, refinement }),
  })
  if (!res.ok) throw new Error('Failed to create revision')
  return res.json()
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/${projectId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete project')
}

export async function retryProject(projectId: string): Promise<Project> {
  const res = await fetch(`${BASE}/projects/${projectId}/retry`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to retry project')
  return res.json()
}

export async function fetchReport(projectId: string): Promise<string> {
  const res = await fetch(`${BASE}/projects/${projectId}/report`)
  if (!res.ok) throw new Error('Failed to fetch report')
  const data = await res.json()
  return data.report
}

export async function fetchActivity(projectId: string): Promise<ProjectActivity> {
  const res = await fetch(`${BASE}/projects/${projectId}/activity`)
  if (!res.ok) throw new Error('Failed to fetch activity')
  return res.json()
}

export async function fetchMetrics(projectId: string): Promise<ProjectMetrics | null> {
  const res = await fetch(`${BASE}/projects/${projectId}/metrics`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch metrics')
  return res.json()
}

export async function fetchChatHistory(projectId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE}/projects/${projectId}/chat`)
  if (!res.ok) throw new Error('Failed to fetch chat history')
  const data = await res.json()
  return data.messages ?? []
}

export async function sendChat(projectId: string, message: string): Promise<string> {
  const res = await fetch(`${BASE}/projects/${projectId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error('Failed to send message')
  const data = await res.json()
  return data.reply
}
