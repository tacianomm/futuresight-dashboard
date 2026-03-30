'use client';

import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import { VENTURES } from '@/lib/config';
import type { Task } from '@/types';

// ── SVG Donut Chart ──────────────────────────────────────────────────────────

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ slices, centerVal, centerSub }: {
  slices: DonutSlice[];
  centerVal?: string;
  centerSub?: string;
}) {
  const size   = 140;
  const cx     = size / 2;
  const cy     = size / 2;
  const r      = 50;
  const stroke = 22;
  const circumference = 2 * Math.PI * r;
  const total  = slices.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7b8099', fontSize: 12 }}>
        No data yet
      </div>
    );
  }

  let offset = 0;
  const paths = slices
    .filter(s => s.value > 0)
    .map((s) => {
      const pct      = s.value / total;
      const dash     = pct * circumference;
      const gap      = circumference - dash;
      const rotation = (offset / total) * 360 - 90;
      offset += s.value;
      return { ...s, dash, gap, rotation };
    });

  const visible = slices.filter(s => s.value > 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: '100%', overflow: 'hidden' }}>
      {/* SVG donut */}
      <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2d3148" strokeWidth={stroke} />
          {paths.map((p, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={stroke}
              strokeDasharray={`${p.dash} ${p.gap}`}
              strokeDashoffset={0}
              transform={`rotate(${p.rotation} ${cx} ${cy})`}
            />
          ))}
        </svg>
        {centerVal && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', display: 'block', lineHeight: 1 }}>{centerVal}</span>
            {centerSub && <span style={{ fontSize: 9, color: '#7b8099', display: 'block', marginTop: 2 }}>{centerSub}</span>}
          </div>
        )}
      </div>

      {/* Legend — show ALL slices so statuses are always visible */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, flex: 1, overflow: 'hidden' }}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, opacity: s.value === 0 ? 0.4 : 1 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: '#7b8099', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {s.label}
            </span>
            <span style={{ color: '#e8eaf0', fontWeight: 600, flexShrink: 0 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vertical Stacked Bar Chart (Active + Done per venture) ───────────────────

interface StackedBarItem {
  label:  string;  // short display name
  active: number;
  done:   number;
  color:  string;
  emoji:  string;
}

function VerticalStackedBarChart({ bars }: { bars: StackedBarItem[] }) {
  // Chart geometry — bars are wide like the original Chart.js version
  const BAR_W      = 56;   // px — wide bars
  const BAR_GAP    = 24;   // px — gap between bars
  const PAD_L      = 32;   // px — left margin for Y-axis labels
  const AXIS_PAD   = 14;   // px — space between Y-axis line and first bar
  const PAD_B      = 24;   // px — bottom margin for X-axis labels
  const PAD_T      = 12;   // px — top breathing room above highest grid line
  const PAD_R      = 14;   // px — right margin (mirror the axis gap on right)
  const CHART_H    = 88;   // px — plotable area height

  // Y-axis: fixed step of 20 matching original, minimum ceiling 60
  const maxData  = Math.max(...bars.map(b => b.active + b.done), 0);
  const yMax     = Math.max(60, Math.ceil(maxData / 20) * 20);
  const STEP     = 20;
  const ySteps   = yMax / STEP;   // number of grid lines

  const totalW = PAD_L + AXIS_PAD + bars.length * (BAR_W + BAR_GAP) - BAR_GAP + PAD_R;
  const totalH = PAD_T + CHART_H + PAD_B;

  const yPos = (val: number) => PAD_T + CHART_H - (val / yMax) * CHART_H;
  const baseY = yPos(0);  // y-coordinate of the baseline (= PAD_T + CHART_H)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Legend — centred, squares like original */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 16, marginBottom: 6, fontSize: 10, color: '#aab0c4', flexShrink: 0,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#3b82f6', display: 'inline-block' }} />
          Active
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#3b82f6', opacity: 0.35, display: 'inline-block' }} />
          Done
        </span>
      </div>

      {/* SVG — stretches to fill full card width like the original Chart.js version */}
      <div style={{ flex: 1 }}>
        <svg
          viewBox={`0 0 ${totalW} ${totalH}`}
          style={{ width: '100%', height: '124px', display: 'block' }}
          preserveAspectRatio="none"
        >
          {/* Grid lines + Y-axis labels */}
          {Array.from({ length: ySteps + 1 }, (_, i) => {
            const val = i * STEP;
            const y   = yPos(val);
            return (
              <g key={i}>
                <line
                  x1={PAD_L} y1={y} x2={totalW - PAD_R} y2={y}
                  stroke="#2a2f4a" strokeWidth={1}
                  strokeDasharray={i === 0 ? undefined : '3 3'}
                />
                <text x={PAD_L - 4} y={y + 3.5} fontSize={7.5} fill="#7b8099" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars — Done (faded top) + Active (bright bottom) */}
          {bars.map((b, i) => {
            const x      = PAD_L + AXIS_PAD + i * (BAR_W + BAR_GAP);
            const total  = b.active + b.done;
            const activeH = (b.active / yMax) * CHART_H;
            const doneH   = (b.done   / yMax) * CHART_H;
            const activeY = yPos(b.active);   // top of active segment
            const totalY  = yPos(total);       // top of done segment (top of whole bar)

            return (
              <g key={b.label}>
                {/* Outer shape: full bar with rounded top corners (clip bg) */}
                {total > 0 && (
                  <rect
                    x={x} y={totalY}
                    width={BAR_W} height={(total / yMax) * CHART_H}
                    fill={b.color} opacity={0.35} rx={3}
                  />
                )}
                {/* Active overlay (bright, bottom portion, no top rounding needed) */}
                {b.active > 0 && (
                  <rect
                    x={x} y={activeY}
                    width={BAR_W} height={activeH}
                    fill={b.color} opacity={0.9}
                    rx={b.done === 0 ? 3 : 0}
                  />
                )}

                {/* X-axis label: emoji + name on one line */}
                <text
                  x={x + BAR_W / 2}
                  y={baseY + 16}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#aab0c4"
                >
                  {`${b.emoji} ${b.label}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Main ChartsSection ───────────────────────────────────────────────────────

function toKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ChartsSection() {
  const { db } = useDashboard(
    useShallow((s) => ({ db: s.db }))
  );

  const allTasks: Task[] = db.tasks ?? [];
  const taskDone = db.taskDone ?? {};

  const pending = allTasks.filter(t => !taskDone[toKey(t.name)]);
  const activeCount = pending.length;

  // ── Task Status donut ─────────────────────────────────────────────────────
  // Count all non-done tasks by their status field
  const todoCount       = pending.filter(t => !t.stale && (t.defaultStatus ?? 'To Do') === 'To Do').length;
  const inProgressCount = pending.filter(t => !t.stale && t.defaultStatus === 'In Progress').length;
  const blockedCount    = pending.filter(t => !t.stale && t.defaultStatus === 'Blocked').length;
  const backlogCount    = pending.filter(t => t.stale).length;
  const completedCount  = allTasks.length - pending.length;

  const statusSlices: DonutSlice[] = [
    { label: 'To Do',       value: todoCount,        color: '#6366f1' },
    { label: 'In Progress', value: inProgressCount,  color: '#3b82f6' },
    { label: 'Blocked',     value: blockedCount,     color: '#ef4444' },
    { label: 'Backlog',     value: backlogCount,     color: '#475569' },
    { label: 'Completed',   value: completedCount,   color: '#22c55e' },
  ];

  // ── By Priority donut ──────────────────────────────────────────────────────
  const critical = pending.filter(t => t.priority === 'Critical').length;
  const high     = pending.filter(t => t.priority === 'High').length;
  const medium   = pending.filter(t => t.priority === 'Medium').length;
  const low      = pending.filter(t => t.priority === 'Low').length;

  const prioritySlices: DonutSlice[] = [
    { label: 'Critical', value: critical, color: '#ef4444' },
    { label: 'High',     value: high,     color: '#f97316' },
    { label: 'Medium',   value: medium,   color: '#eab308' },
    { label: 'Low',      value: low,      color: '#6b7280' },
  ];

  // ── Active + Done Tasks by Project vertical stacked bar ───────────────────
  // Short labels + emojis matching original dashboard
  const VENTURE_META: Record<string, { emoji: string; short: string }> = {
    flowar:       { emoji: '💰', short: 'FlowAR'       },
    homeservices: { emoji: '🏠', short: 'HomeServices'  },
    legal:        { emoji: '⚖️', short: 'Legal Agent'   },
    dental:       { emoji: '🦷', short: 'Sona/Dental'   },
    voice:        { emoji: '🎙', short: 'Voice'         },
    general:      { emoji: '⚙️', short: 'General'       },
  };

  const ventureBars: StackedBarItem[] = VENTURES.map(v => ({
    label:  VENTURE_META[v.key]?.short ?? v.label,
    active: pending.filter(t => t.venture === v.key).length,
    done:   allTasks.filter(t => t.venture === v.key && !!taskDone[toKey(t.name)]).length,
    color:  v.hex,
    emoji:  VENTURE_META[v.key]?.emoji ?? '',
  }));

  if (allTasks.length === 0) return null;

  return (
    <div className="charts-section">
      <div className="charts-overview">
        {/* Task Status donut — center shows active count */}
        <div className="chart-card">
          <div className="chart-title">Task Status</div>
          <div className="chart-inner">
            <DonutChart
              slices={statusSlices}
              centerVal={String(activeCount)}
              centerSub="active"
            />
          </div>
        </div>

        {/* By Priority donut */}
        <div className="chart-card">
          <div className="chart-title">By Priority</div>
          <div className="chart-inner">
            <DonutChart
              slices={prioritySlices}
              centerVal={String(pending.length)}
              centerSub="pending"
            />
          </div>
        </div>

        {/* Active + Done Tasks by Project — vertical stacked bar */}
        <div className="chart-card">
          <div className="chart-title">Active Tasks by Project</div>
          <div className="chart-inner">
            <VerticalStackedBarChart bars={ventureBars} />
          </div>
        </div>
      </div>
    </div>
  );
}
