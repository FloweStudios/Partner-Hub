// api/db.js
// Single endpoint for all database operations.
// SUPABASE_URL and SUPABASE_ANON_KEY live only in Vercel env vars.
// The frontend calls POST /api/db with { action, payload } — never touches Supabase directly.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

// Lightweight Supabase REST helper — no SDK needed
async function query(path, method = 'GET', body = null, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not set.' });
  }

  const { action, payload } = req.body;

  try {
    switch (action) {

      // ─── CLIENTS ────────────────────────────────────────────────────────────

      case 'getClients': {
        const clients = await query('clients', 'GET', null, '?order=created_at.asc');
        return res.json(clients);
      }

      case 'addClient': {
        const { name, site, primary_contact, primary_email, contact_emails, since, type, depts, avatar_color } = payload;
        const result = await query('clients', 'POST', {
          name, site, primary_contact, primary_email,
          contact_emails: contact_emails || [],
          since, type, depts: depts || [],
          avatar_color: avatar_color || 'av-navy',
        });
        return res.json(result[0]);
      }

      case 'updateClient': {
        const { id, ...fields } = payload;
        const result = await query(`clients?id=eq.${id}`, 'PATCH', fields);
        return res.json(result);
      }

      case 'addContactEmail': {
        // Fetch current emails, append, update
        const current = await query(`clients?id=eq.${payload.client_id}&select=contact_emails`);
        const existing = current[0]?.contact_emails || [];
        if (existing.includes(payload.email)) return res.json({ ok: true });
        const updated = [...existing, payload.email];
        await query(`clients?id=eq.${payload.client_id}`, 'PATCH', { contact_emails: updated });
        return res.json({ ok: true, contact_emails: updated });
      }

      // ─── NOTES ──────────────────────────────────────────────────────────────

      case 'getNotes': {
        const notes = await query(
          `notes?client_id=eq.${payload.client_id}&order=created_at.desc`
        );
        return res.json(notes);
      }

      case 'addNote': {
        const result = await query('notes', 'POST', {
          client_id: payload.client_id,
          author: payload.author,
          text: payload.text,
        });
        return res.json(result[0]);
      }

      // ─── THREADS ────────────────────────────────────────────────────────────

      case 'getThreads': {
        const threads = await query(
          `threads?client_id=eq.${payload.client_id}&order=raw_date.desc`
        );
        return res.json(threads);
      }

      case 'upsertThreads': {
        // Insert threads, ignore conflicts on primary key (gmail_thread_id + client_id)
        // so re-syncing never creates duplicates
        if (!payload.threads || payload.threads.length === 0) return res.json({ ok: true });
        await fetch(`${SUPABASE_URL}/rest/v1/threads`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates',
          },
          body: JSON.stringify(payload.threads),
        });
        return res.json({ ok: true });
      }

      // ─── PM DEPARTMENTS ─────────────────────────────────────────────────────

      case 'getPMDepartments': {
        const pms = await query('pm_departments');
        return res.json(pms);
      }

      case 'upsertPMDepartment': {
        await fetch(`${SUPABASE_URL}/rest/v1/pm_departments`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            pm_email: payload.pm_email,
            pm_name: payload.pm_name,
            department: payload.department,
          }),
        });
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ error: err.message });
  }
}
