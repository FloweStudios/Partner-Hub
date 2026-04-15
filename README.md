# Partner Hub — Longhouse (v2)

A shared client communication hub. Each PM connects their own Gmail — we only ever pull emails that involve addresses you've registered against a client. Nothing else is accessed.

---

## How email sync works

### Individual consent, not admin access

Each PM clicks **"Connect my Gmail"** in the sidebar. This opens Google's own OAuth consent screen, where the PM reads exactly what access they're granting and clicks Allow or Deny. There is no admin override — if a PM doesn't connect, their inbox is never touched.

### Filtered by client email addresses only

When a PM syncs, the app builds a Gmail search query from your client list:

```
(from:marcus@acmecorp.com OR to:marcus@acmecorp.com OR from:yuki@novarainc.com ...) newer_than:30d
```

Only threads matching at least one registered client address are fetched. Random emails, personal threads, internal team emails — none of that is ever requested or stored.

### Adding more contact emails

Each client has a `contactEmails` array. You can add aliases, CC addresses, or additional contacts per client using the **"Add email"** button on their profile. The next sync will pick up threads involving those addresses too.

---

## Setup

### 1. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign up, click **Add New → Project**
2. Upload this folder or connect a GitHub repo
3. Click **Deploy**

---

### 2. Set up Google OAuth (15 minutes)

This is simpler than domain-wide delegation — no Google Workspace admin required.

**Step 1 — Create a Google Cloud project**

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project → New Project**, name it `partner-hub`, create it

**Step 2 — Enable Gmail API**

1. Go to **APIs & Services → Library**
2. Search **Gmail API**, click **Enable**

**Step 3 — Create OAuth credentials**

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Partner Hub`
5. Authorised JavaScript origins: add your Vercel URL (e.g. `https://partner-hub.vercel.app`) and `http://localhost:3000` for local testing
6. Click **Create** — copy the **Client ID**

**Step 4 — Configure consent screen**

1. Go to **APIs & Services → OAuth consent screen**
2. User type: **Internal** (this means only people in your Google Workspace org can sign in — no external users)
3. Fill in app name (`Partner Hub`), support email, and developer email
4. Add scope: `https://www.googleapis.com/auth/gmail.readonly`
5. Save

**Step 5 — Add your Client ID to the app**

Open `app.js` and replace line 3:

```javascript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

with your actual Client ID from step 3.

That's it — no service accounts, no domain-wide delegation, no admin setup.

---

### 3. Add your Anthropic API key

For the AI pre-meeting brief to work, you need a Claude API key.

Since this is a static site (no backend), the simplest path for a small internal tool:

**Option A — Put it directly in app.js (easiest, fine for internal tools)**

In `app.js`, find the `generateBrief` function and add your key to the fetch headers:

```javascript
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_ANTHROPIC_API_KEY',
  'anthropic-version': '2023-06-01',
}
```

This is acceptable for an internal tool your team uses directly. The key is visible in the browser, but since only your team has access to the app, the risk is low.

**Option B — Vercel serverless function (more secure)**

Create `/api/brief.js` in your project:

```javascript
export default async function handler(req, res) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
}
```

Then in `app.js`, change the fetch URL from `https://api.anthropic.com/v1/messages` to `/api/brief`.

Add `ANTHROPIC_API_KEY` to your Vercel environment variables.

---

### 4. Map your team's emails to departments

In `app.js`, find the `guessDeptFromPM` function and update the map with your real team:

```javascript
const map = {
  'sarah@yourdomain.com':  'Design',
  'jamie@yourdomain.com':  'Paid Media',
  'priya@yourdomain.com':  'SEO',
  'dan@yourdomain.com':    'Dev',
};
```

This is how the timeline knows to label a thread from Sarah as "Design" automatically.

---

### 5. Add your real clients

In `app.js`, update the `clients` array at the top. For each client, make sure `contactEmails` lists every email address you've ever received mail from or sent mail to for that client:

```javascript
{
  id: 1,
  name: 'Acme Corp',
  site: 'acmecorp.com',
  primaryContact: 'Marcus Webb',
  primaryEmail: 'marcus@acmecorp.com',
  contactEmails: [
    'marcus@acmecorp.com',
    'accounts@acmecorp.com',    // billing contact
    'claire@acmecorp.com',      // secondary contact
  ],
  depts: ['Design', 'Paid Media'],
  // ... rest of fields
}
```

The more complete this list, the better the sync coverage.

---

## What each PM does on first use

1. Open the app
2. Click **"Connect my Gmail"** in the bottom-left sidebar
3. Google's consent screen appears — they read it, click **Allow**
4. Their inbox is searched for emails matching your client list
5. Matching threads appear in the timeline immediately

That's it. They can disconnect at any time by clicking the × next to their name.

---

## Privacy design decisions

| Decision | Reason |
|---|---|
| Individual OAuth, not domain-wide | PMs explicitly choose to participate. No one is opted in without consent. |
| Read-only Gmail scope | The app can never send, delete, or modify any email. |
| Client email filter | We never fetch or store any email that isn't related to a registered client. Personal emails, internal team emails — none of it is touched. |
| Tokens stored in localStorage | Tokens are local to that browser/device. They expire in 1 hour. We never send them to a server. |
| Internal OAuth consent screen | Only people in your Google Workspace org can authorise — no external accounts. |

---

## File structure

```
partner-hub/
├── index.html      ← App shell, sidebar with Gmail connect panel
├── style.css       ← Longhouse brand styles (unchanged)
├── app.js          ← All logic: OAuth flow, email filtering, sync, AI brief
└── README.md       ← This file
```

---

## Iterating with Claude

Good prompts to extend this:

- *"Add a 'Sync all' button that refreshes all connected PMs at once"*
- *"When a PM disconnects their Gmail, remove their threads from the timeline"*
- *"Add a settings panel where each PM can set a silence threshold (e.g. 7 days) per client"*
- *"Store client data and notes in Supabase instead of the local array"*
- *"Show which PM's Gmail each thread came from in the timeline"*

---

## Cost summary

| Service | Free tier | Notes |
|---|---|---|
| Vercel | 100GB bandwidth/month | Free for small teams |
| Gmail API | Unlimited | Free forever |
| Google OAuth | Unlimited | Free forever |
| Claude API | — | ~$2–10/month |
| **Total** | **~$2–10/month** | Just the AI |
