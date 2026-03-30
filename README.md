# FutureSight Ventures Dashboard — `main`

A lightweight, zero-dependency task dashboard for FutureSight Ventures. Single HTML file — open it in a browser and it's running. Syncs live with Google Tasks via OAuth and persists state in Supabase.

> **Branch strategy:** `main` (this branch) is the original static HTML version, currently deployed to Vercel. The Next.js rewrite lives on the `app-v2` branch.

---

## Features

- **Multi-venture task view** across FlowAR, HomeServices, Legal Agent, Sona/Dental, Voice Platform, and General
- **Live Google Tasks sync** — OAuth login, auto-sync on load, check/uncheck tasks in real time
- **Stats bar** — Today's Focus, This Week's top 20, Critical Now, and Completed counts
- **Focus panels** — Today and Week task lists with venture color coding
- **Venture overview cards** — stage, health, pending/critical totals, and top tasks per venture
- **Charts** — Task Status doughnut, By Priority doughnut, Active vs Done stacked bar by project (Chart.js)
- **Per-venture panel** — health bar, stage progress tracker, playbook artifact tracker, top priority tasks
- **Task table** — sortable, filterable by venture / priority / urgency / category / status, with search
- **Kanban board** — Now / Soon / Later columns with venture colors and source badges
- **Playbook tracker** — 17 artifacts with per-stage expected statuses, clickable status cycle
- **Otter.ai badge** — highlights tasks sourced from Otter meeting transcripts

---

## Tech stack

| Layer | Choice |
|---|---|
| Structure | Single HTML file (`index.html`) |
| Language | Vanilla JavaScript (ES2020) |
| Auth | Google Identity Services (client-side OAuth) |
| Database | Supabase (tasks, task_states, playbook_states) |
| Charts | Chart.js (CDN) |
| Styling | Inline CSS custom properties |

No build step. No `npm install`. Just a file.

---

## Setup

### 1. Get a Google OAuth Client ID

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
2. Enable the **Google Tasks API**
3. Create an **OAuth 2.0 Client ID** (Web application type)
4. Add your hosting URL (e.g. `https://your-app.vercel.app`) as an **Authorized JavaScript Origin**
5. Copy the Client ID

### 2. Configure `index.html`

Open `index.html` and find the `CONFIG` block near the top. Paste in your values:

```js
const CONFIG = {
  clientId:     'YOUR_GOOGLE_CLIENT_ID',
  supabaseUrl:  'YOUR_SUPABASE_URL',
  supabaseKey:  'YOUR_SUPABASE_ANON_KEY',
  // ...
};
```

### 3. Run locally

Just open `index.html` in your browser — no server needed for local testing. For OAuth to work, serve it over HTTP (e.g. with VS Code Live Server or `npx serve .`).

---

## Deploy to Vercel

```bash
npx vercel --prod
```

Or connect the repo in the Vercel dashboard and it will deploy `index.html` automatically. After deploying, add your Vercel URL to **Authorized JavaScript Origins** in Google Cloud Console.

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
