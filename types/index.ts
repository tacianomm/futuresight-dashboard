// ─── Core domain types ───────────────────────────────────────────────────────

export type Venture = 'flowar' | 'homeservices' | 'legal' | 'dental' | 'voice' | 'general';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Urgency = 'Now' | 'Soon' | 'Later';
export type Category = 'Strategy' | 'Product' | 'Engineering' | 'Operations' | 'GTM/Sales' | 'Research';
export type TaskStatus = 'To Do' | 'In Progress' | 'Blocked' | 'Backlog' | 'Completed';
export type TaskSource = 'claude' | 'otter' | 'google';
export type VentureHealth = 'red' | 'yellow' | 'green';

// ─── Task (maps directly from Supabase `tasks` table row) ────────────────────

export interface Task {
  venture: Venture;
  ventureLabel: string;
  name: string;
  desc: string;
  category: Category;
  priority: Priority;
  urgency: Urgency;
  effort: number; // 1–5  (1=hours, 5=weeks)
  source: TaskSource;
  assignee?: string;
  meetingDate?: string;   // YYYY-MM-DD
  meetingTitle?: string;
  otterLink?: string;
  stale?: boolean;
  isNew?: boolean;
  defaultStatus?: TaskStatus;
  // runtime fields (not stored in DB)
  googleKey?: string;     // normalised title used as Google Tasks key
  _dbId?: string;         // Supabase row UUID
  _updatedAt?: string;
}

// ─── Google Tasks ─────────────────────────────────────────────────────────────

export interface GoogleTask {
  id: string;
  listId: string;
  listTitle: string;
  title: string;
  venture: Venture;
  status: 'needsAction' | 'completed';
}

// ─── Playbook / venture health ────────────────────────────────────────────────

/** venture → artifact → status string */
export type PlaybookState = Record<string, Record<string, string>>;

export interface VentureInfo {
  key: Venture;
  label: string;
  cssVar: string;   // e.g. 'var(--flowar)'
  hex: string;      // e.g. '#3b82f6'
  stage: number;    // 1–5
}

// ─── Filter / sort / view state ───────────────────────────────────────────────

export interface FilterState {
  search: string;
  priority: string;
  urgency: string;
  category: string;
  status: string;
  showCompleted: boolean;
}

export type SortKey = 'venture' | 'name' | 'category' | 'priority' | 'urgency' | 'effort' | 'status';
export type SortDir = 'asc' | 'desc';
export interface SortState { key: SortKey; dir: SortDir }

export type ViewMode = 'table' | 'kanban';

// ─── Supabase row shapes ──────────────────────────────────────────────────────

export interface TaskRow {
  id: string;
  task_key: string;
  venture: Venture;
  venture_label: string;
  name: string;
  description: string;
  category: Category;
  priority: Priority;
  urgency: Urgency;
  effort: number;
  source: TaskSource;
  assignee?: string;
  meeting_date?: string;
  meeting_title?: string;
  otter_link?: string;
  stale: boolean;
  is_new: boolean;
  default_status?: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskStateRow {
  task_key: string;
  venture: string;
  done: boolean;
  done_at?: string;
  updated_at: string;
}

export interface PlaybookStateRow {
  venture: string;
  artifact: string;
  status: string;
  updated_at: string;
}

// ─── Sync report ─────────────────────────────────────────────────────────────

export interface SyncReport {
  listsFound: string[];
  listsSkipped: string[];
  matched: Array<{ title: string; list: string; status: string }>;
  unmatched: string[];
}
