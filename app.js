// ─── DATA ───────────────────────────────────────────────────────────────────

const DEPT_COLORS = {
  'Design':     'dept-design',
  'Paid Media': 'dept-paid',
  'SEO':        'dept-seo',
  'Dev':        'dept-dev',
  'Client':     'dept-client',
};

const AVATAR_COLORS = ['av-navy','av-teal','av-cyan','av-blue','av-deep'];

let clients = [
  {
    id: 1,
    name: 'Acme Corp',
    site: 'acmecorp.com',
    since: 'Jan 2023',
    type: 'Enterprise',
    primaryContact: 'Marcus Webb',
    primaryEmail: 'marcus@acmecorp.com',
    depts: ['Design','Paid Media','SEO'],
    avatarColor: 'av-navy',
    lastContact: '2h ago',
    unread: true,
    silenceDays: null,
    threads: [
      {
        id: 't1',
        senderName: 'Sarah R.',
        senderInitials: 'SR',
        senderColor: 'av-teal',
        dept: 'Design',
        direction: 'outbound',
        time: '2h ago',
        dateGroup: 'Today',
        subject: 'Re: Q2 brand refresh — final mockups attached',
        preview: 'Hi Marcus, attaching the updated hero and product page concepts. Please let me know if the colour palette aligns with your vision — we can iterate quickly if needed.',
      },
      {
        id: 't2',
        senderName: 'Marcus (client)',
        senderInitials: 'MW',
        senderColor: 'av-blue',
        dept: 'Client',
        direction: 'inbound',
        time: '5h ago',
        dateGroup: 'Today',
        subject: 'Re: Q2 brand refresh — final mockups attached',
        preview: 'Love the direction. Also wanted to ask — should we align the paid campaign launch with the rebrand rollout? Keen to make the most of the new look.',
      },
      {
        id: 't3',
        senderName: 'Jamie L.',
        senderInitials: 'JL',
        senderColor: 'av-cyan',
        dept: 'Paid Media',
        direction: 'outbound',
        time: 'Yesterday 3:12pm',
        dateGroup: 'Yesterday',
        subject: 'May campaign budget — approval needed by Friday',
        preview: 'Hi Marcus, following up on the Google Ads budget approval for May. We need sign-off by end of week to maintain delivery pace and avoid any gap in spend.',
      },
      {
        id: 't4',
        senderName: 'Priya K.',
        senderInitials: 'PK',
        senderColor: 'av-navy',
        dept: 'SEO',
        direction: 'outbound',
        time: 'Yesterday 10:05am',
        dateGroup: 'Yesterday',
        subject: 'April SEO report + May priority areas',
        preview: 'Please find the April performance report attached. Organic traffic is up 18% MoM. Key priorities for May include the technical audit and a content push on the core service pages.',
      },
      {
        id: 't5',
        senderName: 'Marcus (client)',
        senderInitials: 'MW',
        senderColor: 'av-blue',
        dept: 'Client',
        direction: 'inbound',
        time: 'Mon 9:30am',
        dateGroup: 'This week',
        subject: 'Re: April SEO report + May priority areas',
        preview: 'Great results Priya — really happy with the organic growth. Let\'s focus on the technical audit first and schedule a call for next week.',
      },
    ],
    notes: [
      { author: 'Jamie L.', date: 'Apr 10', text: 'Marcus prefers calls over long email threads. Always offer a quick Zoom if discussions get complex.' },
      { author: 'Sarah R.', date: 'Apr 3', text: 'Client approved an additional $5k for design in Q2. Confirmed via email on Apr 3 — use this as budget ceiling.' },
    ],
    alerts: ['Design sent revised mockups today — Paid Media hasn\'t been looped in on the rebrand timeline yet.'],
  },
  {
    id: 2,
    name: 'Novara Inc',
    site: 'novarainc.com',
    since: 'Mar 2024',
    type: 'Growth',
    primaryContact: 'Yuki Tanaka',
    primaryEmail: 'yuki@novarainc.com',
    depts: ['SEO','Dev'],
    avatarColor: 'av-teal',
    lastContact: 'Yesterday',
    unread: false,
    silenceDays: null,
    threads: [
      {
        id: 't6',
        senderName: 'Priya K.',
        senderInitials: 'PK',
        senderColor: 'av-navy',
        dept: 'SEO',
        direction: 'outbound',
        time: 'Yesterday 2:00pm',
        dateGroup: 'Yesterday',
        subject: 'Q1 SEO wrap-up + Q2 roadmap',
        preview: 'Hi Yuki, sharing the full Q1 wrap-up. Rankings for your core terms have stabilised — focus for Q2 is link building and on-page optimisation for the new service pages.',
      },
      {
        id: 't7',
        senderName: 'Dan M.',
        senderInitials: 'DM',
        senderColor: 'av-cyan',
        dept: 'Dev',
        direction: 'outbound',
        time: 'Last week',
        dateGroup: 'Last week',
        subject: 'Site speed improvements — deployed to staging',
        preview: 'The Core Web Vitals improvements are live on staging. LCP is down to 1.8s from 4.2s. Can you review and sign off before we push to production?',
      },
    ],
    notes: [
      { author: 'Dan M.', date: 'Mar 28', text: 'Yuki needs all technical changes reviewed by their internal dev team before production deployment. Add at least 3 days for their review cycle.' },
    ],
    alerts: [],
  },
  {
    id: 3,
    name: 'Bright Horizons',
    site: 'brighthorizons.co',
    since: 'Sep 2022',
    type: 'Enterprise',
    primaryContact: 'Claire Foster',
    primaryEmail: 'claire@brighthorizons.co',
    depts: ['Design','Paid Media'],
    avatarColor: 'av-blue',
    lastContact: '3 days ago',
    unread: false,
    silenceDays: 11,
    threads: [
      {
        id: 't8',
        senderName: 'Sarah R.',
        senderInitials: 'SR',
        senderColor: 'av-teal',
        dept: 'Design',
        direction: 'outbound',
        time: '3 days ago',
        dateGroup: 'This week',
        subject: 'Website refresh — initial concepts',
        preview: 'Hi Claire, attached are three initial concept directions for the homepage refresh. Each takes a different approach to the hero — happy to jump on a call to walk through the thinking.',
      },
    ],
    notes: [],
    alerts: ['No reply from Claire in 11 days. Consider a follow-up — Design sent concepts on Apr 12 with no response.'],
  },
  {
    id: 4,
    name: 'Slate & Co',
    site: 'slateandco.com',
    since: 'Jun 2024',
    type: 'Starter',
    primaryContact: 'Ben Ashford',
    primaryEmail: 'ben@slateandco.com',
    depts: ['Paid Media'],
    avatarColor: 'av-deep',
    lastContact: '1 week ago',
    unread: false,
    silenceDays: null,
    threads: [
      {
        id: 't9',
        senderName: 'Jamie L.',
        senderInitials: 'JL',
        senderColor: 'av-cyan',
        dept: 'Paid Media',
        direction: 'outbound',
        time: '1 week ago',
        dateGroup: 'Last week',
        subject: 'March performance report',
        preview: 'Hi Ben, please find the March report attached. ROAS improved to 3.4x — the new ad creative has been the key driver. Recommending we scale the winning ad sets in April.',
      },
    ],
    notes: [],
    alerts: [],
  },
];

let activeClientId = null;
let activeTab = 'timeline';
let allClients = [...clients];

// ─── INIT ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderClientList(clients);
  selectClient(clients[0].id);
});

// ─── CLIENT LIST ─────────────────────────────────────────────────────────────

function renderClientList(list) {
  const el = document.getElementById('clientList');
  document.getElementById('clientCount').textContent = list.length;

  if (list.length === 0) {
    el.innerHTML = `<div style="padding:16px 8px;font-size:12px;color:rgba(213,232,247,0.3);text-align:center">No clients found</div>`;
    return;
  }

  el.innerHTML = list.map(c => `
    <div class="client-item ${c.id === activeClientId ? 'active' : ''}" onclick="selectClient(${c.id})" id="ci-${c.id}">
      <div class="client-avatar ${c.avatarColor}">${initials(c.name)}</div>
      <div class="client-info">
        <div class="client-name">${c.name}</div>
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

function selectClient(id) {
  activeClientId = id;
  activeTab = 'timeline';
  const c = allClients.find(x => x.id === id);
  if (!c) return;
  c.unread = false;

  renderClientList(allClients.filter(x => {
    const q = document.getElementById('globalSearch').value;
    return !q || x.name.toLowerCase().includes(q.toLowerCase()) || x.site.toLowerCase().includes(q.toLowerCase());
  }));

  renderClientView(c);
}

// ─── RENDER CLIENT VIEW ───────────────────────────────────────────────────────

function renderClientView(c) {
  const main = document.getElementById('main');

  const deptTagsHtml = c.depts.map(d =>
    `<span class="dept-tag ${DEPT_COLORS[d] || ''}">${d}</span>`
  ).join('');

  const statsHtml = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">${c.threads.length}</div>
        <div class="stat-label">Email threads</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${c.depts.length}</div>
        <div class="stat-label">Departments</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${c.notes.length}</div>
        <div class="stat-label">Team notes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${c.lastContact}</div>
        <div class="stat-label">Last contact</div>
      </div>
    </div>
  `;

  const alertsHtml = c.alerts.map(a => `
    <div class="alert-bar ${a.toLowerCase().includes('silent') || a.toLowerCase().includes('reply') ? 'alert-warn' : ''}">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ${a}
    </div>
  `).join('');

  main.innerHTML = `
    <div class="client-header">
      <div class="client-header-top">
        <div class="client-header-identity">
          <div class="client-header-avatar ${c.avatarColor}">${initials(c.name)}</div>
          <div>
            <div class="client-header-name">${c.name}</div>
            <div class="client-header-meta">${c.site} · ${c.type} · Partner since ${c.since}</div>
          </div>
        </div>
        <div class="client-header-actions">
          <button class="btn-sm btn-outline" onclick="showToast('Opening email to ${c.primaryContact}...')">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Email client
          </button>
          <button class="btn-sm btn-accent" onclick="switchTab('brief')">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Pre-meeting brief
          </button>
        </div>
      </div>
      <div class="dept-tags">${deptTagsHtml}</div>
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
    t.classList.toggle('active', t.textContent.toLowerCase().replace(' ','') === tab || t.textContent.toLowerCase() === tab);
  });
  const c = allClients.find(x => x.id === activeClientId);
  renderTab(c);
}

function renderTab(c) {
  const el = document.getElementById('tabContent');
  if (activeTab === 'timeline') el.innerHTML = renderTimeline(c);
  else if (activeTab === 'notes') el.innerHTML = renderNotes(c);
  else if (activeTab === 'brief') el.innerHTML = renderBrief(c);
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

function renderTimeline(c) {
  const groups = {};
  c.threads.forEach(t => {
    if (!groups[t.dateGroup]) groups[t.dateGroup] = [];
    groups[t.dateGroup].push(t);
  });

  const ORDER = ['Today','Yesterday','This week','Last week'];
  const sortedGroups = Object.keys(groups).sort((a,b) => {
    const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  let html = '<div class="timeline-container">';
  sortedGroups.forEach(grp => {
    html += `<div class="timeline-date-label">${grp}</div>`;
    groups[grp].forEach(t => {
      html += `
        <div class="thread-item" onclick="showToast('Opening thread: ${escHtml(t.subject)}')">
          <div class="thread-avatar ${t.senderColor}">${t.senderInitials}</div>
          <div class="thread-body">
            <div class="thread-top">
              <span class="thread-name">${escHtml(t.senderName)}</span>
              <span class="thread-dept ${DEPT_COLORS[t.dept] || 'dept-client'}">${t.dept}</span>
              <span class="thread-time">${t.time}</span>
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
            <span class="note-date">${escHtml(n.date)}</span>
          </div>
          <div class="note-text">${escHtml(n.text)}</div>
        </div>
      `).join('')
    : `<div style="font-size:13px;color:rgba(213,232,247,0.35);padding:8px 0">No notes yet — add the first one.</div>`;

  return `
    <div class="notes-panel" style="flex:1;overflow-y:auto;">
      <div class="notes-title">Shared team notes</div>
      <div id="notesList">${notesHtml}</div>
      <div class="note-add">
        <input class="note-input" type="text" placeholder="Add a note visible to all PMs..." id="noteInput" onkeydown="if(event.key==='Enter')submitNote(${c.id})">
        <button class="note-submit" onclick="submitNote(${c.id})">Add</button>
      </div>
    </div>
  `;
}

function submitNote(clientId) {
  const input = document.getElementById('noteInput');
  const text = input.value.trim();
  if (!text) return;
  const c = allClients.find(x => x.id === clientId);
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
  c.notes.unshift({ author: 'You', date: dateStr, text });
  input.value = '';
  renderTab(c);
  showToast('Note added');
}

// ─── AI BRIEF ─────────────────────────────────────────────────────────────────

function renderBrief(c) {
  return `
    <div class="ai-panel">
      <div class="ai-header">
        <span class="ai-badge">AI powered</span>
        <span class="ai-title">Pre-meeting brief — ${escHtml(c.name)}</span>
      </div>
      <button class="brief-generate-btn" id="generateBtn" onclick="generateBrief(${c.id})">
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

  btn.innerHTML = `
    <div class="brief-loading">
      <div class="loading-dots">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
      Generating brief...
    </div>
  `;
  btn.disabled = true;
  content.classList.remove('visible');

  const threadSummary = c.threads.map(t =>
    `[${t.dept}] ${t.senderName} — "${t.subject}" (${t.time}): ${t.preview}`
  ).join('\n');

  const notesSummary = c.notes.map(n => `${n.author} (${n.date}): ${n.text}`).join('\n');

  const prompt = `You are a briefing assistant for a marketing agency called Longhouse. Generate a concise pre-meeting brief for the client "${c.name}" (${c.site}).

Client details:
- Primary contact: ${c.primaryContact}
- Departments involved: ${c.depts.join(', ')}
- Partner since: ${c.since}
- Last contact: ${c.lastContact}

Recent email threads:
${threadSummary}

Team notes:
${notesSummary || 'None'}

Write a brief with exactly these 4 sections. Use plain text, no markdown symbols:
1. RELATIONSHIP SNAPSHOT (2-3 sentences on overall relationship status)
2. RECENT ACTIVITY (bullet the key things that have happened across departments in the last 2 weeks — what each team has been working on with this client)
3. OPEN ITEMS (bullet any pending approvals, unanswered emails, or decisions needed)
4. TALKING POINTS (2-3 suggested topics or questions to raise in the next call)

Keep it brief, direct, and useful for a PM walking into a call.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Could not generate brief.';

    // Parse sections
    const sections = [
      { key: 'RELATIONSHIP SNAPSHOT', label: 'Relationship snapshot' },
      { key: 'RECENT ACTIVITY', label: 'Recent activity' },
      { key: 'OPEN ITEMS', label: 'Open items' },
      { key: 'TALKING POINTS', label: 'Talking points' },
    ];

    let html = '';
    sections.forEach((s, i) => {
      const next = sections[i + 1];
      const start = text.indexOf(s.key);
      const end = next ? text.indexOf(next.key) : text.length;
      if (start === -1) return;
      let body = text.slice(start + s.key.length, end === -1 ? text.length : end).trim();
      // clean leading colon/newline
      body = body.replace(/^[:\-\s]+/, '').trim();
      // Convert lines starting with - or • to styled bullets
      body = body.split('\n').map(line => {
        line = line.trim();
        if (!line) return '';
        if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
          return `<div style="display:flex;gap:8px;margin-bottom:5px"><span style="color:var(--accent-1);flex-shrink:0">›</span><span>${escHtml(line.replace(/^[-•\d.]+\s*/,''))}</span></div>`;
        }
        return `<p style="margin-bottom:8px">${escHtml(line)}</p>`;
      }).join('');

      html += `<div class="brief-section-title">${s.label}</div>${body}`;
    });

    content.innerHTML = html || `<p style="color:rgba(213,232,247,0.6)">${escHtml(text)}</p>`;
    content.classList.add('visible');

  } catch (err) {
    content.innerHTML = `<p style="color:rgba(239,159,39,0.8)">Could not connect to AI. Check your API key configuration.</p>`;
    content.classList.add('visible');
  }

  btn.innerHTML = `
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    Regenerate brief
  `;
  btn.disabled = false;
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function openModal() {
  document.getElementById('addClientModal').classList.add('open');
}

function closeModal() {
  document.getElementById('addClientModal').classList.remove('open');
}

function addClient() {
  const name = document.getElementById('newClientName').value.trim();
  const site = document.getElementById('newClientSite').value.trim();
  const email = document.getElementById('newClientEmail').value.trim();
  const deptsRaw = document.getElementById('newClientDepts').value.trim();

  if (!name) { showToast('Please enter a company name'); return; }

  const depts = deptsRaw ? deptsRaw.split(',').map(d => d.trim()).filter(Boolean) : [];
  const colorIdx = allClients.length % AVATAR_COLORS.length;

  const newClient = {
    id: Date.now(),
    name,
    site: site || '—',
    since: new Date().toLocaleDateString('en-GB', { month:'short', year:'numeric' }),
    type: 'New',
    primaryContact: email || '—',
    primaryEmail: email || '',
    depts,
    avatarColor: AVATAR_COLORS[colorIdx],
    lastContact: 'Just added',
    unread: false,
    silenceDays: null,
    threads: [],
    notes: [],
    alerts: [],
  };

  allClients.push(newClient);
  closeModal();
  renderClientList(allClients);
  selectClient(newClient.id);
  showToast(`${name} added`);

  // clear fields
  ['newClientName','newClientSite','newClientEmail','newClientDepts'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

function setNav(el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  const label = el.textContent.trim();
  if (label.includes('All clients')) {
    // already showing all clients
    return;
  }
  if (label.includes('Silence alerts')) {
    const silent = allClients.filter(c => c.silenceDays);
    renderClientList(silent);
    const main = document.getElementById('main');
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="empty-title">${silent.length} client${silent.length !== 1 ? 's' : ''} flagged</div>
        <div class="empty-sub">Select a client on the left to view their silence alert and follow-up options.</div>
      </div>
    `;
    return;
  }
  if (label.includes('Recent emails')) {
    const main = document.getElementById('main');
    main.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><div class="empty-title">Recent emails</div><div class="empty-sub">Connect your Gmail workspace to see all recent client emails in one feed.</div></div>`;
    return;
  }
  if (label.includes('Activity')) {
    const main = document.getElementById('main');
    main.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="empty-title">Activity feed</div><div class="empty-sub">A live feed of all outgoing and incoming client emails across every department will appear here once Gmail is connected.</div></div>`;
    return;
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
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

// Close modal on overlay click
document.getElementById('addClientModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
