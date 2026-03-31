'use client';

import { useState } from 'react';
import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import type { SortState, SortKey } from '@/types';
import type { TaskWithStatus } from './TaskSection';

const FIELD_OPTIONS: Record<string, string[]> = {
  category: ['Strategy','Product','Engineering','Operations','GTM/Sales','Research','Finance'],
  priority:  ['Critical','High','Medium','Low'],
  urgency:   ['Now','Soon','Later'],
  effort:    ['1','2','3','5','8'],
  status:    ['To Do','In Progress','Blocked',"Won't Do",'Completed','Backlog'],
};

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
  "Won't Do":    's-wontdo',
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

type EditingCell = { taskKey: string; field: string } | null;

export default function TaskTable({ tasks, onSort, currentSort }: Props) {
  const { db, googleTasks, toggleDone, setTaskField } = useDashboard(
    useShallow((s) => ({
      db:           s.db,
      googleTasks:  s.googleTasks,
      toggleDone:   s.toggleDone,
      setTaskField: s.setTaskField,
    }))
  );

  const [editingCell, setEditingCell] = useState<EditingCell>(null);

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

  function getTaskKey(task: TaskWithStatus): string {
    return task.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function isDone(task: TaskWithStatus): boolean {
    return !!db.taskDone[getTaskKey(task)];
  }

  function handleCellClick(taskKey: string, field: string) {
    setEditingCell({ taskKey, field });
  }

  function handleCellSave(taskKey: string, field: string, value: string) {
    if (field === 'status') {
      if (value === 'Completed') {
        const task = tasks.find(t => getTaskKey(t) === taskKey);
        toggleDone(taskKey, true, task?.venture ?? '');
      } else {
        const task = tasks.find(t => getTaskKey(t) === taskKey);
        if (isDone(task!)) toggleDone(taskKey, false, task?.venture ?? '');
        setTaskField(taskKey, 'status', value);
      }
    } else if (field === 'effort') {
      setTaskField(taskKey, field, parseInt(value, 10));
    } else {
      setTaskField(taskKey, field, value);
    }
    setEditingCell(null);
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

                {/* Category — inline editable */}
                {(() => {
                  const tKey = getTaskKey(task);
                  const isEditing = (f: string) => editingCell?.taskKey === tKey && editingCell?.field === f;
                  function EditCell({ field, children }: { field: string; children: React.ReactNode }) {
                    if (isEditing(field)) {
                      return (
                        <td>
                          <select
                            className="inline-edit-select"
                            defaultValue={field === 'effort' ? String(task.effort ?? 1) : field === 'status' ? status : String((task as Record<string, unknown>)[field] ?? '')}
                            autoFocus
                            onChange={(e) => handleCellSave(tKey, field, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                          >
                            {(FIELD_OPTIONS[field] ?? []).map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </td>
                      );
                    }
                    return (
                      <td
                        className="editable-cell"
                        title="Click to edit"
                        onClick={() => handleCellClick(tKey, field)}
                      >
                        {children}
                      </td>
                    );
                  }
                  return (
                    <>
                      <EditCell field="category">
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{task.category}</span>
                      </EditCell>
                      <EditCell field="priority">
                        <span className={`priority-badge ${PRIORITY_CLASSES[task.priority] ?? ''}`}>{task.priority}</span>
                      </EditCell>
                      <EditCell field="urgency">
                        <span className={`urgency-badge ${URGENCY_CLASSES[task.urgency] ?? ''}`}>{task.urgency}</span>
                      </EditCell>
                      <EditCell field="effort">
                        <div className="effort-dots">{effortDots(task.effort ?? 1)}</div>
                      </EditCell>
                      <EditCell field="status">
                        <span className={`status-badge ${STATUS_CLASSES[status] ?? 's-todo'}`}>
                          {status === 'Completed' ? '✅ ' : ''}{status}
                        </span>
                      </EditCell>
                    </>
                  );
                })()}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
