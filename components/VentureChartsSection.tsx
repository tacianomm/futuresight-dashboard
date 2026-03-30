'use client';

import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import { VENTURE_MAP } from '@/lib/config';
import type { Task, Venture } from '@/types';

// ── Shared mini donut ─────────────────────────────────────────────────────────

interface DonutSlice { label: string; value: number; color: string; }

function DonutChart({ slices, centerVal, centerSub }: {
  slices: DonutSlice[];
  centerVal?: string;
  centerSub?: string;
}) {
  const size = 130; const cx = size / 2; const cy = size / 2;
  const r = 46; const stroke = 20;
  const circ  = 2 * Math.PI * r;
  const total = slices.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#7b8099', fontSize:12 }}>
        No data
      </div>
    );
  }

  let offset = 0;
  const paths = slices.filter(s => s.value > 0).map(s => {
    const dash = (s.value / total) * circ;
    const gap  = circ - dash;
    const rot  = (offset / total) * 360 - 90;
    offset += s.value;
    return { ...s, dash, gap, rot };
  });
  const visible = slices.filter(s => s.value > 0);

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, height:'100%', overflow:'hidden' }}>
      <div style={{ position:'relative', flexShrink:0, width:size, height:size }}>
        <svg width={size} height={size} style={{ display:'block' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2d3148" strokeWidth={stroke} />
          {paths.map((p, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={p.color}
              strokeWidth={stroke} strokeDasharray={`${p.dash} ${p.gap}`} strokeDashoffset={0}
              transform={`rotate(${p.rot} ${cx} ${cy})`} />
          ))}
        </svg>
        {centerVal && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
            <span style={{ fontSize:20, fontWeight:700, color:'#fff', display:'block', lineHeight:1 }}>{centerVal}</span>
            {centerSub && <span style={{ fontSize:9, color:'#7b8099', display:'block', marginTop:2 }}>{centerSub}</span>}
          </div>
        )}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5, fontSize:10, flex:1, overflow:'hidden' }}>
        {visible.map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:s.color, flexShrink:0, display:'inline-block' }} />
            <span style={{ color:'#7b8099', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{s.label}</span>
            <span style={{ color:'#e8eaf0', fontWeight:600, flexShrink:0 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared bar chart ──────────────────────────────────────────────────────────

interface BarItem { label: string; value: number; color: string; }

function BarChart({ bars, horizontal = false }: { bars: BarItem[]; horizontal?: boolean }) {
  const max = Math.max(...bars.map(b => b.value), 1);

  if (horizontal) {
    // Horizontal bars (for categories)
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:6, height:'100%', justifyContent:'center', overflow:'hidden' }}>
        {bars.map(b => (
          <div key={b.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:10 }}>
            <span style={{ width:72, textAlign:'right', color:'#7b8099', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flexShrink:0 }}>
              {b.label}
            </span>
            <div style={{ flex:1, background:'#1a1d27', borderRadius:3, height:10, overflow:'hidden' }}>
              <div style={{ width:`${(b.value/max)*100}%`, background:b.color, height:'100%', borderRadius:3 }} />
            </div>
            <span style={{ width:20, textAlign:'right', color:'#e8eaf0', fontWeight:600, flexShrink:0, fontSize:10 }}>{b.value}</span>
          </div>
        ))}
      </div>
    );
  }

  // Vertical bars (for status)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:'100%', padding:'0 8px 20px', justifyContent:'space-around' }}>
      {bars.map(b => (
        <div key={b.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
          <span style={{ fontSize:10, color:'#e8eaf0', fontWeight:600 }}>{b.value || ''}</span>
          <div style={{ width:'100%', background:'#1a1d27', borderRadius:3, position:'relative', height:100 }}>
            <div style={{
              position:'absolute', bottom:0, left:0, right:0,
              height:`${(b.value/max)*100}%`, background:b.color+'cc', borderRadius:3,
              minHeight: b.value > 0 ? 3 : 0,
            }} />
          </div>
          <span style={{ fontSize:9, color:'#7b8099', textAlign:'center', lineHeight:1.2, whiteSpace:'nowrap' }}>
            {b.label === 'In Progress' ? 'In Prog' : b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function toKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function VentureChartsSection({ venture }: { venture: Venture }) {
  const { db } = useDashboard(useShallow((s) => ({ db: s.db })));

  const allTasks: Task[] = db.tasks ?? [];
  const taskDone = db.taskDone ?? {};
  const vColor = VENTURE_MAP[venture]?.hex ?? '#6366f1';

  const vt      = allTasks.filter(t => t.venture === venture);
  const done    = vt.filter(t => !!taskDone[toKey(t.name)]);
  const active  = vt.filter(t => !taskDone[toKey(t.name)]);
  const doneN   = done.length;
  const pct     = vt.length ? Math.round((doneN / vt.length) * 100) : 0;

  // ── Completion donut ──────────────────────────────────────────────────────
  const completionSlices: DonutSlice[] = [
    { label: 'Done',      value: doneN,          color: '#22c55e' },
    { label: 'Remaining', value: active.length,   color: '#2d3148' },
  ];

  // ── By Status bar ─────────────────────────────────────────────────────────
  const STATUS_COLORS: Record<string, string> = {
    'To Do':       '#475569',
    'In Progress': '#6366f1',
    'Blocked':     '#ef4444',
    'Backlog':     '#374151',
  };
  const statusBars: BarItem[] = ['To Do', 'In Progress', 'Blocked', 'Backlog'].map(s => ({
    label: s,
    value: vt.filter(t => (t.defaultStatus ?? 'To Do') === s && !taskDone[toKey(t.name)]).length,
    color: STATUS_COLORS[s] ?? '#475569',
  }));

  // ── By Category horizontal bar ────────────────────────────────────────────
  const cats = [...new Set(vt.map(t => t.category))].filter(Boolean).sort();
  const catBars: BarItem[] = cats.map(c => ({
    label: c,
    value: active.filter(t => t.category === c).length,
    color: vColor,
  })).filter(b => b.value > 0);

  // ── By Priority donut ─────────────────────────────────────────────────────
  const PRIORITY_COLORS: Record<string, string> = {
    Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#6b7280',
  };
  const prioritySlices: DonutSlice[] = ['Critical', 'High', 'Medium', 'Low'].map(p => ({
    label: p,
    value: active.filter(t => t.priority === p).length,
    color: PRIORITY_COLORS[p],
  }));
  const critN = active.filter(t => t.priority === 'Critical').length;

  if (vt.length === 0) return null;

  return (
    <div className="charts-section">
      <div className="charts-venture">
        {/* Completion donut */}
        <div className="chart-card">
          <div className="chart-title">Completion</div>
          <div className="chart-inner">
            <DonutChart slices={completionSlices} centerVal={`${pct}%`} centerSub="done" />
          </div>
        </div>

        {/* By Status vertical bar */}
        <div className="chart-card">
          <div className="chart-title">By Status</div>
          <div className="chart-inner">
            <BarChart bars={statusBars} />
          </div>
        </div>

        {/* By Category horizontal bar */}
        <div className="chart-card">
          <div className="chart-title">By Category</div>
          <div className="chart-inner">
            <BarChart bars={catBars} horizontal />
          </div>
        </div>

        {/* By Priority donut */}
        <div className="chart-card">
          <div className="chart-title">By Priority</div>
          <div className="chart-inner">
            <DonutChart slices={prioritySlices} centerVal={String(critN)} centerSub="critical" />
          </div>
        </div>
      </div>
    </div>
  );
}
