// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

const DEPT_COLORS = {
  'Design':     'dept-design',
  'Paid Media': 'dept-paid',
  'SEO':        'dept-seo',
  'Dev':        'dept-dev',
  'Client':     'dept-client',
};

const AVATAR_COLORS = ['av-navy','av-teal','av-cyan','av-blue','av-deep'];

// ─── STATE ───────────────────────────────────────────────────────────────────

let allClients = [];        // loaded from Supabase
let pmDepartments = {};     // { 'email@domain.com': 'Design', ... } loaded from Supabase
let activeClientId = null;
let activeTab = 'timeline';

// Gmail tokens stay in localStorage only — never sent to any server
let connectedPMs = JSON.parse(localStorage.getItem('connectedPMs') || '[]');

// ─── DB HELPERS ──────────────────────────────────────────────────────────────
// All DB calls go through /api/db — Supabase keys never touch the browser

async function db(action, payload = {}) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Database error');
  }
  return res.json();
}

// ─── INIT ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  loadGoogleIdentityScript();
  await Promise.all([loadClients(), loadPMDepartments()]);
  renderConnectedPMs();
  if (allClients.length > 0) selectClient(allClients[0].id);
});

// ─── LOAD DATA FROM SUPABASE ─────────────────────────────────────────────────

async function loadClients() {
  try {
    const rows = await db('getClients');
    // Normalise DB column names → camelCase for the UI
    allClients = rows.map(normaliseClient);
    renderClientList(allClients);
  } catch (err) {
    showToast('Could not load clients — check Supabase setup');
    console.error(err);
  }
}

async function loadPMDepartments() {
  try {
    const rows = await db('getPMDepartments');
    pmDepartments = {};
    rows.forEach(r => { pmDepartments[r.pm_email.toLowerCase()] = r.department; });
  } catch (err) {
    console.error('Could not load PM departments:', err);
  }
}

async function loadThreadsForClient(clientId) {
  try {
    const rows = await db('getThreads', { client_id: clientId });
    return rows.map(normaliseThread);
  } catch (err) {
    console.error('Could not load threads:', err);
    return [];
  }
}

async function loadNotesForClient(clientId) {
  try {
    return await db('getNotes', { client_id: clientId });
  } catch (err) {
    console.error('Could not load notes:', err);
    return [];
  }
}

// ─── NORMALISE DB ROWS ───────────────────────────────────────────────────────
// Supabase returns snake_case — map to the camelCase the UI expects

function normaliseClient(row) {
  return {
    id: row.id,
    name: row.name,
    site: row.site || '—',
    since: row.since || '—',
    type: row.type || 'New',
    primaryContact: row.primary_contact || '—',
    primaryEmail: row.primary_email || '',
    contactEmails: row.contact_emails || [],
    depts: row.depts || [],
    avatarColor: row.avatar_color || 'av-navy',
    silenceDays: row.silence_days || null,
    lastContact: '—',   // computed after threads load
    unread: false,
    threads: [],        // loaded on demand
    notes: [],          // loaded on demand
    alerts: [],         // computed after threads load
  };
}

function normaliseThread(row) {
  return {
    id: row.id,
    gmailThreadId: row.gmail_thread_id,
    senderName: row.sender_name,
    senderInitials: row.sender_initials,
    senderColor: row.sender_color,
    dept: row.dept,
    pmEmail: row.pm_email,
    direction: row.direction,
    time: row.time_display,
    dateGroup: row.date_group,
    subject: row.subject,
    preview: row.preview,
    rawDate: row.raw_date,
  };
}

// ─── GOOGLE IDENTITY SERVICES ─────────────────────────────────────────────────

function loadGoogleIdentityScript() {
  if (window.google?.accounts) return;
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.onerror = () => console.warn('Google Identity script failed to load.');
  document.head.appendChild(s);
}

// ─── OAUTH CONSENT FLOW ───────────────────────────────────────────────────────

async function connectMyGmail() {
  if (!window.google?.accounts) {
    showToast('Google sign-in not ready — try refreshing.');
    return;
  }

  // Fetch client ID from our serverless function — never hardcoded
  let clientId;
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    clientId = data.clientId;
  } catch {
    showToast('Could not load config — check Vercel env vars.');
    return;
  }

  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GMAIL_SCOPE,
    callback: async (tokenResponse) => {
      if (tokenResponse.error) {
        showToast('Gmail connection cancelled.');
        return;
      }

      // Get PM profile from Google
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });
      const profile = await profileRes.json();

      // If Google didn't return an email the token scope was rejected — bail out
      if (!profile.email) {
        showToast('Could not read Google profile — try reconnecting.');
        console.error('Google userinfo response:', profile);
        return;
      }

      const pm = {
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        initials: initials(profile.name || profile.email),
        accessToken: tokenResponse.access_token,
        tokenExpiry: Date.now() + (tokenResponse.expires_in * 1000),
        connectedAt: new Date().toISOString(),
      };

      // Update local PM list
      const idx = connectedPMs.findIndex(p => p.email === pm.email);
      if (idx > -1) connectedPMs[idx] = pm;
      else connectedPMs.push(pm);
      localStorage.setItem('connectedPMs', JSON.stringify(connectedPMs));

      // Save PM→department mapping to Supabase if we have one
      const dept = pmDepartments[pm.email.toLowerCase()];
      if (dept) {
        await db('upsertPMDepartment', {
          pm_email: pm.email,
          pm_name: pm.name,
          department: dept,
        });
      }

      renderConnectedPMs();
      showToast(`${pm.name}'s Gmail connected`);
      syncEmailsForPM(pm);
    }
  });

  client.requestAccessToken({ prompt: 'consent' });
}

function disconnectPM(email) {
  connectedPMs = connectedPMs.filter(p => p.email !== email);
  localStorage.setItem('connectedPMs', JSON.stringify(connectedPMs));
  renderConnectedPMs();
  showToast('Gmail disconnected');
}

// ─── EMAIL SYNC ───────────────────────────────────────────────────────────────

async function syncEmailsForPM(pm) {
  if (!pm?.accessToken) return;

  if (Date.now() > pm.tokenExpiry) {
    showToast(`${pm.name}'s token expired — please reconnect.`);
    return;
  }

  // Build Gmail search query from ALL registered partner emails only
  // Sanitise first — strip any entries that aren't plain email addresses
  // (guards against corrupted data where full header text was stored)
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const allContactEmails = [...new Set(
    allClients
      .flatMap(c => {
        const emails = c.contactEmails.length ? c.contactEmails : [];
        if (c.primaryEmail) emails.push(c.primaryEmail);
        return emails;
      })
      .map(e => (e || '').trim().toLowerCase())
      .filter(e => emailRegex.test(e))
  )];
  if (allContactEmails.length === 0) {
    showToast('Add partner contact emails before syncing.');
    return;
  }

  // Gmail query: separate from:/to: clauses — the {from:x to:x} shorthand is not supported
  const fromClauses = allContactEmails.map(e => `from:${e}`);
  const toClauses   = allContactEmails.map(e => `to:${e}`);
  const query = `${[...fromClauses, ...toClauses].join(' OR ')}`;

  showToast(`Syncing ${pm.name}'s emails...`);

  try {
    console.log('[Sync] Contact emails:', allContactEmails);
  console.log('[Sync] Gmail query:', query);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(query)}&maxResults=50`,
      { headers: { Authorization: `Bearer ${pm.accessToken}` } }
    );
    const listData = await listRes.json();

    console.log('[Sync] Gmail response:', JSON.stringify(listData));

    // If Gmail returned an API error object, surface it clearly
    if (listData.error) {
      console.error('[Sync] Gmail API error:', listData.error);
      showToast(`Gmail error: ${listData.error.message}`);
      return;
    }

    if (!listData.threads?.length) {
      showToast(`No matching emails found — check console for query details`);
      return;
    }

    // Fetch thread metadata in parallel
    const threads = await Promise.all(
      listData.threads.map(t =>
        fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${pm.accessToken}` } }
        ).then(r => r.json())
      )
    );

    // Match each thread to a client and build DB rows
    const threadRows = [];

    threads.forEach(thread => {
      const messages = thread.messages || [];
      if (!messages.length) return;

      // Check ALL messages in thread for client email involvement, not just the last
      const allInvolved = messages.flatMap(m => {
        const hdrs = m.payload?.headers || [];
        const get  = n => hdrs.find(h => h.name === n)?.value || '';
        return extractEmails(`${get('From')} ${get('To')} ${get('Cc')}`);
      });

      // Use last message for display (subject, date, preview, sender)
      const lastMsg = messages[messages.length - 1];
      const headers = lastMsg.payload?.headers || [];
      const getHeader = name => headers.find(h => h.name === name)?.value || '';

      const fromHeader = getHeader('From');
      const toHeader   = getHeader('To');
      const subject    = getHeader('Subject');
      const dateStr    = getHeader('Date');
      const snippet    = lastMsg.snippet || '';

      const involvedEmails = allInvolved;

      const matchedClient = allClients.find(c =>
        (c.contactEmails.length ? c.contactEmails : [c.primaryEmail])
          .some(ce => involvedEmails.includes(ce.toLowerCase()))
      );
      if (!matchedClient) return;

      const fromEmail  = extractEmails(fromHeader)[0] || '';
      const isOutbound = fromEmail === pm.email.toLowerCase();
      const date       = new Date(dateStr);

      threadRows.push({
        id: `${thread.id}-${matchedClient.id}`,
        gmail_thread_id: thread.id,
        client_id: matchedClient.id,
        sender_name: isOutbound
          ? pm.name
          : (fromHeader.split('<')[0].trim() || fromHeader),
        sender_initials: isOutbound
          ? pm.initials
          : initials(fromHeader.split('<')[0].trim() || 'CL'),
        sender_color: isOutbound ? 'av-teal' : 'av-blue',
        dept: isOutbound ? (pmDepartments[pm.email.toLowerCase()] || 'Team') : 'Client',
        pm_email: isOutbound ? pm.email : null,
        direction: isOutbound ? 'outbound' : 'inbound',
        subject: subject || '(no subject)',
        preview: snippet,
        raw_date: date.getTime(),
        date_group: getDateGroup(date),
        time_display: formatRelativeTime(date),
      });
    });

    console.log(`[Sync] Matched ${threadRows.length} thread rows to partners`);

    // Save to Supabase — duplicates are silently ignored
    if (threadRows.length > 0) {
      await db('upsertThreads', { threads: threadRows });
    }

    // Reload threads for every affected client and refresh the view
    const affectedClientIds = [...new Set(threadRows.map(t => t.client_id))];
    for (const cid of affectedClientIds) {
      const c = allClients.find(x => x.id === cid);
      if (!c) continue;
      c.threads = await loadThreadsForClient(cid);
      c.lastContact = c.threads[0]?.time || '—';
      // Re-render the main view if this is the currently selected partner
      if (cid === activeClientId) renderClientView(c);
    }

    // Refresh sidebar so lastContact times update
    renderClientList(allClients);

    showToast(`Synced ${threadRows.length} thread${threadRows.length !== 1 ? 's' : ''} for ${pm.name}`);

  } catch (err) {
    console.error('Sync error:', err);
    showToast(`Sync failed for ${pm.name}`);
  }
}

// ─── RENDER CONNECTED PMs ─────────────────────────────────────────────────────

function renderConnectedPMs() {
  const el = document.getElementById('pmStatus');
  if (!el) return;

  if (connectedPMs.length === 0) {
    el.innerHTML = `<div style="font-size:11px;color:rgba(213,232,247,0.3);padding:4px 8px;">No connections yet</div>`;
    return;
  }

  el.innerHTML = connectedPMs.map(pm => {
    const expired = Date.now() > pm.tokenExpiry;
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:var(--radius-sm);">
        <div style="width:24px;height:24px;border-radius:50%;background:${expired ? 'rgba(239,159,39,0.2)' : 'rgba(34,187,242,0.15)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${expired ? '#EF9F27' : 'var(--accent-1)'};flex-shrink:0;">${pm.initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:600;color:${expired ? '#EF9F27' : 'var(--white)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(pm.name)}</div>
          <div style="font-size:10px;color:rgba(213,232,247,0.4);">${expired ? 'Token expired' : 'Connected · read-only'}</div>
        </div>
        ${expired
          ? `<button onclick="connectMyGmail()" style="font-size:10px;font-weight:700;color:#EF9F27;background:rgba(239,159,39,0.1);border:1px solid rgba(239,159,39,0.2);border-radius:4px;padding:3px 7px;cursor:pointer;font-family:var(--font)">Refresh</button>`
          : `<button onclick="syncEmailsForPM(connectedPMs.find(p=>p.email==='${pm.email}'))" style="font-size:10px;font-weight:600;color:var(--accent-1);background:rgba(34,187,242,0.08);border:1px solid rgba(34,187,242,0.15);border-radius:4px;padding:3px 7px;cursor:pointer;font-family:var(--font)">Sync</button>`
        }
        <button onclick="disconnectPM('${pm.email}')" title="Disconnect" style="font-size:15px;color:rgba(213,232,247,0.25);background:none;border:none;cursor:pointer;line-height:1;padding:0 2px;font-family:var(--font)">×</button>
      </div>
    `;
  }).join('');
}

// ─── CLIENT LIST ─────────────────────────────────────────────────────────────

function renderClientList(list, updateCount = true) {
  const el = document.getElementById('clientList');
  // Always show TOTAL partner count in badge, even when list is filtered
  if (updateCount) document.getElementById('clientCount').textContent = allClients.length;

  if (list.length === 0) {
    el.innerHTML = `<div style="padding:24px 8px;font-size:12px;color:rgba(213,232,247,0.3);text-align:center;">No partners here.</div>`;
    return;
  }

  el.innerHTML = list.map(c => `
    <div class="client-item ${c.id === activeClientId ? 'active' : ''}" onclick="selectClient('${c.id}')">
      <div class="client-avatar ${c.avatarColor}">${initials(c.name)}</div>
      <div class="client-info">
        <div class="client-name">${escHtml(c.name)}</div>
        <div class="client-time">${c.lastContact}${c.silenceDays ? ` · <span style="color:#EF9F27">⚠ ${c.silenceDays}d silent</span>` : ''}</div>
      </div>
      ${c.unread ? '<div class="client-unread"></div>' : ''}
    </div>
  `).join('');
}

function filterClients(q) {
  const filtered = allClients.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.site.toLowerCase().includes(q.toLowerCase())
  );
  renderClientList(filtered);
}

// ─── SELECT CLIENT ────────────────────────────────────────────────────────────

async function selectClient(id) {
  activeClientId = id;
  activeTab = 'timeline';

  const c = allClients.find(x => x.id === id);
  if (!c) return;
  c.unread = false;

  // Always reload threads fresh from Supabase — covers post-sync updates
  c.threads = await loadThreadsForClient(id);
  if (c.threads.length > 0) c.lastContact = c.threads[0].time;

  // Notes only load once — they don't change via sync
  if (c.notes.length === 0) {
    c.notes = await loadNotesForClient(id);
  }

  renderClientList(allClients);
  renderClientView(c);
}

// ─── RENDER CLIENT VIEW ───────────────────────────────────────────────────────

function renderClientView(c) {
  const main = document.getElementById('main');

  const deptTagsHtml = c.depts.map(d =>
    `<span class="dept-tag ${DEPT_COLORS[d] || ''}">${d}</span>`
  ).join('');

  const emailPillsHtml = (c.contactEmails.length ? c.contactEmails : [c.primaryEmail])
    .filter(Boolean)
    .map(e => `<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(213,232,247,0.06);border:1px solid rgba(213,232,247,0.1);color:rgba(213,232,247,0.5);">${escHtml(e)}</span>`)
    .join('');

  const statsHtml = `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${c.threads.length}</div><div class="stat-label">Threads</div></div>
      <div class="stat-card"><div class="stat-value">${c.depts.length}</div><div class="stat-label">Departments</div></div>
      <div class="stat-card"><div class="stat-value">${c.notes.length}</div><div class="stat-label">Notes</div></div>
      <div class="stat-card"><div class="stat-value">${c.lastContact}</div><div class="stat-label">Last contact</div></div>
    </div>
  `;

  const alertsHtml = c.alerts.map(a => `
    <div class="alert-bar ${a.toLowerCase().includes('silent') || a.toLowerCase().includes('reply') ? 'alert-warn' : ''}">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ${escHtml(a)}
    </div>
  `).join('');

  main.innerHTML = `
    <div class="client-header">
      <div class="client-header-top">
        <div class="client-header-identity">
          <div class="client-header-avatar ${c.avatarColor}">${initials(c.name)}</div>
          <div>
            <div class="client-header-name">${escHtml(c.name)}</div>
            <div class="client-header-meta">${escHtml(c.site)} · ${escHtml(c.type)} · Partner since ${escHtml(c.since)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">${emailPillsHtml}</div>
          </div>
        </div>
        <div class="client-header-actions">
          <button class="btn-sm btn-outline" onclick="openAddEmailModal('${c.id}')">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add email
          </button>
          <button class="btn-sm btn-accent" onclick="switchTab('brief')">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Pre-meeting brief
          </button>
        </div>
      </div>
      <div class="dept-tags" style="margin-top:12px;">${deptTagsHtml}</div>
      ${statsHtml}
    </div>
    ${alertsHtml}
    <div class="tabs">
      <div class="tab ${activeTab === 'timeline' ? 'active' : ''}" onclick="switchTab('timeline')">Timeline</div>
      <div class="tab ${activeTab === 'notes' ? 'active' : ''}" onclick="switchTab('notes')">Team notes</div>
      <div class="tab ${activeTab === 'brief' ? 'active' : ''}" onclick="switchTab('brief')">AI brief</div>
    </div>
    <div id="tabContent" style="flex:1;overflow:hidden;display:flex;flex-direction:column;"></div>
  `;

  renderTab(c);
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => {
    const label = t.textContent.toLowerCase().replace(/\s/g, '');
    t.classList.toggle('active', label === tab || t.textContent.toLowerCase() === tab);
  });
  const c = allClients.find(x => x.id === activeClientId);
  if (c) renderTab(c);
}

function renderTab(c) {
  const el = document.getElementById('tabContent');
  if (!el) return;
  if (activeTab === 'timeline') el.innerHTML = renderTimeline(c);
  else if (activeTab === 'notes') el.innerHTML = renderNotes(c);
  else if (activeTab === 'brief') el.innerHTML = renderBrief(c);
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

function renderTimeline(c) {
  if (c.threads.length === 0) {
    return `
      <div class="timeline-container">
        <div style="padding:40px 0;text-align:center;color:rgba(213,232,247,0.35);">
          <div style="font-size:13px;margin-bottom:8px;">No emails synced yet.</div>
          <div style="font-size:12px;">Connect a Gmail account from the sidebar, then hit Sync.</div>
        </div>
      </div>
    `;
  }

  const groups = {};
  c.threads.forEach(t => {
    if (!groups[t.dateGroup]) groups[t.dateGroup] = [];
    groups[t.dateGroup].push(t);
  });

  const ORDER = ['Today','Yesterday','This week','Last week'];
  const sortedGroups = Object.keys(groups).sort((a, b) => {
    const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  let html = '<div class="timeline-container">';
  sortedGroups.forEach(grp => {
    html += `<div class="timeline-date-label">${grp}</div>`;
    groups[grp].forEach(t => {
      html += `
        <div class="thread-item">
          <div class="thread-avatar ${t.senderColor}">${escHtml(t.senderInitials)}</div>
          <div class="thread-body">
            <div class="thread-top">
              <span class="thread-name">${escHtml(t.senderName)}</span>
              <span class="thread-dept ${DEPT_COLORS[t.dept] || 'dept-client'}">${escHtml(t.dept)}</span>
              <span class="thread-time">${escHtml(t.time)}</span>
            </div>
            <div class="thread-subject">${escHtml(t.subject)}</div>
            <div class="thread-preview">${escHtml(t.preview)}</div>
          </div>
        </div>
      `;
    });
  });
  html += '</div>';
  return html;
}

// ─── NOTES ────────────────────────────────────────────────────────────────────

function renderNotes(c) {
  const notesHtml = c.notes.length > 0
    ? c.notes.map(n => `
        <div class="note-item">
          <div class="note-meta">
            <span class="note-author">${escHtml(n.author)}</span>
            <span class="note-date">${escHtml(new Date(n.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' }))}</span>
          </div>
          <div class="note-text">${escHtml(n.text)}</div>
        </div>
      `).join('')
    : `<div style="font-size:13px;color:rgba(213,232,247,0.35);padding:8px 0;">No notes yet — add the first one.</div>`;

  return `
    <div class="notes-panel" style="flex:1;overflow-y:auto;">
      <div class="notes-title">Shared team notes</div>
      <div id="notesList">${notesHtml}</div>
      <div class="note-add">
        <input class="note-input" type="text" placeholder="Add a note visible to all PMs..." id="noteInput" onkeydown="if(event.key==='Enter')submitNote('${c.id}')">
        <button class="note-submit" onclick="submitNote('${c.id}')">Add</button>
      </div>
    </div>
  `;
}

async function submitNote(clientId) {
  const input = document.getElementById('noteInput');
  const text = input.value.trim();
  if (!text) return;

  const author = connectedPMs.length > 0 ? connectedPMs[0].name.split(' ')[0] : 'You';

  try {
    const note = await db('addNote', { client_id: clientId, author, text });
    const c = allClients.find(x => x.id === clientId);
    c.notes.unshift(note);
    input.value = '';
    renderTab(c);
    showToast('Note saved');
  } catch {
    showToast('Could not save note — check connection');
  }
}

// ─── AI BRIEF ─────────────────────────────────────────────────────────────────

function renderBrief(c) {
  return `
    <div class="ai-panel">
      <div class="ai-header">
        <span class="ai-badge">AI powered</span>
        <span class="ai-title">Pre-meeting brief — ${escHtml(c.name)}</span>
      </div>
      <button class="brief-generate-btn" id="generateBtn" onclick="generateBrief('${c.id}')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        Generate brief for this client
      </button>
      <div class="brief-content" id="briefContent"></div>
    </div>
  `;
}

async function generateBrief(clientId) {
  const c = allClients.find(x => x.id === clientId);
  const btn = document.getElementById('generateBtn');
  const content = document.getElementById('briefContent');

  btn.innerHTML = `<div class="brief-loading"><div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>Generating...</div>`;
  btn.disabled = true;
  content.classList.remove('visible');

  const threadSummary = c.threads.slice(0, 10).map(t =>
    `[${t.dept}] ${t.senderName} — "${t.subject}" (${t.time}): ${t.preview}`
  ).join('\n');

  const notesSummary = c.notes.map(n => `${n.author}: ${n.text}`).join('\n');

  const prompt = `You are a briefing assistant for a marketing agency called Longhouse. Generate a concise pre-meeting brief for the client "${c.name}" (${c.site}).

Client details:
- Primary contact: ${c.primaryContact}
- Departments: ${c.depts.join(', ')}
- Partner since: ${c.since}
- Last contact: ${c.lastContact}

Recent email threads:
${threadSummary || 'No emails synced yet.'}

Team notes:
${notesSummary || 'None'}

Write a brief with exactly these 4 sections. Plain text only, no markdown:
1. RELATIONSHIP SNAPSHOT (2-3 sentences on overall relationship status)
2. RECENT ACTIVITY (bullet key things each department has been working on)
3. OPEN ITEMS (bullet pending approvals, unanswered emails, decisions needed)
4. TALKING POINTS (2-3 suggested topics for the next call)`;

  try {
    // Call our serverless proxy — API key never touches the browser
    const response = await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Could not generate brief.';

    const sections = [
      { key: 'RELATIONSHIP SNAPSHOT', label: 'Relationship snapshot' },
      { key: 'RECENT ACTIVITY',       label: 'Recent activity' },
      { key: 'OPEN ITEMS',            label: 'Open items' },
      { key: 'TALKING POINTS',        label: 'Talking points' },
    ];

    let html = '';
    sections.forEach((s, i) => {
      const next = sections[i + 1];
      const start = text.indexOf(s.key);
      const end = next ? text.indexOf(next.key) : text.length;
      if (start === -1) return;
      let body = text.slice(start + s.key.length, end === -1 ? text.length : end).trim().replace(/^[:\-\s]+/, '').trim();
      body = body.split('\n').map(line => {
        line = line.trim();
        if (!line) return '';
        if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
          return `<div style="display:flex;gap:8px;margin-bottom:5px"><span style="color:var(--accent-1);flex-shrink:0">›</span><span>${escHtml(line.replace(/^[-•\d.]+\s*/, ''))}</span></div>`;
        }
        return `<p style="margin-bottom:8px">${escHtml(line)}</p>`;
      }).join('');
      html += `<div class="brief-section-title">${s.label}</div>${body}`;
    });

    content.innerHTML = html || `<p>${escHtml(text)}</p>`;
    content.classList.add('visible');

  } catch {
    content.innerHTML = `<p style="color:rgba(239,159,39,0.8)">Could not generate brief — check your Anthropic API key in Vercel env vars.</p>`;
    content.classList.add('visible');
  }

  btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Regenerate brief`;
  btn.disabled = false;
}

// ─── ADD CLIENT ───────────────────────────────────────────────────────────────

function openModal() {
  restoreAddClientModal();
  document.getElementById('addClientModal').classList.add('open');
}

function closeModal() {
  document.getElementById('addClientModal').classList.remove('open');
}

async function addClient() {
  const name     = document.getElementById('newPartnerName').value.trim();
  const site     = document.getElementById('newPartnerSite').value.trim();
  const email    = document.getElementById('newPartnerEmail').value.trim().toLowerCase();
  const deptsRaw = document.getElementById('newPartnerDepts').value.trim();

  if (!name) { showToast('Please enter a company name'); return; }

  const depts = deptsRaw ? deptsRaw.split(',').map(d => d.trim()).filter(Boolean) : [];
  const colorIdx = allClients.length % AVATAR_COLORS.length;
  const since = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  try {
    const newClient = await db('addClient', {
      name,
      site: site || null,
      primary_contact: email || null,
      primary_email: email || null,
      contact_emails: email ? [email] : [],
      since,
      type: 'New',
      depts,
      avatar_color: AVATAR_COLORS[colorIdx],
    });

    const c = normaliseClient(newClient);
    allClients.push(c);
    closeModal();
    renderClientList(allClients);
    selectClient(c.id);
    showToast(`${name} added`);

  } catch {
    showToast('Could not save partner — check connection');
  }
}

// ─── ADD CONTACT EMAIL ────────────────────────────────────────────────────────

function openAddEmailModal(clientId) {
  const c = allClients.find(x => x.id === clientId);
  document.getElementById('addClientModal').innerHTML = `
    <div class="modal">
      <div class="modal-title">Add contact email</div>
      <div class="modal-sub">Only emails matching these addresses will ever be pulled from your team's inboxes.</div>
      <div class="form-group">
        <label class="form-label">Email address</label>
        <input class="form-input" type="email" placeholder="e.g. accounts@${escHtml(c.site)}" id="newContactEmail">
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="restoreAddClientModal();closeModal()">Cancel</button>
        <button class="btn-save" onclick="addContactEmail('${clientId}')">Add</button>
      </div>
    </div>
  `;
  document.getElementById('addClientModal').classList.add('open');
}

async function addContactEmail(clientId) {
  const raw = document.getElementById('newContactEmail').value.trim();
  // Extract just the email address in case someone pastes a full header like "Name <email@domain.com>"
  const match = raw.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = match ? match[0].toLowerCase() : '';
  if (!email) { showToast('Please enter a valid email address'); return; }

  try {
    const result = await db('addContactEmail', { client_id: clientId, email });
    const c = allClients.find(x => x.id === clientId);
    c.contactEmails = result.contact_emails;
    restoreAddClientModal();
    closeModal();
    renderClientView(c);
    showToast(`${email} added`);
  } catch {
    showToast('Could not save email — check connection');
  }
}

function restoreAddClientModal() {
  document.getElementById('addClientModal').innerHTML = `
    <div class="modal">
      <div class="modal-title">Add new partner</div>
      <div class="modal-sub">Add a partner to start tracking communications across your team.</div>
      <div class="form-group"><label class="form-label">Company name</label><input class="form-input" type="text" placeholder="e.g. Acme Corp" id="newPartnerName"></div>
      <div class="form-group"><label class="form-label">Website</label><input class="form-input" type="text" placeholder="e.g. acmecorp.com" id="newPartnerSite"></div>
      <div class="form-group"><label class="form-label">Primary contact email</label><input class="form-input" type="email" placeholder="e.g. marcus@acmecorp.com" id="newPartnerEmail"></div>
      <div class="form-group"><label class="form-label">Departments involved</label><input class="form-input" type="text" placeholder="e.g. Design, Paid Media, SEO" id="newPartnerDepts"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="btn-save" onclick="addClient()">Add client</button>
      </div>
    </div>
  `;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

function setNav(el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  const label = el.textContent.trim();

  if (label.includes('All partners')) {
    renderClientList(allClients);
    return;
  }
  if (label.includes('Silence alerts')) {
    const silent = allClients.filter(c => c.silenceDays);
    // false = don't update count badge (keep showing total)
    renderClientList(silent, false);
    document.getElementById('main').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div class="empty-title">${silent.length} partner${silent.length !== 1 ? 's' : ''} flagged</div>
        <div class="empty-sub">Select a partner to view their silence alert.</div>
      </div>`;
    return;
  }
  if (label.includes('Recent emails')) {
    // Keep full partner list in sidebar, just change main panel
    renderClientList(allClients, false);
    document.getElementById('main').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <div class="empty-title">Recent emails</div>
        <div class="empty-sub">Connect a Gmail account from the sidebar to pull in emails matching your partner list.</div>
      </div>`;
    return;
  }
  if (label.includes('Activity')) {
    renderClientList(allClients, false);
    document.getElementById('main').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <div class="empty-title">Activity feed</div>
        <div class="empty-sub">A live feed of all partner emails across every department will appear here once Gmail is connected.</div>
      </div>`;
    return;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function extractEmails(str) {
  return (str.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])
    .map(e => e.toLowerCase());
}

function formatRelativeTime(date) {
  const diffMs    = Date.now() - date;
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);
  if (diffMins < 2)   return 'Just now';
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getDateGroup(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff <= 7)  return 'This week';
  if (diff <= 14) return 'Last week';
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function initials(name) {
  return (name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
  }, 2800);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addClientModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
});