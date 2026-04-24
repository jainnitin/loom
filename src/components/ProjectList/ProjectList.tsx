import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Search as SearchIcon,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { hueForProject } from '@/utils/projectHue'
import type { Project } from '@/types'

interface ProjectListProps {
  searchQuery?: string
}

const ACTIVE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000

type BucketKey = 'pinned' | 'active' | 'all'

export const ProjectList: React.FC<ProjectListProps> = ({ searchQuery = '' }) => {
  const {
    projects,
    sessionsByProject,
    pinnedProjects,
    expandedBuckets,
    selectedProjectPath,
    pinnedOrder,
    togglePinnedProject,
    reorderPinnedProject,
    toggleBucketExpanded,
    selectProject,
    setSessions,
    setSessionsForProject,
    createProjectTab,
    preloadAllSessions,
  } = useAppStore()

  const q = searchQuery.trim().toLowerCase()
  const isSearching = q.length > 0
  const hasTriggeredPreload = useRef(false)

  // Drag-to-pin state
  const [draggingProject, setDraggingProject] = useState<string | null>(null)
  const [dragOverBucket, setDragOverBucket] = useState<BucketKey | null>(null)
  // Where to drop when reordering inside Pinned: before this project name, or null = end
  const [dropBeforeName, setDropBeforeName] = useState<string | null>(null)
  const [showEndMarker, setShowEndMarker] = useState(false)

  const handleProjectDragStart = (e: React.DragEvent, project: Project) => {
    e.dataTransfer.setData('text/x-loom-project', project.name)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingProject(project.name)
  }

  const handleProjectDragEnd = () => {
    setDraggingProject(null)
    setDragOverBucket(null)
    setDropBeforeName(null)
    setShowEndMarker(false)
  }

  // Per-row drag-over handler used only for reordering within Pinned.
  // Splits the row into top-half (drop before this row) and bottom-half (drop after),
  // tracks the target, and suppresses the bucket-level drop handler when active.
  const handlePinnedRowDragOver = (e: React.DragEvent, project: Project, isLast: boolean) => {
    if (!draggingProject) return
    if (!pinnedProjects[draggingProject]) return  // Cross-bucket drops handled at bucket level
    if (project.name === draggingProject) return  // No-op on self
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const isTopHalf = e.clientY < rect.top + rect.height / 2
    if (isTopHalf) {
      setDropBeforeName(project.name)
      setShowEndMarker(false)
    } else if (isLast) {
      setDropBeforeName(null)
      setShowEndMarker(true)
    } else {
      // Bottom half of a non-last row = drop before the next pinned project
      const idx = pinnedOrder.indexOf(project.name)
      const next = pinnedOrder[idx + 1]
      setDropBeforeName(next || null)
      setShowEndMarker(!next)
    }
    if (dragOverBucket !== null) setDragOverBucket(null)
  }

  const handlePinnedRowDrop = (e: React.DragEvent) => {
    if (!draggingProject) return
    if (!pinnedProjects[draggingProject]) return
    e.preventDefault()
    e.stopPropagation()
    reorderPinnedProject(draggingProject, dropBeforeName)
    setDraggingProject(null)
    setDragOverBucket(null)
    setDropBeforeName(null)
    setShowEndMarker(false)
  }

  const handleBucketDragOver = (e: React.DragEvent, bucket: BucketKey) => {
    if (!draggingProject) return
    const isPinned = !!pinnedProjects[draggingProject]
    // Only show drop affordance when the drop would change something
    if ((bucket === 'pinned' && !isPinned) || (bucket !== 'pinned' && isPinned)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (dragOverBucket !== bucket) setDragOverBucket(bucket)
    }
  }

  const handleBucketDragLeave = (bucket: BucketKey) => {
    if (dragOverBucket === bucket) setDragOverBucket(null)
  }

  const handleBucketDrop = (e: React.DragEvent, bucket: BucketKey) => {
    const name = e.dataTransfer.getData('text/x-loom-project') || draggingProject
    if (!name) return
    e.preventDefault()
    const isPinned = !!pinnedProjects[name]
    if (bucket === 'pinned' && !isPinned) togglePinnedProject(name)
    else if (bucket !== 'pinned' && isPinned) togglePinnedProject(name)
    setDraggingProject(null)
    setDragOverBucket(null)
  }

  // On first non-empty keystroke, fire off a background load of all sessions so
  // search can match custom titles even in unexpanded projects.
  useEffect(() => {
    if (isSearching && !hasTriggeredPreload.current) {
      hasTriggeredPreload.current = true
      preloadAllSessions()
    }
  }, [isSearching, preloadAllSessions])

  const handleProjectClick = async (project: Project) => {
    selectProject(project.name)
    try {
      const sessions = await window.api.getSessions(project.path)
      setSessions(sessions)
      setSessionsForProject(project.name, sessions)
      createProjectTab(project.name)
    } catch (error: any) {
      console.error('[ProjectList] Failed to load sessions for project:', project.name, error?.message)
      setSessions([])
      setSessionsForProject(project.name, [])
    }
  }

  // ---------------------------------------------------------------------
  // Bucket + search partitioning
  // ---------------------------------------------------------------------
  const { buckets, searchMatches } = useMemo(() => {
    const now = Date.now()

    const projectMatchesQuery = (p: Project): boolean => {
      if (p.name.toLowerCase().includes(q)) return true
      const sessions = sessionsByProject[p.name] || []
      return sessions.some((s) =>
        (s.customTitle || '').toLowerCase().includes(q) ||
        (s.firstUserMessage || '').toLowerCase().includes(q) ||
        (s.preview || '').toLowerCase().includes(q),
      )
    }

    if (isSearching) {
      const matches = projects.filter(projectMatchesQuery)
      return { buckets: null as null | Record<BucketKey, Project[]>, searchMatches: matches }
    }

    const pinned: Project[] = []
    const active: Project[] = []
    const rest: Project[] = []
    for (const p of projects) {
      if (pinnedProjects[p.name]) {
        pinned.push(p)
        continue
      }
      const t = p.lastActivity ? new Date(p.lastActivity).getTime() : 0
      if (t && now - t <= ACTIVE_THRESHOLD_MS) active.push(p)
      else rest.push(p)
    }
    const byActivityDesc = (a: Project, b: Project) => {
      const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
      const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
      return tb - ta
    }
    // Pinned uses user-defined order first; anything not in the order falls back
    // to activity-desc and is appended after the explicitly-ordered projects.
    pinned.sort((a, b) => {
      const ia = pinnedOrder.indexOf(a.name)
      const ib = pinnedOrder.indexOf(b.name)
      if (ia >= 0 && ib >= 0) return ia - ib
      if (ia >= 0) return -1
      if (ib >= 0) return 1
      return byActivityDesc(a, b)
    })
    active.sort(byActivityDesc)
    rest.sort(byActivityDesc)
    return { buckets: { pinned, active, all: rest }, searchMatches: [] as Project[] }
  }, [projects, pinnedProjects, pinnedOrder, sessionsByProject, q, isSearching])

  // ---------------------------------------------------------------------
  // Row renderers
  // ---------------------------------------------------------------------
  const renderProject = (
    project: Project,
    opts?: { reorderable?: boolean; isLast?: boolean },
  ) => {
    const reorderable = !!opts?.reorderable
    const showDropBefore = reorderable && dropBeforeName === project.name && draggingProject && draggingProject !== project.name
    const isSelected = selectedProjectPath === project.name
    const displayName = project.name.split('/').pop() || project.name
    const isDragging = draggingProject === project.name
    const hue = hueForProject(displayName)

    return (
      <div
        key={project.path}
        className={`tree-project${isDragging ? ' is-dragging' : ''}${showDropBefore ? ' drop-before' : ''}`}
      >
        <div
          onClick={() => handleProjectClick(project)}
          className={`tree-row tree-project-row${isSelected ? ' is-selected' : ''}`}
          title={project.name}
          style={{ ['--tag-hue' as any]: hue }}
          draggable
          onDragStart={(e) => handleProjectDragStart(e, project)}
          onDragEnd={handleProjectDragEnd}
          onDragOver={reorderable ? (e) => handlePinnedRowDragOver(e, project, !!opts?.isLast) : undefined}
          onDrop={reorderable ? handlePinnedRowDrop : undefined}
        >
          <span className="tree-project-name">{displayName}</span>

          <span className="tree-count-badge" title={`${project.sessionCount} sessions`}>
            {project.sessionCount}
          </span>
        </div>
      </div>
    )
  }

  const renderBucketHeader = (key: BucketKey, label: string, count: number) => {
    if (count === 0 && key !== 'pinned') {
      return null
    }
    const isExpanded = expandedBuckets[key]
    return (
      <button
        key={`${key}-header`}
        className={`tree-bucket-header${isExpanded ? ' is-expanded' : ''}`}
        onClick={() => toggleBucketExpanded(key)}
        aria-expanded={isExpanded}
      >
        <span className="tree-bucket-label">{label}</span>
        <span className="tree-bucket-chevron-quiet" aria-hidden="true">
          {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
      </button>
    )
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  if (isSearching) {
    // Flat search mode — no buckets, auto-expand every match
    if (searchMatches.length === 0) {
      return (
        <div className="sidebar-tree">
          <div className="tree-empty">
            <SearchIcon size={14} style={{ opacity: 0.5 }} />
            <div>No matches for "{searchQuery}"</div>
          </div>
        </div>
      )
    }
    return (
      <div className="sidebar-tree">
        <div className="tree-search-summary">
          <SearchIcon size={11} />
          <span>{searchMatches.length} {searchMatches.length === 1 ? 'match' : 'matches'}</span>
        </div>
        {searchMatches.map((p) => renderProject(p))}
      </div>
    )
  }

  // Normal mode — three buckets
  const pinnedCount = buckets!.pinned.length
  const activeCount = buckets!.active.length
  const allCount = buckets!.all.length

  if (projects.length === 0) {
    return <div className="sidebar-tree"><div className="tree-empty">No projects found</div></div>
  }

  return (
    <div className="sidebar-tree">
      {/* Pinned always renders — when empty, it shows a quiet drop-here hint
          so users can discover that drag is the way to pin. */}
      <div
        className={`tree-bucket${dragOverBucket === 'pinned' ? ' is-drop-target' : ''}`}
        onDragOver={(e) => handleBucketDragOver(e, 'pinned')}
        onDragLeave={() => handleBucketDragLeave('pinned')}
        onDrop={(e) => handleBucketDrop(e, 'pinned')}
      >
        {renderBucketHeader('pinned', 'Pinned', pinnedCount)}
        {expandedBuckets.pinned && buckets!.pinned.map((p, i) =>
          renderProject(p, { reorderable: true, isLast: i === buckets!.pinned.length - 1 }),
        )}
        {expandedBuckets.pinned && showEndMarker && draggingProject && pinnedProjects[draggingProject] && (
          <div className="tree-drop-end" />
        )}
        {expandedBuckets.pinned && pinnedCount === 0 && (
          <div className="tree-empty-hint">
            Drag a project here to pin
          </div>
        )}
      </div>

      <div
        className={`tree-bucket${dragOverBucket === 'active' ? ' is-drop-target' : ''}`}
        onDragOver={(e) => handleBucketDragOver(e, 'active')}
        onDragLeave={() => handleBucketDragLeave('active')}
        onDrop={(e) => handleBucketDrop(e, 'active')}
      >
        {renderBucketHeader('active', 'Recents', activeCount)}
        {expandedBuckets.active && buckets!.active.map((p) => renderProject(p))}
        {activeCount === 0 && expandedBuckets.active && (
          <div className="tree-empty-hint">Nothing touched in the last 14 days</div>
        )}
      </div>

      {allCount > 0 && (
        <div
          className={`tree-bucket${dragOverBucket === 'all' ? ' is-drop-target' : ''}`}
          onDragOver={(e) => handleBucketDragOver(e, 'all')}
          onDragLeave={() => handleBucketDragLeave('all')}
          onDrop={(e) => handleBucketDrop(e, 'all')}
        >
          {renderBucketHeader('all', 'All', allCount)}
          {expandedBuckets.all && buckets!.all.map((p) => renderProject(p))}
        </div>
      )}
    </div>
  )
}
