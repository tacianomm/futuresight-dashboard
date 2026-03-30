# FutureSight Ventures Dashboard — `app-v2`

A full Next.js 15 + TypeScript rewrite of the FutureSight Ventures task dashboard. Tracks tasks, venture health, playbook artifacts, and priorities across six active ventures — with live sync to Google Tasks and persistent state via Supabase.

> **Branch strategy:** `main` holds the original static HTML version (currently deployed to Vercel). This branch (`app-v2`) is the Next.js rewrite — deploy it separately when ready.

---

## Features

- **Multi-venture dashboard** across FlowAR, HomeServices, Legal Agent, Sona/Dental, Voice Platform, and General
- **Live Google Tasks sync** — OAuth login, auto-sync on load, check/uncheck tasks in real time
- **Stats bar** — Today's Focus count, This Week's top 20, Critical Now (per-venture), and Completed breakdown
- **Focus panels** — collapsible Today and This Week task lists with venture color coding
- **Venture overview cards** — stage progress, health indicator, pending/critical/total counts, and top tasks per venture
- **SVG charts** — Task Status donut, By Priority donut, Active vs Done stacked bar by project
- **Per-venture panel** — health bar with manual override pills, stage progress tracker, playbook artifact tracker, and top priority task list
- **Task table** — sortable, filterable by venture/priority/urgency/category/status, with search
- **Kanban board** — Now / Soon / Later columns with venture color, priority icons, source badges
- **Playbook tracker** — 17 global artifacts with per-stage expected statuses, clickable status cycle
- **Persistent state** — task done state and auth token survive page refresh via `localStorage`

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| State | Zustand 5 with `useShallow` |
| Database | Supabase (tasks, task_states, playbook_states) |
| Auth | Google Identity Services (client-side OAuth, no server needed) |
| Styling | CSS custom properties + utility classes in `globals.css` |
| Charts | Pure SVG (no Chart.js dependency) |

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) copy env file and fill in your own values
cp .env.local.example .env.local

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

Environment variables are optional — defaults are already set in `lib/config.ts`. Override via `.env.local` if you want to point at a different Supabase project or Google OAuth client.

---

## Deploy to Vercel

```bash
# Deploy this branch as a separate Vercel project (keeps main untouched)
npx vercel --prod
```

After deploying, add your new Vercel URL to **Authorized JavaScript Origins** in your Google Cloud Console OAuth 2.0 credential.

---

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GEMINI_API_KEY=
```

---

## Project structure

```
app/
  layout.tsx          Root layout — loads Google GIS script
  page.tsx            Entry point
  globals.css         All CSS variables, tokens, and component styles

components/
  Dashboard.tsx       Top-level shell; initialises data on mount
  Header.tsx          Logo, sync status, user chip, source badges
  StatsBar.tsx        Today's Focus / This Week / Critical Now / Completed
  FocusPanels.tsx     Collapsible Today and Week task panels
  VentureNav.tsx      Venture tabs + overview cards grid
  ChartsSection.tsx   Task Status donut, Priority donut, Active Tasks bar chart
  TaskSection.tsx     Filters, search, view toggle (Table / Kanban)
  TaskTable.tsx       Sortable table view with all columns
  KanbanBoard.tsx     Now / Soon / Later kanban with venture colors
  VenturePanel.tsx    Stage tracker, playbook, health bar, top tasks
  VentureChartsSection.tsx  Per-venture completion, status, category, priority charts

hooks/
  useGoogleAuth.ts    Google OAuth token management and sync orchestration
  useSupabase.ts      Loads DB state (tasks, task_states, playbook_states) on mount

lib/
  config.ts           Venture metadata, stage labels, playbook artifact definitions
  supabase.ts         Supabase client + typed DB helpers
  scoring.ts          scoreTask(), pickTopTasks(), computeAutoHealth()
  normalize.ts        normalizeTitle(), titleSimilarity() for dedup
  googleTasks.ts      Google Tasks API fetch and patch helpers

store/
  dashboard.ts        Zustand store — all global state and actions

types/
  index.ts            All TypeScript interfaces (Task, Venture, VentureInfo, …)
```

---

## Supabase schema

Three tables drive the dynamic state:

| Table | Purpose |
|---|---|
| `tasks` | All task records synced from Google Tasks |
| `task_states` | Per-task overrides: status, priority, urgency, category, effort |
| `playbook_states` | Per-venture playbook artifact statuses |

---

## Otter sync

Claude can sync Otter.ai meeting action items directly into the `tasks` table on request. See `../OTTER-SYNC.md` for the workflow.
