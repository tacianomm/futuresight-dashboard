import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import type { Task, TaskRow, TaskStateRow, PlaybookStateRow, PlaybookState } from '@/types';

// ─── Singleton Supabase client ────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  }
  return _client;
}

// ─── Row → domain type conversion ────────────────────────────────────────────

export function rowToTask(row: TaskRow): Task {
  return {
    venture:      row.venture,
    ventureLabel: row.venture_label,
    name:         row.name,
    desc:         row.description,
    category:     row.category,
    priority:     row.priority,
    urgency:      row.urgency,
    effort:       row.effort,
    source:       row.source,
    assignee:     row.assignee,
    meetingDate:  row.meeting_date,
    meetingTitle: row.meeting_title,
    otterLink:    row.otter_link,
    stale:        row.stale,
    isNew:        row.is_new,
    defaultStatus:row.default_status,
    _dbId:        row.id,
    _updatedAt:   row.updated_at,
  };
}

// ─── DB load — fetch all three tables in parallel ─────────────────────────────

export interface DBLoadResult {
  tasks: Task[];
  taskDone: Record<string, boolean>;
  playbook: PlaybookState;
  otterTaskCount: number;
  latestOtterDate: Date | null;
}

export async function loadDBState(): Promise<DBLoadResult> {
  const db = getSupabaseClient();

  const [taskRes, stateRes, pbRes] = await Promise.all([
    db.from('tasks').select('*'),
    db.from('task_states').select('*'),
    db.from('playbook_states').select('*'),
  ]);

  if (taskRes.error)  throw new Error(`tasks: ${taskRes.error.message}`);
  if (stateRes.error) throw new Error(`task_states: ${stateRes.error.message}`);
  if (pbRes.error)    throw new Error(`playbook_states: ${pbRes.error.message}`);

  const tasks = (taskRes.data as TaskRow[]).map(rowToTask);

  const taskDone: Record<string, boolean> = {};
  for (const row of stateRes.data as TaskStateRow[]) {
    if (row.done) taskDone[row.task_key] = true;
  }

  const playbook: PlaybookState = {};
  for (const row of pbRes.data as PlaybookStateRow[]) {
    if (!playbook[row.venture]) playbook[row.venture] = {};
    playbook[row.venture][row.artifact] = row.status;
  }

  const otterTasks = tasks.filter(t => t.source === 'otter');
  const otterDates = otterTasks
    .filter(t => t.meetingDate)
    .map(t => new Date(t.meetingDate!));
  const latestOtterDate = otterDates.length
    ? otterDates.sort((a, b) => b.getTime() - a.getTime())[0]
    : null;

  return {
    tasks,
    taskDone,
    playbook,
    otterTaskCount: otterTasks.length,
    latestOtterDate,
  };
}

// ─── Persist task done state ──────────────────────────────────────────────────

export async function upsertTaskState(
  taskKey: string,
  venture: string,
  done: boolean
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from('task_states').upsert(
    {
      task_key:   taskKey,
      venture,
      done,
      done_at:    done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'task_key' }
  );
  if (error) console.error('[DB] task_states upsert:', error.message);
}

// ─── Persist playbook artifact status ────────────────────────────────────────

export async function upsertPlaybookState(
  venture: string,
  artifact: string,
  status: string
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from('playbook_states').upsert(
    { venture, artifact, status, updated_at: new Date().toISOString() },
    { onConflict: 'venture,artifact' }
  );
  if (error) console.error('[DB] playbook_states upsert:', error.message);
}

// ─── Persist venture health / note ────────────────────────────────────────────

export async function upsertVentureStatus(venture: string, status: string): Promise<void> {
  return upsertPlaybookState(venture, '_venture_status', status);
}

export async function upsertVentureNote(venture: string, note: string): Promise<void> {
  return upsertPlaybookState(venture, '_venture_note', note);
}
