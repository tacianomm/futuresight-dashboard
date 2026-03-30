'use client';

import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import { VENTURES, VENTURE_MAP } from '@/lib/config';
import { computeAutoHealth } from '@/lib/scoring';
import type { Venture } from '@/types';

const HEALTH_HEX   = { red: '#ef4444', yellow: '#eab308', green: '#22c55e' };
const HEALTH_LABEL = { red: 'At Risk',  yellow: 'Watch',   green: 'On Track' };

const STAGE_NAMES: Record<number, string> = {
  0: '—',
  1: 'Ideation',
  2: 'Problem/Solution',
  3: 'Solution Validation',
  4: 'Company Formation',
  5: 'Growth',
};

const STAGE_EMOJIS: Record<number, string> = {
  1: '💡', 2: '🔍', 3: '🔨', 4: '🚀', 5: '📈',
};

const ALL_STAGES = [1, 2, 3, 4, 5];

const VENTURE_EMOJI: Record<string, string> = {
  flowar:       '💰',
  homeservices: '🏠',
  legal:        '⚖️',
  dental:       '🦷',
  voice:        '🎙',
  general:      '🌐',
};

const PRIORITY_COLOR: Record<string, string> = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      '#6b7280',
};

export default function VentureNav() {
  const { activeVenture, setActiveVenture, db } = useDashboard(
    useShallow((s) => ({
      activeVenture:    s.activeVenture,
      setActiveVenture: s.setActiveVenture,
      db:               s.db,
    }))
  );

  const allTasks = db.tasks ?? [];
  const taskDone = db.taskDone ?? {};

  function getHealth(venture: Venture): 'red' | 'yellow' | 'green' {
    const manual = db.playbook?.[venture]?.['_venture_status'] as 'red' | 'yellow' | 'green' | undefined;
    if (manual) return manual;
    return computeAutoHealth(allTasks.filter(t => t.venture === venture));
  }

  function getPendingCount(venture: Venture | null): number {
    const tasks = venture ? allTasks.filter(t => t.venture === venture) : allTasks;
    return tasks.filter(t => !taskDone[toKey(t.name)]).length;
  }

  function handleTabClick(venture: Venture | null) {
    setActiveVenture(activeVenture === venture ? null : venture);
  }

  return (
    <div>
      {/* ── Venture tab row (original vtab style) ── */}
      <nav className="venture-nav">
        <button
          className={`vtab ${activeVenture === null ? 'active' : ''}`}
          onClick={() => handleTabClick(null)}
        >
          <span>🌐 All Ventures</span>
          <span className="vtab-count">{getPendingCount(null)}</span>
        </button>

        {VENTURES.filter(v => v.key !== 'general').map((v) => {
          const isActive = activeVenture === v.key;
          const emoji    = VENTURE_EMOJI[v.key] ?? '';
          return (
            <button
              key={v.key}
              className={`vtab v-${v.key} ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(v.key as Venture)}
            >
              <span>{emoji} {v.label}</span>
              <span className="vtab-count">{getPendingCount(v.key as Venture)}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Venture overview cards — original 5-column grid with border-top ── */}
      {activeVenture === null && (
        <div className="venture-overview-cards">
          {VENTURES.filter(v => v.key !== 'general').map((v) => {
            const vtasks  = allTasks.filter(t => t.venture === v.key);
            const pending = vtasks.filter(t => !taskDone[toKey(t.name)]);
            const critNow = pending.filter(t => t.priority === 'Critical' && t.urgency === 'Now').length;
            const health  = getHealth(v.key as Venture);
            const hex     = HEALTH_HEX[health];
            const note    = db.playbook?.[v.key]?.['_venture_note'] ?? '';
            const stage   = VENTURE_MAP[v.key as Venture]?.stage ?? 1;

            // top 3 pending tasks sorted by priority weight
            const priorityWeight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
            const top3 = [...pending]
              .sort((a, b) => (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0))
              .slice(0, 3);

            return (
              <div
                key={v.key}
                className={`vc ${v.key}`}
                onClick={() => handleTabClick(v.key as Venture)}
                title={`Open ${v.label} panel`}
              >
                {/* Name */}
                <div className="vc-name">{VENTURE_EMOJI[v.key]} {v.label}</div>

                {/* Stage label — emoji + name, colored with venture color */}
                <div className="vc-stage" style={{ color: `var(--${v.key})` }}>
                  {STAGE_EMOJIS[stage]} {STAGE_NAMES[stage] ?? ''}
                </div>

                {/* Stage progress dots */}
                <div className="vc-progress">
                  {ALL_STAGES.map(s => (
                    <div
                      key={s}
                      className={`vc-dot ${s < stage ? 'done' : s === stage ? 'active' : ''}`}
                      style={s <= stage ? { background: `var(--${v.key})` } : undefined}
                    />
                  ))}
                </div>

                {/* Stats: pending + critical */}
                <div className="vc-stats">
                  <div className="vc-stat">
                    <div className="n">{pending.length}</div>
                    <div className="l">Pending</div>
                  </div>
                  {critNow > 0 && (
                    <div className="vc-stat">
                      <div className="n" style={{ color: '#ef4444' }}>{critNow}</div>
                      <div className="l">Critical</div>
                    </div>
                  )}
                  <div className="vc-stat">
                    <div className="n">{vtasks.length}</div>
                    <div className="l">Total</div>
                  </div>
                </div>

                {/* Health */}
                <div className="vc-health">
                  <span className="vc-health-dot" style={{ background: hex, boxShadow: `0 0 5px ${hex}66` }} />
                  <span className="vc-health-label" style={{ color: hex }}>{HEALTH_LABEL[health]}</span>
                  {note && (
                    <span className="vc-health-note">
                      · {note.length > 30 ? note.slice(0, 30) + '…' : note}
                    </span>
                  )}
                </div>

                {/* Top 3 tasks */}
                {top3.length > 0 && (
                  <div className="vc-tasks">
                    {top3.map(t => (
                      <div key={t.name} className="vc-task">
                        <span
                          className="vc-task-dot"
                          style={{ background: PRIORITY_COLOR[t.priority] ?? '#6b7280' }}
                        />
                        <span>{t.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function toKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
