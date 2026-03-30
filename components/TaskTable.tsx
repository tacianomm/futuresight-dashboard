'use client';

import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import type { SortState, SortKey } from '@/types';
import type { TaskWithStatus } from './TaskSection';

interface Props {
  tasks: TaskWithStatus[];
  onSort: (key: SortKey) => void;
  currentSort: SortState;
}

const PRIORITY_CLASSES: Record<string, string> = {
  Critical: 'p-critical',
  High:     'p-high',
  Medium:   'p-medium',
  Low:      'p-low',
};
const URGENCY_CLASSES: Record<string, string> = {
  Now:   'u-now',
  Soon:  'u-soon',
  Later: 'u-later',
};
const STATUS_CLASSES: Record<string, string> = {
  'To Do':       's-todo',
  'In Progress': 's-inprogress',
  'Blocked':     's-blocked',
  'Backlog':     's-backlog',
  'Completed':   's-completed',
};
const VENTURE_COLORS: Record<string, string> = {
  flowar:       'rgba(59,130,246,.15)',
  homeservices: 'rgba(34,197,94,.15)',
  legal:        'rgba(168,85,247,.15)',
  dental:       'rgba(249,115,22,.15)',
  voice:        'rgba(20,184,166,.15)',
  general:      'rgba(100,116,139,.15)',
};
const VENTURE_TEXT: Record<string, string> = {
  flowar:       '#3b82f6',
  homeservices: '#22c55e',
  legal:        '#a855f7',
  dental:       '#f97316',
  voice:        '#14b8a6',
  general:      '#64748b',
};
const EFFORT_COLORS = ['#6b7280', '#60a5fa', '#a78bfa', '#f59e0b', '#ef4444'];

export default function TaskTable({ tasks, onSort, currentSort }: Props) {
  const { db, googleTasks, toggleDone } = useDashboard(
    useShallow((s) => ({
      db:          s.db,
      googleTasks: s.googleTasks,
      toggleDone:  s.toggleDone,
    }))
  );

  if (tasks.length === 0) {
    return (
      <div className="table-wrap">
        <div className="empty">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--border)' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <h3>No tasks match your filters</h3>
          <p>Try adjusting the filters above</p>
        </div>
      </div>
    );
  }

  function Th({ col, label }: { col: SortKey; label: string }) {
    const sorted = currentSort.key === col;
    return (
      <th
        className={sorted ? 'sorted' : ''}
        onClick={() => onSort(col)}
      >
        {label}{' '}
        <span className="sort-arrow">{sorted ? (currentSort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </th>
    );
  }

  function getTaskKey(task: Task): string {
    return task.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function isDone(task: TaskWithStatus): boolean {
    return !!db.taskDone[getTaskKey(task)];
  }

  function handleCheck(task: TaskWithStatus, checked: boolean) {
    toggleDone(getTaskKey(task), checked, task.venture);
  }

  function effortDots(effort: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className="effort-dot"
        style={{
          background: i < effort ? EFFORT_COLORS[effort - 1] : 'var(--border)',
        }}
      />
    ));
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="check-col"></th>
            <Th col="venture"  label="Venture"  />
            <Th col="name"     label="Task"     />
            <Th col="category" label="Category" />
            <Th col="priority" label="Priority" />
            <Th col="urgency"  label="Urgency"  />
            <Th col="effort"   label="Effort"   />
            <Th col="status"   label="Status"   />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => {
            const done   = isDone(task);
            const status = task._resolvedStatus;
            const gKey   = task.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
            const inGoogle = !!googleTasks[gKey];

            return (
              <tr
                key={`${task.venture}-${idx}`}
                style={{ opacity: done ? 0.5 : 1 }}
              >
                {/* Checkbox */}
                <td>
                  <input
                    type="checkbox"
                    className="task-check"
                    checked={done}
                    onChange={e => handleCheck(task, e.target.checked)}
                    aria-label={task.name}
                  />
                </td>

                {/* Venture */}
                <td>
                  <span
                    className="venture-badge"
                    style={{
                      background: VENTURE_COLORS[task.venture] ?? 'rgba(99,102,241,.1)',
                      color:      VENTURE_TEXT[task.venture]   ?? '#818cf8',
                    }}
                  >
                    {task.ventureLabel}
                  </span>
                </td>

                {/* Task name + desc */}
                <td className="task-name-cell">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <div>
                      <div
                        className="task-title"
                        style={{ textDecoration: done ? 'line-through' : 'none' }}
                      >
                        {task.name}
                        {task.isNew && <span className="new-tag">NEW</span>}
                      </div>
                      {task.desc && (
                        <div className="task-desc">{task.desc}</div>
                      )}
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        <span className={`task-source-badge ${task.source}`}>
                          {task.source === 'otter'  ? 'O' :
                           task.source === 'google' ? 'G' : 'C'}
                        </span>
                        {inGoogle && task.source !== 'google' && (
                          <span className="task-source-badge google">G</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{task.category}</td>

                {/* Priority */}
                <td>
                  <span className={`priority-badge ${PRIORITY_CLASSES[task.priority] ?? ''}`}>
                    {task.priority}
                  </span>
                </td>

                {/* Urgency */}
                <td>
                  <span className={`urgency-badge ${URGENCY_CLASSES[task.urgency] ?? ''}`}>
                    {task.urgency}
                  </span>
                </td>

                {/* Effort */}
                <td>
                  <div className="effort-dots">
                    {effortDots(task.effort ?? 1)}
                  </div>
                </td>

                {/* Status */}
                <td>
                  <span className={`status-badge ${STATUS_CLASSES[status] ?? 's-todo'}`}>
                    {status === 'Completed' ? '✅ ' : ''}{status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
