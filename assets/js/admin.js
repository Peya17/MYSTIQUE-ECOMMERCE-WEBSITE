/* =========================================================
   Mystique Collections — Admin
   1) Sidebar navigation   2) Manage Users pop-up (admin only)
   ========================================================= */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  /* ---------- 1) Sidebar navigation ---------- */
  const VIEWS = {
    dashboard: ['Dashboard',        'A snapshot of today’s store activity.'],
    customers: ['Customers',        'Browse and manage your customers.'],
    products:  ['Products',         'Your catalogue of collections.'],
    inventory: ['Inventory',        'Track stock levels across every collection.'],
    orders:    ['Orders & Payments','Review orders and payment status.'],
    settings:  ['Settings',         'Store preferences and configuration.'],
    reports:   ['Reports',          'Sales and performance reports.'],
  };
  const navLinks = [...document.querySelectorAll('.nav__item[data-view]')];
  const sidebar = $('sidebar'), menuToggle = $('menuToggle');

  function showView() {
    const key = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'inventory';
    navLinks.forEach((a) => {
      if (a.dataset.view === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    $('viewTitle').textContent = VIEWS[key][0];
    $('viewDesc').textContent = VIEWS[key][1];
    document.title = `${VIEWS[key][0]} — Mystique Admin`;
    closeMenu();
  }
  function closeMenu() { sidebar.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }
  menuToggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  window.addEventListener('hashchange', showView);
  showView();

  /* ---------- 2) Manage Users (admin only) ---------- */
  const isAdmin = document.body.dataset.admin === 'true';
  if (!isAdmin) {
    document.querySelectorAll('[data-admin-only]').forEach((n) => n.remove());
    return;
  }

  const ROLES = [
    { id: 'member',    label: 'Member',    desc: 'Standard customer access.' },
    { id: 'helper',    label: 'Helper',    desc: 'Assists customers and flags issues.' },
    { id: 'moderator', label: 'Moderator', desc: 'Manages reviews, reports and comments.' },
    { id: 'coowner',   label: 'Co-owner',  desc: 'Full admin access, except ownership.' },
  ];
  const LABEL = { owner: 'Owner', ...Object.fromEntries(ROLES.map((r) => [r.id, r.label])) };
  const RANK = ['owner', 'coowner', 'moderator', 'helper', 'member'];

  /* Demo data + API. Replace with real endpoints via UserManager.setApi({ search, updateRole }).
     The server MUST re-check that the caller is an admin on every request. */
  const demo = [
    { id: 'USR-1001', name: 'Amara Villanueva', email: 'amara@mystique.example', role: 'owner' },
    { id: 'USR-1002', name: 'Liam Santos',      email: 'liam.santos@mail.example', role: 'coowner' },
    { id: 'USR-1003', name: 'Chloe Dela Cruz',  email: 'chloe.dc@mail.example',    role: 'moderator' },
    { id: 'USR-1004', name: 'Noah Reyes',       email: 'noah.reyes@mail.example',  role: 'helper' },
    { id: 'USR-1005', name: 'Isla Mercado',     email: 'isla.m@mail.example',      role: 'member' },
    { id: 'USR-1006', name: 'Ethan Bautista',   email: 'ethan.b@mail.example',     role: 'member' },
    { id: 'USR-1007', name: 'Sofia Navarro',    email: 'sofia.navarro@mail.example', role: 'member' },
    { id: 'USR-1008', name: 'Mateo Cruz',       email: 'mateo.cruz@mail.example',  role: 'member' },
  ];
  const wait = (v, ms = 140) => new Promise((r) => setTimeout(() => r(v), ms));
  let api = {
    search(q) {
      q = q.trim().toLowerCase();
      const hits = demo.filter((u) => !q || [u.name, u.email, u.id].some((s) => s.toLowerCase().includes(q)));
      hits.sort((a, b) => RANK.indexOf(a.role) - RANK.indexOf(b.role) || a.name.localeCompare(b.name));
      return wait(hits.map((u) => ({ ...u })));
    },
    updateRole(id, role) {
      const u = demo.find((x) => x.id === id);
      if (!u) return Promise.reject(new Error('User not found.'));
      if (u.role === 'owner') return Promise.reject(new Error('The owner’s rank can’t be changed.'));
      u.role = role;
      return wait({ ...u }, 220);
    },
  };

  const root = $('userManager'), openBtn = $('openUserManager');
  const search = $('umSearch'), list = $('umList'), count = $('umCount');
  const detail = $('umDetail'), rolesBox = $('umRoles'), saveBtn = $('umSave');
  const note = $('umNote'), errBox = $('umError'), toast = $('umToast');
  let selected = null, token = 0, lastFocus = null, toastTimer, debounce, armed = false;

  const initials = (n) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const setBadge = (node, role) => { node.textContent = LABEL[role]; node.dataset.role = role; };

  /* Build the rank radios once */
  ROLES.forEach((r) => {
    const label = el('label', 'role');
    const input = el('input'); input.type = 'radio'; input.name = 'umRole'; input.value = r.id;
    label.append(input, el('span', 'role__name', r.label), el('span', 'role__desc', r.desc));
    rolesBox.append(label);
  });
  const radios = () => [...rolesBox.querySelectorAll('input')];
  const chosen = () => (radios().find((i) => i.checked) || {}).value;

  /* ----- results list ----- */
  async function runSearch() {
    const mine = ++token, q = search.value;
    let users;
    try { users = await api.search(q); } catch { users = []; }
    if (mine !== token) return;                       // ignore stale responses
    list.replaceChildren();
    count.textContent = q.trim() ? `${users.length} result${users.length === 1 ? '' : 's'}` : `All users · ${users.length}`;
    if (!users.length) {
      const li = el('li', 'um__empty'); li.textContent = `No users match “${q.trim()}”.`; list.append(li); return;
    }
    users.forEach((u) => {
      const li = el('li'), b = el('button', 'um__user'); b.type = 'button';
      const text = el('div', 'um__whoText'); text.append(el('p', 'um__name', u.name), el('p', 'um__mail', `${u.email} · ${u.id}`));
      const badge = el('span', 'badge'); setBadge(badge, u.role);
      b.append(el('span', 'avatar', initials(u.name)), text, badge);
      b.addEventListener('click', () => select(u));
      li.append(b); list.append(li);
    });
  }

  /* ----- selected user ----- */
  function select(u) {
    selected = u; armed = false;
    $('umAvatar').textContent = initials(u.name);
    $('umName').textContent = u.name;
    $('umMail').textContent = `${u.email} · ${u.id}`;
    setBadge($('umBadge'), u.role);
    const locked = u.role === 'owner';
    radios().forEach((i) => { i.checked = i.value === u.role; i.disabled = locked; });
    errBox.hidden = true;
    note.hidden = !locked; note.textContent = locked ? 'The owner’s rank is locked and can’t be changed here.' : '';
    list.hidden = count.hidden = true; detail.hidden = false;
    syncRoles();
    (radios().find((i) => i.checked && !i.disabled) || radios().find((i) => !i.disabled) || $('umBack')).focus();
  }
  function syncRoles() {
    radios().forEach((i) => {
      i.parentElement.classList.toggle('is-selected', i.checked);
      i.parentElement.classList.toggle('is-disabled', i.disabled);
    });
    const v = chosen();
    saveBtn.disabled = !selected || selected.role === 'owner' || !v || v === selected.role;
    saveBtn.textContent = 'Save changes';
    armed = false;
    if (selected && selected.role !== 'owner') {
      const warn = v === 'coowner' && v !== selected.role;
      note.hidden = !warn;
      note.textContent = warn ? 'Co-owners get full admin access. You’ll be asked to confirm.' : '';
    }
  }
  function back() {
    selected = null; detail.hidden = true; list.hidden = count.hidden = false; errBox.hidden = true;
    search.focus(); runSearch();
  }

  rolesBox.addEventListener('change', syncRoles);
  $('umBack').addEventListener('click', back);

  detail.addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = chosen();
    if (saveBtn.disabled || !selected) return;
    if (role === 'coowner' && !armed) {               // two-step confirm for the most powerful rank
      armed = true; saveBtn.textContent = 'Confirm Co-owner'; return;
    }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; errBox.hidden = true;
    try {
      const updated = await api.updateRole(selected.id, role);
      selected = updated; setBadge($('umBadge'), updated.role);
      showToast(`${updated.name} is now ${updated.role === 'member' ? 'a Member' : 'a ' + LABEL[updated.role]}.`);
      syncRoles();
    } catch (err) {
      errBox.textContent = err.message || 'Something went wrong. Please try again.'; errBox.hidden = false;
      syncRoles();
    }
  });

  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('is-shown');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 3200);
  }

  /* ----- open / close / focus trap ----- */
  function open() {
    lastFocus = document.activeElement;
    root.hidden = false; document.body.classList.add('um-open'); openBtn.setAttribute('aria-expanded', 'true');
    selected = null; detail.hidden = true; list.hidden = count.hidden = false; search.value = '';
    requestAnimationFrame(() => root.classList.add('is-visible'));
    runSearch(); search.focus();
    closeMenu();
  }
  function close() {
    root.classList.remove('is-visible'); document.body.classList.remove('um-open'); openBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { root.hidden = true; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  openBtn.addEventListener('click', open);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-um-close]')) close(); });
  search.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(runSearch, 150); });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const first = list.querySelector('.um__user'); if (first) first.click(); }
  });
  document.addEventListener('keydown', (e) => {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...root.querySelectorAll('button, input, [href]')].filter((n) => !n.disabled && n.offsetParent !== null && n.type !== 'radio' || (n.type === 'radio' && n.checked && !n.disabled));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Public hook for wiring up real endpoints */
  window.UserManager = { open, close, setApi(next) { api = { ...api, ...next }; } };
})();