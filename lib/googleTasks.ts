import type { Task, GoogleTask, SyncReport, Venture } from '@/types';
import { normalizeTitle, findVentureForList } from './normalize';
import { CONFIG } from './config';

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1';

// ─── Fetch all Google Tasks lists + tasks ─────────────────────────────────────

export async function fetchAllGoogleTasks(
  token: string,
  taskSource: Task[]
): Promise<{ map: Record<string, GoogleTask>; report: SyncReport }> {
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch lists
  const listsRes = await fetch(`${TASKS_API}/users/@me/lists?maxResults=20`, { headers });
  if (listsRes.status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const listsData = await listsRes.json();
  const allLists: Array<{ id: string; title: string }> = listsData.items || [];

  // Build template key → task lookup for cross-list matching
  const templateKeyMap: Record<string, Task> = {};
  for (const t of taskSource) templateKeyMap[normalizeTitle(t.name)] = t;

  const googleTaskMap: Record<string, GoogleTask> = {};
  const matchedListIds = new Set<string>();

  for (const list of allLists) {
    const venture = findVentureForList(list.title, CONFIG.listMap) as Venture | null;
    const tasksRes = await fetch(
      `${TASKS_API}/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=true&showHidden=true&maxResults=100`,
      { headers }
    );
    const tasksData = await tasksRes.json();
    for (const item of tasksData.items || []) {
      const key = normalizeTitle(item.title);
      if (venture) {
        matchedListIds.add(list.id);
        googleTaskMap[key] = {
          id:        item.id,
          listId:    list.id,
          listTitle: list.title,
          title:     item.title,
          venture,
          status:    item.status,
        };
      } else if (templateKeyMap[key]) {
        const tmpl = templateKeyMap[key];
        matchedListIds.add(list.id);
        googleTaskMap[key] = {
          id:        item.id,
          listId:    list.id,
          listTitle: list.title,
          title:     item.title,
          venture:   tmpl.venture,
          status:    item.status,
        };
      }
    }
  }

  const matchedKeys = new Set(Object.keys(googleTaskMap));
  const report: SyncReport = {
    listsFound:   allLists.filter(l =>  findVentureForList(l.title, CONFIG.listMap)).map(l => l.title),
    listsSkipped: allLists.filter(l => !findVentureForList(l.title, CONFIG.listMap)).map(l => l.title),
    matched:      Object.values(googleTaskMap).map(t => ({ title: t.title, list: t.listTitle, status: t.status })),
    unmatched:    taskSource.map(t => t.name).filter(n => !matchedKeys.has(normalizeTitle(n))),
  };

  return { map: googleTaskMap, report };
}

// ─── Mark a Google Task complete / incomplete ─────────────────────────────────

export async function patchGoogleTask(
  token: string,
  listId: string,
  taskId: string,
  done: boolean
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  await fetch(`${TASKS_API}/lists/${listId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: done ? 'completed' : 'needsAction' }),
  });
}
