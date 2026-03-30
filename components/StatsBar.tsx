'use client';

import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import { VENTURES } from '@/lib/config';
import { estimateHours, computeAutoHealth } from '@/lib/scoring';
import { CONFIG } from '@/lib/config';
import type { Task } from '@/types';

const HEALTH_HEX = { red: '#ef4444', yellow: '#eab308', green: '#22c55e' };
const HEALTH_LABEL = { red: 'At Risk', yellow: 'Watch', green: 'On Track' };

export default function StatsBar() {
  const { db, googleTasks, togglePanel, todayTasks, weekTasks, todayOpen, weekOpen } =
    useDashboard(
      useShallow((s) => ({
        db:          s.db,
        googleTasks: s.googleTasks,
        togglePanel: s.togglePanel,
        todayTasks:  s.todayTasks,
        weekTasks:   s.weekTasks,
        todayOpen:   s.todayOpen,
        weekOpen:    s.weekOpen,
      }))
    );

  const allTasks: Task[] = db.tasks ?? [];
  const pending = allTasks.filter((t) => !db.taskDone[toKey(t.name)]);
  const nowTasks = pending.filter((t) => t.urgency === 'Now');

  // ── Today's Focus count ───────────────────────────────────────────────────
  const todayCount = todayTasks.length;
  const todayHours = estimateHours(todayTasks, CONFIG.effortHours);

  // ── This Week estimate ────────────────────────────────────────────────────
  const weekHours = estimateHours(weekTasks, CONFIG.effortHours);
  const capacity  = CONFIG.weeklyCapacity;
  const capPct    = Math.min(Math.round((weekHours / capacity) * 100), 100);
  const capOver   = weekHours > capacity;

  // ── Critical Now ─────────────────────────────────────────────────────────
  const criticalNow = nowTasks.filter((t) => t.priority === 'Critical');

  // ── Completed ────────────────────────────────────────────────────────────
  const completedCount = Object.values(db.taskDone).filter(Boolean).length;
  const totalCount = allTasks.length;
  const staleCount = pending.filter((t) => t.stale).length;
  const newCount   = pending.filter((t) => t.isNew).length;

  // ── Venture health dots ───────────────────────────────────────────────────
  const ventureHealthDots = VENTURES.filter(v => v.key !== 'general').map((v) => {
    const vtasks = allTasks.filter((t) => t.venture === v.key);
    const playbookEntry = db.playbook?.[v.key];
    const manualStatus = playbookEntry?.['_venture_status'];
    const health = (manualStatus as 'red' | 'yellow' | 'green' | undefined)
      ?? computeAutoHealth(vtasks);
    return { venture: v, health };
  });

  return (
    <div className="stats-bar">
      {/* ── Today's Focus ── */}
      <div
        className="stat-card today clickable"
        onClick={() => togglePanel('today')}
        title="Toggle Today's Focus panel"
      >
        <div className="label">🎯 Today&apos;s Focus</div>
        <div className="value">{todayCount}</div>
        <div className="sub">
          {todayHours.toFixed(1)}h est · click to {todayOpen ? 'collapse' : 'expand'}
        </div>
      </div>

      {/* ── This Week ── */}
      <div
        className="stat-card week clickable"
        onClick={() => togglePanel('week')}
        title="Toggle This Week panel"
      >
        <div className="label">📅 This Week (top 20)</div>
        <div className="value">{weekTasks.length}</div>
        <div className="sub">
          {weekHours.toFixed(1)}h of {capacity}h capacity
        </div>
        <div className="capacity-bar">
          <div
            className={`capacity-fill ${capOver ? 'over' : ''}`}
            style={{ width: `${capPct}%` }}
          />
        </div>
      </div>

      {/* ── Critical Now ── */}
      <div className="stat-card">
        <div className="label">🔴 Critical Now</div>
        <div className="value" style={{ color: '#ef4444' }}>
          {criticalNow.length}
        </div>
        <div className="sub" style={{ marginTop: 4 }}>
          <CriticalNowSub tasks={criticalNow} />
        </div>
      </div>

      {/* ── Completed ── */}
      <div className="stat-card">
        <div className="label">✅ Completed</div>
        <div className="value" style={{ color: '#4ade80' }}>{completedCount}</div>
        <div className="sub">
          {staleCount} backlog · {newCount} new
        </div>
        {/* Venture-colored proportional bar */}
        <VentureBar tasks={pending} />
        {/* Venture health dots */}
        <div className="vdot-row">
          {ventureHealthDots.map(({ venture: v, health }) => (
            <span key={v.key} className="vdot" title={`${v.label}: ${HEALTH_LABEL[health]}`}>
              <span className={`vdot-circle ${health}`} />
              {v.label.slice(0, 4)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function toKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Critical Now sub-line ──────────────────────────────────────────────────
const VCOL: Record<string, string> = {
  flowar: '#3b82f6', homeservices: '#22c55e', legal: '#a855f7',
  dental: '#f59e0b', voice: '#06b6d4', general: '#6366f1',
};
const VNAME_SHORT: Record<string, string> = {
  flowar: 'FlowAR', homeservices: 'HomeServ', legal: 'Legal',
  dental: 'Sona', voice: 'Voice', general: 'General',
};

function CriticalNowSub({ tasks }: { tasks: Task[] }) {
  const byVenture = VENTURES.filter(v => v.key !== 'general').map(v => ({
    key:   v.key,
    color: VCOL[v.key] ?? '#6366f1',
    label: VNAME_SHORT[v.key] ?? v.label,
    count: tasks.filter(t => t.venture === v.key).length,
  })).filter(d => d.count > 0);

  if (byVenture.length === 0) {
    return <span style={{ color: '#22c55e' }}>No fires right now 🎉</span>;
  }
  return (
    <>
      {byVenture.map((d, i) => (
        <span key={d.key}>
          {i > 0 && <span style={{ color: '#444' }}> · </span>}
          <span style={{ color: d.color }}>{d.label}&nbsp;{d.count}</span>
        </span>
      ))}
    </>
  );
}

// ── Venture proportional bar ───────────────────────────────────────────────
function VentureBar({ tasks }: { tasks: Task[] }) {
  const total = Math.max(tasks.length, 1);
  const segments = VENTURES.filter(v => v.key !== 'general').map(v => {
    const n   = tasks.filter(t => t.venture === v.key).length;
    const pct = Math.round((n / total) * 100);
    return { key: v.key, pct, color: VCOL[v.key] ?? '#6366f1', n, label: v.label };
  }).filter(d => d.pct > 0);

  return (
    <div style={{ display: 'flex', gap: 0, marginTop: 8, height: 4, alignItems: 'center' }}>
      {segments.map((s, i) => (
        <div
          key={s.key}
          title={`${s.label}: ${s.n}`}
          style={{
            flex: s.pct,
            background: s.color,
            height: 4,
            borderRadius: 2,
            minWidth: 3,
            marginLeft: i > 0 ? 2 : 0,
          }}
        />
      ))}
    </div>
  );
}
