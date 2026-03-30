/**
 * Normalize a task title to a consistent key for matching/deduplication.
 * Strips non-alphanumeric, lowercases, collapses whitespace.
 */
export function normalizeTitle(t: string): string {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute the Supabase task_key slug from a name.
 * Matches the convention used in the Otter sync OTTER-SYNC.md.
 */
export function toTaskKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Compute fraction of meaningful words (len > 2) shared by two titles.
 * Requires at least 2 shared words; used for fuzzy deduplication.
 */
export function titleSimilarity(a: string, b: string): number {
  const words = (s: string) =>
    new Set(normalizeTitle(s).split(' ').filter(w => w.length > 2));
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  if (shared < 2) return 0;
  return shared / Math.max(wa.size, wb.size);
}

/**
 * Find the venture key for a Google Tasks list name (case-insensitive match).
 */
export function findVentureForList(
  listTitle: string,
  listMap: Record<string, string>
): string | null {
  if (listMap[listTitle]) return listMap[listTitle];
  const lower = (listTitle || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(listMap)) {
    if (key.toLowerCase().trim() === lower) return val;
  }
  return null;
}
