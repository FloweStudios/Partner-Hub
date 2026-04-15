# Partner Hub — Longhouse

A shared client communication hub for your team. See every email, note, and alert for every client — across every department — in one place.

---

## What it does

- **Unified timeline** — all emails to/from a client, tagged by department and PM, in one chronological feed
- **Team notes** — sticky context visible to every PM ("Marcus prefers calls over email")
- **Silence alerts** — flags clients who haven't been contacted in X days
- **AI pre-meeting brief** — one click generates a summary of the relationship, open items, and talking points
- **Add clients** — quickly register new clients and the departments involved

---

## Stack

| Layer | Tool | Cost |
|---|---|---|
| Frontend | HTML/CSS/JS (no framework needed) | Free |
| Hosting | Vercel | Free |
| Email sync | Gmail API (domain-wide) | Free |
| Database | Supabase | Free tier |
| AI briefs | Claude API (Haiku 4.5) | ~$2–10/month |

---

## Setup — step by step

### 1. Deploy to Vercel (5 minutes)

1. Go to [vercel.com](https://vercel.com) and sign up with your Google account
2. Click **Add New → Project**
3. Upload this folder (drag and drop, or connect a GitHub repo)
4. Click **Deploy** — you'll get a live URL like `partner-hub.vercel.app`

That's it. The app is live.

---

### 2. Set up Gmail API (20 minutes)

This lets the hub read emails across all your team's inboxes automatically.

**Step 1 — Create a Google Cloud project**

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project → New Project**
3. Name it `partner-hub` and click **Create**

**Step 2 — Enable Gmail API**

1. In the left menu go to **APIs & Services → Library**
2. Search for **Gmail API** and click **Enable**

**Step 3 — Create a Service Account**

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → Service Account**
3. Name it `partner-hub-sync`, click through and **Done**
4. Click the service account you just created
5. Go to **Keys → Add Key → Create new key → JSON**
6. Download the JSON file — keep it safe, don't commit it to GitHub

**Step 4 — Enable Domain-Wide Delegation**

1. Still on the service account page, click **Edit**
2. Check **Enable Google Workspace Domain-wide Delegation**
3. Save

**Step 5 — Authorise in Google Workspace Admin**

1. Go to [admin.google.com](https://admin.google.com)
2. Navigate to **Security → Access and data control → API controls**
3. Click **Manage Domain Wide Delegation → Add new**
4. Paste your service account's **Client ID** (from the JSON file, field `client_id`)
5. Add this OAuth scope: `https://www.googleapis.com/auth/gmail.readonly`
6. Click **Authorise**

Your app can now read emails from all inboxes on your domain — no individual sign-in needed.

---

### 3. Set up Supabase (10 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New project**, name it `partner-hub`
3. Once created, go to **SQL Editor** and run this schema:

```sql
-- Clients table
create table clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  site text,
  primary_contact text,
  primary_email text,
  since text,
  type text,
  depts text[],
  avatar_color text,
  created_at timestamp default now()
);

-- Team notes table
create table notes (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  author text not null,
  text text not null,
  created_at timestamp default now()
);

-- Email threads cache table
create table threads (
  id text primary key,
  client_id uuid references clients(id) on delete cascade,
  sender_name text,
  sender_email text,
  dept text,
  direction text,
  subject text,
  preview text,
  received_at timestamp,
  gmail_thread_id text
);

-- Silence rules table
create table silence_rules (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  threshold_days integer default 7
);
```

4. Go to **Settings → API** and copy:
   - **Project URL** → your `SUPABASE_URL`
   - **anon public key** → your `SUPABASE_ANON_KEY`

---

### 4. Add your API keys (5 minutes)

In your Vercel project, go to **Settings → Environment Variables** and add:

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contents of the JSON file from step 2 |

Then redeploy — Vercel picks up env vars automatically.

---

### 5. Connect Gmail sync (when you're ready to go live)

The current version uses sample data so you can test everything first. When you're ready to wire in real emails, update `app.js` to call your Supabase backend instead of the local `clients` array.

A simple sync function to add to a Vercel serverless function (`/api/sync-gmail.js`):

```javascript
// /api/sync-gmail.js
// Runs on a cron or webhook — fetches new emails and stores them in Supabase

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  
  const auth = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/gmail.readonly'],
    'your-pm@yourdomain.com' // impersonate this user
  );

  const gmail = google.gmail({ version: 'v1', auth });

  // Fetch recent messages
  const messages = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 50,
    q: 'newer_than:7d'
  });

  // Process and store in Supabase...
  // (match sender/recipient to client by email domain)
  
  res.json({ synced: messages.data.messages?.length || 0 });
}
```

Set this up as a Vercel cron job to run every 30 minutes and you'll have live email data.

---

## Iterating with Claude

This project is designed to be easy to vibe-code. When you want to add a feature, paste the relevant file into Claude and describe what you want.

**Good prompts to use:**

- *"Add a department filter to the sidebar so I can show only threads from Design"*
- *"Add a health score to each client card based on days since last contact and number of open items"*
- *"Build a settings page where I can configure how many days before a silence alert triggers"*
- *"Add a handoff summary feature — when I click handoff, generate an AI summary of the relationship for a new PM"*
- *"Replace the sample data with real Supabase queries using this schema: [paste schema]"*

---

## File structure

```
partner-hub/
├── index.html      ← Main app shell and modal
├── style.css       ← All styles (Longhouse brand tokens)
├── app.js          ← All logic, data, AI brief generation
└── README.md       ← This file
```

When you're ready to grow into a proper Next.js app with auth, just ask Claude to scaffold it — the design and logic here can be ported directly.

---

## Costs summary

| Service | Free tier | Paid starts at |
|---|---|---|
| Vercel | 100GB bandwidth/month | $20/month |
| Supabase | 500MB database, 2GB transfer | $25/month |
| Gmail API | Unlimited | Free forever |
| Claude API | — | ~$2–10/month for your usage |
| **Total** | **$0** | **~$2–10/month** |

A team of 2–5 will likely stay on the free tier for everything except the AI, which will cost a few dollars a month.
