'use client';

import type { ReactNode } from 'react';
import type { TaskWithStatus } from './TaskSection';

interface Props {
  tasks: TaskWithStatus[];
}

// Mirror sClass() from the original HTML
function sClass(status: string): string {
  if (status === 'To Do')       return 'todo';
  if (status === 'In Progress') return 'inprog';
  if (status === 'Blocked')     return 'blocked';
  if (status === 'Completed')   return 'done';
  return 'backlog';
}

function effortDots(effort: number | undefined): ReactNode {
  const n = Math.min(effort ?? 2, 5);
  return (
    <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>
      {'●'.repeat(n)}{'○'.repeat(5 - n)}
    </span>
  );
}

interface CardProps {
  task: TaskWithStatus;
}

function KanbanCard({ task }: CardProps) {
  const isDone = task._resolvedStatus === 'Completed' || task._resolvedStatus === 'done';
  const priorityPrefix = task.priority === 'Critical' ? '🔴 ' : task.priority === 'High' ? '🟠 ' : '';
  const desc = task.desc && task.desc.length > 100 ? task.desc.slice(0, 100) + '…' : (task.desc ?? '');

  return (
    <div className={`kanban-card ${task.venture}${isDone ? ' completed-card' : ''}`}>
      {/* Top row: venture badge + NEW + source tags */}
      <div className="kc-top">
        <span className={`vbadge ${task.venture}`} style={{ fontSize: 9, padding: '2px 6px' }}>
          {task.ventureLabel}
        </span>
        {task.isNew && <span className="new-tag">NEW</span>}
        {task.source === 'otter' && (
          <a
            href={task.otterLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="task-source-badge otter"
            title={`${task.meetingTitle ?? 'Otter.ai'} · ${task.meetingDate ?? ''}`}
          >
            O
          </a>
        )}
        {task.source === 'claude' && (
          <span className="task-source-badge claude" title="Claude suggestion">C</span>
        )}
        {task.source === 'google' && (
          <span className="task-source-badge google" title="Synced to Google Tasks">G</span>
        )}
        {task.assignee && task.source === 'otter' && (
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>@{task.assignee}</span>
        )}
      </div>

      {/* Task name with priority emoji */}
      <div className="kc-name">
        {priorityPrefix}{task.name}
      </div>

      {/* Description */}
      {desc && <div className="kc-desc">{desc}</div>}

      {/* Bottom: priority badge + category + status + effort */}
      <div className="kc-bottom">
        <span className={`pbadge ${task.priority}`}>{task.priority}</span>
        {task.category && <span className="cbadge">{task.category}</span>}
        <span className={`sbadge ${sClass(task._resolvedStatus)}`}>{task._resolvedStatus}</span>
        {effortDots(task.effort)}
      </div>
    </div>
  );
}

interface ColProps {
  title:  string;
  tasks:  TaskWithStatus[];
}

function KanbanCol({ title, tasks }: ColProps) {
  return (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <span className="col-title">{title}</span>
        <span className="col-count">{tasks.length}</span>
      </div>
      <div className="kanban-cards">
        {tasks.length === 0 ? (
          <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
            No tasks
          </div>
        ) : (
          tasks.map((t, i) => (
            <KanbanCard key={`${t.venture}-${t.name}-${i}`} task={t} />
          ))
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks }: Props) {
  const now   = tasks.filter(t => t.urgency === 'Now');
  const soon  = tasks.filter(t => t.urgency === 'Soon');
  const later = tasks.filter(t => t.urgency === 'Later');

  return (
    <div className="kanban-wrap">
      <KanbanCol title="🔴 Now — This Week"      tasks={now}   />
      <KanbanCol title="🟡 Soon — This Month"     tasks={soon}  />
      <KanbanCol title="🔵 Later — Next Quarter"  tasks={later} />
    </div>
  );
}
