'use client';

import { useEffect } from 'react';
import { useDashboard } from '@/store/dashboard';
import { loadDBState } from '@/lib/supabase';

/**
 * Initialises Supabase on mount, loads all data into the store,
 * and marks the DB as ready.  No props required.
 *
 * Uses individual primitive selectors (not object selectors) to avoid
 * the Zustand Object.is infinite-loop with 'use client' server snapshots.
 */
export function useSupabase() {
  // Select stable action references individually — no useShallow needed
  // because Zustand action functions are stable (same reference every render).
  const setDB         = useDashboard((s) => s.setDB);
  const setOtterBadge = useDashboard((s) => s.setOtterBadge);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { tasks, taskDone, playbook, otterTaskCount, latestOtterDate } =
          await loadDBState();

        if (cancelled) return;

        setDB({ ready: true, tasks, taskDone, playbook });

        if (otterTaskCount > 0) {
          const dateStr = latestOtterDate
            ? latestOtterDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : null;
          setOtterBadge({ count: otterTaskCount, latestDate: dateStr });
        }

        console.log(
          `[DB] ✓ Connected · ${tasks.length} tasks · ${Object.keys(taskDone).length} completions`
        );
      } catch (err) {
        console.error('[DB] Failed to load state:', err);
        setDB({ ready: false });
      }
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
