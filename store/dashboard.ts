'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Task, GoogleTask, PlaybookState, Venture,
  FilterState, SortState, SortKey, ViewMode,
} from '@/types';
import { pickTopTasks } from '@/lib/scoring';
import { normalizeTitle } from '@/lib/normalize';
import { upsertTaskState, upsertVentureStatus, upsertVentureNote } from '@/lib/supabase';
// upsertTaskState used in toggleDone; others used in setVentureStatus/Note

// ─── Sub-state shapes ──────────────────────────────────────────────────────────

interface DBState {
  ready: boolean;
  tasks: Task[] | null;           // loaded from Supabase `tasks` table
  taskDone: Record<string, boolean>;
  playbook: PlaybookState;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  tokenExpiry: number | null;     // Unix ms
  userEmail: string | null;
  userAvatar: string | null;
}

interface OtterBadge {
  count: number;
  latestDate: string | null;      // 'Mar 17' format
}

// ─── Full store shape ──────────────────────────────────────────────────────────

interface DashboardStore {
  // ── data ──
  db: DBState;
  googleTasks: Record<string, GoogleTask>;
  otterBadge: OtterBadge;

  // ── auth ──
  auth: AuthState;

  // ── UI ──
  activeVenture: Venture | null;
  filters: FilterState;
  sort: SortState;
  view: ViewMode;
  syncStatus: 'ok' | 'syncing' | 'warn' | 'off';
  syncMessage: string;
  todayOpen: boolean;
  weekOpen: boolean;
  showSyncReport: boolean;
  syncReport: Record<string, unknown> | null;

  // ── derived (recomputed after data changes) ──
  todayTasks: Task[];
  weekTasks: Task[];

  // ── actions ──
  setDB: (partial: Partial<DBState>) => void;
  setAuth: (partial: Partial<AuthState>) => void;
  setGoogleTasks: (map: Record<string, GoogleTask>) => void;
  setOtterBadge: (badge: OtterBadge) => void;
  setActiveVenture: (v: Venture | null) => void;
  setFilter: (partial: Partial<FilterState>) => void;
  setSort: (key: SortKey) => void;
  setView: (view: ViewMode) => void;
  setSyncStatus: (status: 'ok' | 'syncing' | 'warn' | 'off', msg: string) => void;
  setSyncReport: (report: Record<string, unknown> | null) => void;
  togglePanel: (which: 'today' | 'week') => void;

  // task done toggle — persists to Supabase
  toggleDone: (taskKey: string, done: boolean, venture?: string) => void;

  // playbook artifact update — persists to Supabase
  setPlaybookStatus: (venture: string, artifact: string, status: string) => void;
  setVentureStatus: (venture: string, status: string) => void;
  setVentureNote: (venture: string, note: string) => void;

  // recompute focus lists
  recomputeFocus: () => void;

  // clear Google auth
  signOut: () => void;
}

// ─── Default filter state ──────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  search:        '',
  priority:      'all',
  urgency:       'all',
  category:      'all',
  status:        'all',
  showCompleted: false,
};

// ─── Helper: task key from name ───────────────────────────────────────────────

function taskKeyFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDashboard = create<DashboardStore>()(
  persist(
    (set, get) => ({
      db: {
        ready:    false,
        tasks:    null,
        taskDone: {},
        playbook: {},
      },
      googleTasks:   {},
      otterBadge:    { count: 0, latestDate: null },
      auth: {
        isAuthenticated: false,
        token:           null,
        tokenExpiry:     null,
        userEmail:       null,
        userAvatar:      null,
      },
      activeVenture: null,
      filters:       DEFAULT_FILTERS,
      sort:          { key: 'priority', dir: 'asc' },
      view:          'table',
      syncStatus:    'off',
      syncMessage:   'Not connected',
      todayOpen:     true,
      weekOpen:      false,
      showSyncReport:false,
      syncReport:    null,
      todayTasks:    [],
      weekTasks:     [],

      // ── setters ──────────────────────────────────────────────────────────────

      setDB: (partial) => {
        set((s) => ({ db: { ...s.db, ...partial } }));
        get().recomputeFocus();
      },

      setAuth: (partial) => set((s) => ({ auth: { ...s.auth, ...partial } })),

      setGoogleTasks: (map) => set({ googleTasks: map }),

      setOtterBadge: (badge) => set({ otterBadge: badge }),

      setActiveVenture: (v) => {
        set({ activeVenture: v });
        get().recomputeFocus();
      },

      setFilter: (partial) => set((s) => ({ filters: { ...s.filters, ...partial } })),

      setSort: (key) =>
        set((s) => ({
          sort: {
            key,
            dir: s.sort.key === key && s.sort.dir === 'asc' ? 'desc' : 'asc',
          },
        })),

      setView: (view) => set({ view }),

      setSyncStatus: (syncStatus, syncMessage) => set({ syncStatus, syncMessage }),

      setSyncReport: (syncReport) => set({ syncReport, showSyncReport: syncReport !== null }),

      togglePanel: (which) =>
        set((s) =>
          which === 'today' ? { todayOpen: !s.todayOpen } : { weekOpen: !s.weekOpen }
        ),

      // ── task done ─────────────────────────────────────────────────────────────

      toggleDone: (taskKey, done, venture = '') => {
        set((s) => {
          const taskDone = { ...s.db.taskDone };
          if (done) taskDone[taskKey] = true;
          else delete taskDone[taskKey];
          return { db: { ...s.db, taskDone } };
        });
        // Persist to Supabase (fire-and-forget)
        if (get().db.ready) {
          upsertTaskState(taskKey, venture, done).catch(console.error);
        }
        get().recomputeFocus();
      },

      // ── playbook ──────────────────────────────────────────────────────────────

      setPlaybookStatus: (venture, artifact, status) => {
        set((s) => {
          const playbook = { ...s.db.playbook };
          if (!playbook[venture]) playbook[venture] = {};
          playbook[venture] = { ...playbook[venture], [artifact]: status };
          return { db: { ...s.db, playbook } };
        });
        import('@/lib/supabase').then(({ upsertPlaybookState }) =>
          upsertPlaybookState(venture, artifact, status).catch(console.error)
        );
      },

      setVentureStatus: (venture, status) => {
        set((s) => {
          const playbook = { ...s.db.playbook };
          if (!playbook[venture]) playbook[venture] = {};
          playbook[venture] = { ...playbook[venture], _venture_status: status };
          return { db: { ...s.db, playbook } };
        });
        upsertVentureStatus(venture, status).catch(console.error);
      },

      setVentureNote: (venture, note) => {
        set((s) => {
          const playbook = { ...s.db.playbook };
          if (!playbook[venture]) playbook[venture] = {};
          playbook[venture] = { ...playbook[venture], _venture_note: note };
          return { db: { ...s.db, playbook } };
        });
        upsertVentureNote(venture, note).catch(console.error);
      },

      // ── sign out ──────────────────────────────────────────────────────────────

      signOut: () => {
        set({
          auth: {
            isAuthenticated: false,
            token:           null,
            tokenExpiry:     null,
            userEmail:       null,
            userAvatar:      null,
          },
          googleTasks:  {},
          syncStatus:   'off',
          syncMessage:  'Disconnected',
        });
      },

      // ── recomputeFocus ────────────────────────────────────────────────────────

      recomputeFocus: () => {
        const { db, activeVenture } = get();
        const tasks = db.tasks ?? [];

        const pending = tasks.filter((t) => {
          const key = taskKeyFromName(t.name);
          return !db.taskDone[key];
        });

        const pool = activeVenture
          ? pending.filter((t) => t.venture === activeVenture)
          : pending;

        const nowPool = pool.filter((t) => t.urgency === 'Now');

        const todayTasks = pickTopTasks(nowPool,  5,  2);
        const weekTasks  = pickTopTasks(pool,     20, 5);

        set({ todayTasks, weekTasks });
      },
    }),

    // ── persistence (only auth token + done state + view preference) ──────────
    {
      name:    'fs-dashboard-v2',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage)
      ),
      partialize: (s) => ({
        auth:      { token: s.auth.token, tokenExpiry: s.auth.tokenExpiry },
        taskDone:  s.db.taskDone,   // stored at top level to avoid nested merge issues
        view:      s.view,
        todayOpen: s.todayOpen,
        weekOpen:  s.weekOpen,
      }),
      // Deep-merge persisted fields back into the full initial state.
      // Without this, Zustand's default shallow merge would replace the entire
      // `db` object with just `{ taskDone }`, wiping out `playbook`, `tasks`, etc.
      merge: (persisted, current) => {
        const p = persisted as {
          auth?:      { token?: string | null; tokenExpiry?: number | null };
          taskDone?:  Record<string, boolean>;
          view?:      typeof current.view;
          todayOpen?: boolean;
          weekOpen?:  boolean;
        };
        return {
          ...current,
          view:      p.view      ?? current.view,
          todayOpen: p.todayOpen ?? current.todayOpen,
          weekOpen:  p.weekOpen  ?? current.weekOpen,
          auth: {
            ...current.auth,
            token:       p.auth?.token       ?? null,
            tokenExpiry: p.auth?.tokenExpiry  ?? null,
          },
          db: {
            ...current.db,               // keeps ready:false, tasks:null, playbook:{}
            taskDone: p.taskDone ?? {},  // restores persisted completion state
          },
        };
      },
    }
  )
);

// ─── Selector helpers (memoised) ──────────────────────────────────────────────

/** All tasks filtered by activeVenture */
export function selectVentureTasks(state: DashboardStore): Task[] {
  const tasks = state.db.tasks ?? [];
  return state.activeVenture
    ? tasks.filter((t) => t.venture === state.activeVenture)
    : tasks;
}

/** Compute task status string (done / google status / defaultStatus / To Do) */
export function resolveTaskStatus(
  task: Task,
  taskDone: Record<string, boolean>,
  googleTasks: Record<string, GoogleTask>
): string {
  const key = taskKeyFromName(task.name);
  if (taskDone[key]) return 'Completed';
  const gKey = normalizeTitle(task.name);
  const googleTask = googleTasks[gKey];
  if (googleTask?.status === 'completed') return 'Completed';
  if (task.stale) return 'Backlog';
  return task.defaultStatus ?? 'To Do';
}
