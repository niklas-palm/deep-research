import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { fetchProjects, createProject, deleteProject } from '../api'
import { NewProjectModal } from '../components/NewProjectModal'
import { Sidebar } from '../components/Sidebar'
import { TabBar } from '../components/TabBar'
import type { Project } from '../types'

const ReportView = lazy(() =>
  import('../components/ReportView').then((m) => ({ default: m.ReportView }))
)
const ProgressView = lazy(() =>
  import('../components/ProgressView').then((m) => ({ default: m.ProgressView }))
)
const ChatPane = lazy(() =>
  import('../components/ChatPane').then((m) => ({ default: m.ChatPane }))
)
const MetricsView = lazy(() =>
  import('../components/MetricsView').then((m) => ({ default: m.MetricsView }))
)

type View = 'report' | 'progress' | 'chat' | 'metrics'

const KNOWN_VIEWS: readonly View[] = ['report', 'progress', 'chat', 'metrics']

function parseHash(): { projectId: string | null; view: View } {
  const match = window.location.hash.match(/^#\/projects\/([^/]+)(?:\/([^/]+))?/)
  if (!match) return { projectId: null, view: 'progress' }
  const raw = match[2] as View | undefined
  return {
    projectId: match[1] ?? null,
    view: raw && KNOWN_VIEWS.includes(raw) ? raw : 'progress',
  }
}

function setHash(projectId: string | null, view: View) {
  if (!projectId) {
    if (window.location.hash) window.location.hash = ''
    return
  }
  const target = `#/projects/${projectId}/${view}`
  if (window.location.hash !== target) {
    window.location.hash = target
  }
}

function ContentSkeleton() {
  return (
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
  )
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [{ projectId, view }, setLocation] = useState(parseHash())

  useEffect(() => {
    const onHash = () => setLocation(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch {
      // Silently retry on next poll
    }
  }, [])

  useEffect(() => {
    loadProjects()
    const interval = setInterval(loadProjects, 3000)
    return () => clearInterval(interval)
  }, [loadProjects])

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  )

  const handleSelect = (project: Project) => {
    const nextView: View =
      project.status === 'completed' ? 'report' : 'progress'
    setHash(project.id, nextView)
  }

  const handleDelete = async (project: Project) => {
    await deleteProject(project.id)
    if (projectId === project.id) setHash(null, 'progress')
    loadProjects()
  }

  const handleCreate = async (query: string) => {
    setShowModal(false)
    const created = await createProject(query)
    setProjects((prev) =>
      prev.some((p) => p.id === created.id) ? prev : [created, ...prev]
    )
    setHash(created.id, 'progress')
  }

  const handleRevisionCreated = (newProject: Project) => {
    setProjects((prev) =>
      prev.some((p) => p.id === newProject.id) ? prev : [newProject, ...prev]
    )
    setHash(newProject.id, 'progress')
  }

  const handleProgressCompleted = useCallback(async () => {
    const data = await fetchProjects().catch(() => null)
    if (!data) return
    setProjects(data)
    // If the user was watching progress of the just-completed project,
    // auto-switch to the report view.
    const current = parseHash()
    if (!current.projectId) return
    const updated = data.find((p) => p.id === current.projectId)
    if (updated && updated.status === 'completed' && current.view === 'progress') {
      setHash(updated.id, 'report')
    }
  }, [])

  return (
    <div className="flex h-screen bg-[var(--color-background)]">
      <Sidebar
        projects={projects}
        selectedId={selectedProject?.id ?? null}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onNew={() => setShowModal(true)}
      />

      <main className="flex-1 overflow-y-auto">
        {!selectedProject ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Select a project from the left, or create a new one.
            </p>
          </div>
        ) : (
          <div className="max-w-[900px] mx-auto px-6 py-8">
            <div className="mb-4">
              <h1 className="text-lg font-semibold tracking-tight">
                {selectedProject.title}
              </h1>
              {selectedProject.parent_id && selectedProject.refinement ? (
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Revision · focus: {selectedProject.refinement}
                </p>
              ) : (
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  {selectedProject.query}
                </p>
              )}
            </div>

            <TabBar
              view={view}
              isCompleted={selectedProject.status === 'completed'}
              onChange={(v) => setHash(selectedProject.id, v)}
            />

            <div className="mt-5">
              <Suspense fallback={<ContentSkeleton />}>
                {view === 'report' && (
                  <ReportView
                    project={selectedProject}
                    onRevisionCreated={handleRevisionCreated}
                  />
                )}
                {view === 'progress' && (
                  <ProgressView
                    project={selectedProject}
                    onCompleted={handleProgressCompleted}
                    onRetry={loadProjects}
                  />
                )}
                {view === 'chat' && <ChatPane project={selectedProject} />}
                {view === 'metrics' && <MetricsView project={selectedProject} />}
              </Suspense>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}
