'use client';

import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import { CONFIG } from '@/lib/config';
import type { Task } from '@/types';

const PRIORITY_DOT: Record<string, string> = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      '#6b7280',
};

function effortLabel(effort: number): string {
  const h = Math.round(effort * CONFIG.effortHours);
  return `${'●'.repeat(Math.min(effort, 5))} ~${h}h`;
}

function FocusTask({ task, done, onToggle }: {
  task: Task;
  done: boolean;
  onToggle: (done: boolean) => void;
}) {
  return (
    <div className="focus-task" style={{ opacity: done ? 0.45 : 1 }}>
      <input
        type="checkbox"
        className="task-check"
        checked={done}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={task.name}
      />
      <div className="focus-task-name" style={{ textDecoration: done ? 'line-through' : 'none' }}>
        <span className={`vbadge ${task.venture}`} style={{ fontSize: 9, padding: '1px 5px', marginRight: 6, verticalAlign: 'middle' }}>
          {task.ventureLabel}
        </span>
        <span
          style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                   background: PRIORITY_DOT[task.priority] ?? '#6b7280',
                   marginRight: 5, verticalAlign: 'middle' }}
        />
        {task.name}
      </div>
      <span className="focus-task-effort">{effortLabel(task.effort)}</span>
    </div>
  );
}

export default function FocusPanels() {
  const { todayTasks, weekTasks, todayOpen, weekOpen, togglePanel, db, toggleDone } =
    useDashboard(
      useShallow((s) => ({
        todayTasks:  s.todayTasks,
        weekTasks:   s.weekTasks,
        todayOpen:   s.todayOpen,
        weekOpen:    s.weekOpen,
        togglePanel: s.togglePanel,
        db:          s.db,
        toggleDone:  s.toggleDone,
      }))
    );

  if (todayTasks.length === 0 && weekTasks.length === 0) return null;

  function isDone(task: Task): boolean {
    const key = task.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return !!db.taskDone[key];
  }

  function handleToggle(task: Task, done: boolean) {
    const key = task.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    toggleDone(key, done, task.venture);
  }

  const todayHours = todayTasks.reduce((s, t) => s + (t.effort || 1) * CONFIG.effortHours, 0);
  const weekHours  = weekTasks.reduce((s, t) => s + (t.effort || 1) * CONFIG.effortHours, 0);

  return (
    <div className="focus-panels">
      {/* ── Today's Focus ── */}
      {todayTasks.length > 0 && (
        <div className="focus-panel">
          <div className="focus-panel-hdr" onClick={() => togglePanel('today')}>
            <span className="focus-panel-icon">🎯</span>
            <span className="focus-panel-title">Today&apos;s Focus</span>
            <span className="focus-panel-meta">
              {todayTasks.length} tasks · ~{todayHours.toFixed(1)}h
            </span>
            <span className={`focus-panel-chevron ${todayOpen ? 'open' : ''}`}>▼</span>
          </div>
          {todayOpen && (
            <div className="focus-panel-body">
              {todayTasks.map((t, i) => (
                <FocusTask
                  key={`${t.venture}-${i}`}
                  task={t}
                  done={isDone(t)}
                  onToggle={(done) => handleToggle(t, done)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── This Week ── */}
      {weekTasks.length > 0 && (
        <div className="focus-panel">
          <div className="focus-panel-hdr" onClick={() => togglePanel('week')}>
            <span className="focus-panel-icon">📅</span>
            <span className="focus-panel-title">This Week (top 20)</span>
            <span className="focus-panel-meta">
              {weekTasks.length} tasks · ~{weekHours.toFixed(1)}h
            </span>
            <span className={`focus-panel-chevron ${weekOpen ? 'open' : ''}`}>▼</span>
          </div>
          {weekOpen && (
            <div className="focus-panel-body">
              {weekTasks.map((t, i) => (
                <FocusTask
                  key={`${t.venture}-${i}`}
                  task={t}
                  done={isDone(t)}
                  onToggle={(done) => handleToggle(t, done)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
