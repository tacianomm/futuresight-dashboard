'use client';

import { useMemo } from 'react';
import { useDashboard, resolveTaskStatus } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import TaskTable from './TaskTable';
import KanbanBoard from './KanbanBoard';
import type { Task, SortKey, SortDir } from '@/types';

// Local extended type — not a global augmentation
export type TaskWithStatus = Task & { _resolvedStatus: string };

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const URGENCY_ORDER:  Record<string, number>  = { Now: 0, Soon: 1, Later: 2 };

export default function TaskSection() {
  const { db, googleTasks, view, filters, sort, activeVenture, setFilter, setSort, setView } =
    useDashboard(
      useShallow((s) => ({
        db:            s.db,
        googleTasks:   s.googleTasks,
        view:          s.view,
        filters:       s.filters,
        sort:          s.sort,
        activeVenture: s.activeVenture,
        setFilter:     s.setFilter,
        setSort:       s.setSort,
        setView:       s.setView,
      }))
    );

  const allTasks: Task[] = db.tasks ?? [];

  const tasks = useMemo(() => {
    // Filter to active venture if one is selected
    let result = activeVenture
      ? allTasks.filter(t => t.venture === activeVenture)
      : [...allTasks];

    // Apply filters
    const q = filters.search.toLowerCase();
    if (q) result = result.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.desc ?? '').toLowerCase().includes(q)
    );
    if (filters.priority !== 'all') result = result.filter(t => t.priority === filters.priority);
    if (filters.urgency  !== 'all') result = result.filter(t => t.urgency  === filters.urgency);
    if (filters.category !== 'all') result = result.filter(t => t.category === filters.category);

    // Resolve status for each task
    const withStatus: TaskWithStatus[] = result.map(t => ({
      ...t,
      _resolvedStatus: resolveTaskStatus(t, db.taskDone, googleTasks),
    }));

    // Status filter
    let filtered = withStatus;
    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t._resolvedStatus === filters.status);
    }
    if (!filters.showCompleted) {
      filtered = filtered.filter(t => t._resolvedStatus !== 'Completed');
    }

    // Sort
    filtered.sort((a, b) => {
      const dir: SortDir = sort.dir;
      const mult = dir === 'asc' ? 1 : -1;
      switch (sort.key as SortKey) {
        case 'venture':  return mult * a.venture.localeCompare(b.venture);
        case 'name':     return mult * a.name.localeCompare(b.name);
        case 'category': return mult * (a.category ?? '').localeCompare(b.category ?? '');
        case 'priority': return mult * ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
        case 'urgency':  return mult * ((URGENCY_ORDER[a.urgency]   ?? 9) - (URGENCY_ORDER[b.urgency]   ?? 9));
        case 'effort':   return mult * ((a.effort ?? 0) - (b.effort ?? 0));
        case 'status':   return mult * a._resolvedStatus.localeCompare(b._resolvedStatus);
        default: return 0;
      }
    });

    return filtered;
  }, [allTasks, filters, sort, db.taskDone, googleTasks]);

  const criticalCount = tasks.filter(t => t.priority === 'Critical' && t._resolvedStatus !== 'Completed').length;

  return (
    <>
      {/* Tasks section header */}
      <div className="tasks-section-header">
        <span className="tasks-section-title">📋 Tasks</span>
        <div className="tasks-legend">
          <span><span className="new-tag">NEW</span> New this week</span>
          <span><span className="task-source-badge claude">C</span> Claude</span>
          <span><span className="task-source-badge otter">O</span> Otter.ai</span>
          <span><span className="task-source-badge google">G</span> Google Tasks</span>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="search-wrap">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search tasks…"
            value={filters.search}
            onChange={e => setFilter({ search: e.target.value })}
          />
        </div>

        <select value={filters.priority} onChange={e => setFilter({ priority: e.target.value })}>
          <option value="all">All Priorities</option>
          <option value="Critical">🔴 Critical</option>
          <option value="High">🟠 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">⚪ Low</option>
        </select>

        <select value={filters.urgency} onChange={e => setFilter({ urgency: e.target.value })}>
          <option value="all">All Urgency</option>
          <option value="Now">🔴 Now</option>
          <option value="Soon">🟡 Soon</option>
          <option value="Later">🔵 Later</option>
        </select>

        <select value={filters.category} onChange={e => setFilter({ category: e.target.value })}>
          <option value="all">All Categories</option>
          <option value="Product">Product</option>
          <option value="GTM/Sales">GTM / Sales</option>
          <option value="Research">Research</option>
          <option value="Operations">Operations</option>
          <option value="Engineering">Engineering</option>
          <option value="Strategy">Strategy</option>
        </select>

        <select value={filters.status} onChange={e => setFilter({ status: e.target.value })}>
          <option value="all">All Statuses</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Backlog">Backlog</option>
          <option value="Completed">✅ Completed</option>
        </select>

        <div className="divider" />

        <label className="completed-toggle">
          <input
            type="checkbox"
            checked={filters.showCompleted}
            onChange={e => setFilter({ showCompleted: e.target.checked })}
          />
          Show completed
        </label>

        <div className="view-toggle">
          <button
            className={`view-btn ${view === 'table' ? 'active' : ''}`}
            onClick={() => setView('table')}
          >☰ Table</button>
          <button
            className={`view-btn ${view === 'kanban' ? 'active' : ''}`}
            onClick={() => setView('kanban')}
          >▦ Board</button>
        </div>
      </div>

      {/* Results bar */}
      <div className="results-bar">
        <span><strong>{tasks.length}</strong> tasks</span>
        {criticalCount > 0 && (
          <span style={{ color: 'var(--critical)' }}>
            {criticalCount} critical
          </span>
        )}
      </div>

      {/* Table or Kanban */}
      {view === 'table' ? (
        <TaskTable tasks={tasks} onSort={setSort} currentSort={sort} />
      ) : (
        <KanbanBoard tasks={tasks} />
      )}
    </>
  );
}

