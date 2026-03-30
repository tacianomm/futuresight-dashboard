'use client';

import { useState, useCallback } from 'react';
import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import { VENTURE_MAP, PLAYBOOK_DATA, PLAYBOOK_STATUS_CYCLE, PLAYBOOK_STATUS_ICONS, PLAYBOOK_STATUS_LABELS } from '@/lib/config';
import { computeAutoHealth } from '@/lib/scoring';
import TaskSection from './TaskSection';
import VentureChartsSection from './VentureChartsSection';
import type { Venture } from '@/types';

// Stage emojis matching original HTML: STAGE_EMOJIS = ['','💡','🔍','🔨','🚀','📈']
const STAGE_EMOJIS: Record<number, string> = { 1:'💡', 2:'🔍', 3:'🔨', 4:'🚀', 5:'📈' };
const STAGE_LABELS: Record<number, string>  = {
  1: 'Ideation', 2: 'Problem/Solution', 3: 'Solution Validation',
  4: 'Company Formation', 5: 'Growth',
};
const ALL_STAGES = [1, 2, 3, 4, 5];

// Badge CSS class per status key
const PB_BADGE_CLASS: Record<string, string> = {
  started:    'status-started',
  updated:    'status-updated',
  finalized:  'status-finalized',
  referenced: 'status-referenced',
};

// Health pill definitions
const PILLS = [
  { key: 'on-track',  label: '✅ On Track',  value: 'green'  },
  { key: 'at-risk',   label: '⚠️ At Risk',   value: 'yellow' },
  { key: 'blocked',   label: '🔴 Blocked',   value: 'red'    },
  { key: 'milestone', label: '🎉 Milestone', value: 'green'  },
];

// Auto health label
const AUTO_LABEL: Record<string, string> = {
  red: 'Needs action', yellow: 'Watch closely', green: 'On track',
};
const DOT_CLASS: Record<string, string> = {
  red: 'red', yellow: 'yellow', green: 'green',
};

interface Props { venture: Venture; }

export default function VenturePanel({ venture }: Props) {
  const { db, setPlaybookStatus, setVentureStatus, setVentureNote } = useDashboard(
    useShallow((s) => ({
      db:                s.db,
      setPlaybookStatus: s.setPlaybookStatus,
      setVentureStatus:  s.setVentureStatus,
      setVentureNote:    s.setVentureNote,
    }))
  );

  const ventureInfo  = VENTURE_MAP[venture];
  const currentStage = ventureInfo?.stage ?? 1;
  const playbookData = db.playbook?.[venture] ?? {};

  // Split artifacts: relevant (expected at this stage) vs N/A
  const relevantArtifacts = PLAYBOOK_DATA.filter(a => a.expected[currentStage] != null);
  const naArtifacts       = PLAYBOOK_DATA.filter(a => a.expected[currentStage] == null);
  const vtasks       = (db.tasks ?? []).filter(t => t.venture === venture && !db.taskDone[toKey(t.name)]);

  // Health
  const manualStatus = playbookData['_venture_status'] as 'red' | 'yellow' | 'green' | undefined;
  const manualPill   = playbookData['_venture_pill'] as string | undefined; // 'on-track'|'at-risk'|'blocked'|'milestone'
  const autoHealth   = computeAutoHealth(vtasks);
  const health       = manualStatus ?? autoHealth;
  const dotCls       = DOT_CLASS[health] ?? 'green';
  const autoLabel    = AUTO_LABEL[autoHealth] ?? 'On track';

  const [noteVal, setNoteVal] = useState(playbookData['_venture_note'] ?? '');

  // Keep note in sync when venture changes
  const savedNote = playbookData['_venture_note'] ?? '';

  const handleNoteSave = useCallback(() => {
    setVentureNote(venture, noteVal);
  }, [venture, noteVal, setVentureNote]);

  function handlePillClick(pill: typeof PILLS[number]) {
    if (manualPill === pill.key) {
      // deselect → auto
      setVentureStatus(venture, '');
      setPlaybookStatus(venture, '_venture_pill', '');
    } else {
      setVentureStatus(venture, pill.value as 'red' | 'yellow' | 'green');
      setPlaybookStatus(venture, '_venture_pill', pill.key);
    }
  }

  // Playbook badge click cycles through statuses (matching original)
  function handleBadgeCycle(artifact: string) {
    const current = playbookData[artifact] ?? 'default';
    const idx = PLAYBOOK_STATUS_CYCLE.indexOf(current);
    const next = PLAYBOOK_STATUS_CYCLE[(idx + 1) % PLAYBOOK_STATUS_CYCLE.length];
    setPlaybookStatus(venture, artifact, next);
  }

  // Top priorities: sorted pending tasks for this venture
  const sorted = [...vtasks].sort((a, b) => {
    const po: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const uo: Record<string, number> = { Now: 0, Soon: 1, Later: 2 };
    return (po[a.priority] ?? 3) - (po[b.priority] ?? 3) || (uo[a.urgency] ?? 2) - (uo[b.urgency] ?? 2);
  });
  const top6 = sorted.slice(0, 6);

  return (
    <div className="stage-panel">

      {/* ── Venture health bar ── */}
      <div className="venture-health-bar">
        <span className={`vh-dot ${dotCls}`} />
        <span className="vh-auto-label">Auto: {autoLabel}</span>
        <span className="vh-divider" />

        <div className="vh-status-pills">
          {PILLS.map(pill => (
            <button
              key={pill.key}
              className={`vh-pill ${pill.key}${manualPill === pill.key ? ' active' : ''}`}
              onClick={() => handlePillClick(pill)}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="vh-note-wrap">
          <input
            className="vh-note"
            value={noteVal}
            placeholder="Add a status note… (e.g. 'Pilots launching next week')"
            onChange={e => setNoteVal(e.target.value)}
            onBlur={handleNoteSave}
            onKeyDown={e => e.key === 'Enter' && handleNoteSave()}
          />
          <button className="vh-save-btn" onClick={handleNoteSave}>Save</button>
        </div>
      </div>

      {/* ── Stage progress bar ── */}
      <div className="stage-progress-wrap">
        {ALL_STAGES.map(s => (
          <div
            key={s}
            className={`stage-step ${s === currentStage ? 'active' : s < currentStage ? 'past' : ''}`}
          >
            <span className="stage-step-num">{STAGE_EMOJIS[s]}</span>
            <span className="stage-step-label">{STAGE_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {/* ── 2-column: Playbook Tracker + Top Priorities ── */}
      <div className="stage-content-grid">

        {/* Playbook Tracker */}
        <div className="playbook-col">
          <div className="panel-col-title">📋 Playbook Tracker</div>
          <div className="playbook-grid">
            {/* Relevant artifacts for this stage — clickable */}
            {relevantArtifacts.map(artifact => {
              const rawStatus  = playbookData[artifact.name];
              const expected   = artifact.expected[currentStage] ?? 'default';
              const status     = (rawStatus && rawStatus !== 'default') ? rawStatus : expected;
              const badgeCls   = PB_BADGE_CLASS[status] ?? '';
              const icon       = PLAYBOOK_STATUS_ICONS[status] ?? '⬜';
              const label      = PLAYBOOK_STATUS_LABELS[status] ?? status;
              return (
                <div key={artifact.name} className="pb-row">
                  <span className="pb-name" title={artifact.name}>{artifact.name}</span>
                  <button
                    className={`pb-badge${badgeCls ? ` ${badgeCls}` : ''}`}
                    onClick={() => handleBadgeCycle(artifact.name)}
                    title="Click to update"
                  >
                    {icon} {label}
                  </button>
                </div>
              );
            })}
            {/* N/A artifacts — grayed out, not clickable */}
            {naArtifacts.map(artifact => (
              <div key={artifact.name} className="pb-row na-row">
                <span className="pb-name" title={artifact.name}>{artifact.name}</span>
                <span className="pb-badge">— N/A</span>
              </div>
            ))}
          </div>
          <div className="playbook-legend">
            <span>🟢 Started</span>
            <span>✏️ In progress</span>
            <span>⭐ Done</span>
            <span>👁️ Referenced</span>
            <span>— N/A</span>
          </div>
        </div>

        {/* Top Priorities */}
        <div className="toptasks-col">
          <div className="panel-col-title">🔥 Top Priorities</div>
          {top6.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, paddingTop: 8 }}>No active tasks 🎉</div>
          ) : (
            top6.map(t => (
              <div key={t.name} className={`top-task-item ${t.priority}`}>
                <div className="tt-name">{t.name}</div>
                <div className="tt-meta">
                  <span className={`pbadge ${t.priority}`} style={{ fontSize: 10 }}>{t.priority}</span>
                  <span>{t.urgency}</span>
                  <span>{t.category}</span>
                  {t.source === 'google' && <span style={{ color: '#93c5fd' }}>G</span>}
                  {t.source === 'otter'  && <span style={{ color: '#a5b4fc' }}>O</span>}
                  {t.source === 'claude' && <span style={{ color: 'var(--muted)' }}>C</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Venture charts (4 charts) ── */}
      <VentureChartsSection venture={venture} />

      {/* ── Task list for this venture ── */}
      <TaskSection />
    </div>
  );
}

function toKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
