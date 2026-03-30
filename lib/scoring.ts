import type { Task, Priority, Urgency } from '@/types';

const PRIORITY_SCORE: Record<Priority, number> = {
  Critical: 40,
  High:     30,
  Medium:   20,
  Low:      10,
};

const URGENCY_SCORE: Record<Urgency, number> = {
  Now:   20,
  Soon:  10,
  Later:  0,
};

/**
 * Score a task for prioritisation (higher = more important to do first).
 *
 * Formula:
 *   priority weight  (40/30/20/10)
 * + urgency  weight  (20/10/0)
 * + effort quick-win bonus (effort ≤1 → +10, effort ≤2 → +5)
 * - stale penalty   (-25 if meeting > 14 days ago)
 */
export function scoreTask(t: Task): number {
  const p = PRIORITY_SCORE[t.priority] ?? 10;
  const u = URGENCY_SCORE[t.urgency]   ?? 0;
  const e = !t.effort || t.effort <= 1 ? 10 : t.effort <= 2 ? 5 : 0;
  const s = t.stale ? -25 : 0;
  return p + u + e + s;
}

/**
 * Pick the top `count` tasks from `pool`, sorted by score descending,
 * with at most `maxPerVenture` tasks from each venture.
 */
export function pickTopTasks(
  pool: Task[],
  count: number,
  maxPerVenture = 99
): Task[] {
  const sorted = [...pool].sort((a, b) => scoreTask(b) - scoreTask(a));
  const result: Task[] = [];
  const ventureCounts: Record<string, number> = {};

  for (const t of sorted) {
    if (result.length >= count) break;
    const vc = ventureCounts[t.venture] ?? 0;
    if (vc >= maxPerVenture) continue;
    result.push(t);
    ventureCounts[t.venture] = vc + 1;
  }

  return result;
}

/**
 * Estimate total effort-hours for a list of tasks.
 * Uses CONFIG.effortHours (1.5 hrs / effort point) as the conversion factor.
 */
export function estimateHours(tasks: Task[], effortHoursPerPoint = 1.5): number {
  return tasks.reduce((sum, t) => sum + (t.effort || 1) * effortHoursPerPoint, 0);
}

/**
 * Compute venture health colour based on task composition.
 *   red    → has any Critical + Now tasks
 *   yellow → has any High + Now tasks
 *   green  → otherwise
 */
export function computeAutoHealth(tasks: Task[]): 'red' | 'yellow' | 'green' {
  const pending = tasks.filter(t => !t.stale);
  if (pending.some(t => t.priority === 'Critical' && t.urgency === 'Now')) return 'red';
  if (pending.some(t => t.priority === 'High'     && t.urgency === 'Now')) return 'yellow';
  return 'green';
}
