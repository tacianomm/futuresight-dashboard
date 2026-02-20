# FutureSight Task Dashboard

Interactive task tracker for FutureSight Ventures — syncs live with Google Tasks.

## Setup

1. Open `index.html`
2. In the `CONFIG` block near the top, replace `'YOUR_GOOGLE_CLIENT_ID'` with your Google Cloud OAuth 2.0 Client ID
3. Host on Vercel / Netlify / GitHub Pages

## Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project
2. Enable the **Google Tasks API**
3. Create an **OAuth 2.0 Client ID** (Web application type)
4. Add your hosting URL as an Authorized JavaScript Origin
5. Paste the Client ID into the `CONFIG` block in `index.html`

## Features

- 80+ tasks across 6 ventures (FlowAR, HomeServices, Legal Agent, Sona/Dental, Voice Platform, General)
- Live sync with Google Tasks (auto-syncs on page load)
- Table + Kanban views
- Filter by venture, priority, urgency, category, status
- Story point effort visualization
- Check/uncheck tasks — updates Google Tasks instantly
