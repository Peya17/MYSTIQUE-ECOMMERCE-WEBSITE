/* MYSTIQUE — admin. All numbers come from MQSync data written by the storefront.
   Nothing here is hard-coded sample data. */
(function () {
    'use strict';
    const S = window.MQSync;
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));
    const LOW = 10;

    const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const sum = a => a.reduce((x, y) => x + y, 0);
    const peso = n => '₱' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pesoS = n => '₱' + Math.round(n || 0).toLocaleString('en-US');
    const nd = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const dt = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const pill = (text, cls) => '<span class="pill ' + (cls || text).toLowerCase().replace(/ /g, '') + '">' + esc(text) + '</span>';
    const empty = (cols, msg) => '<tr><td class="empty" colspan="' + cols + '">' + msg + '</td></tr>';

    /* ---------- data ---------- */
    // First run only: the products that already exist on the storefront, with stock 0 for you to fill in.
    const SEED = [
        ['emy-beige', 'Emy Beige', 1499], ['emy-blue', 'Emy Blue', 1499], ['emy-grey', 'Emy Grey', 1499], ['emy-yellow', 'Emy Yellow', 1499],
        ['seffy-black', 'Seffy Black', 1599], ['seffy-green', 'Seffy Green', 1599], ['velvet-lip-color', 'Velvet Lip Color', 650]
    ];
    if (!S.get('catalog', null)) {
        S.set('catalog', SEED.map(p => ({ id: p[0], name: p[1], sku: p[0].toUpperCase(), price: p[2], stock: 0 })));
    }

    const catalog = () => S.get('catalog', []);
    const orders = () => S.get('orders', []);
    const deliveries = () => S.get('deliveries', []);
    const returns = () => S.get('returns', []);
    const vlogs = () => S.get('vlogs', []);
    const stocklog = () => S.get('stocklog', []);
    const usersMap = () => S.get('users', {});

    const itemsTotal = o => sum((o.items || []).map(i => i.price * i.qty));
    const total = o => o.total != null ? o.total : itemsTotal(o) + (o.shipping || 0);
    const isSale = o => ['Paid', 'Packed', 'Shipped', 'Delivered'].includes(o.status);
    const isPending = o => o.status === 'Pending' || o.status === 'Paid';
    const isOpen = o => o.status !== 'Delivered' && o.status !== 'Cancelled';
    const custName = o => (o.customer && (o.customer.name || o.customer.email)) || 'Guest';
    const itemsText = o => (o.items || []).map(i => esc(i.name) + (i.shade ? ' (' + esc(i.shade) + ')' : '') + ' × ' + i.qty).join(', ');
    const orderById = id => orders().find(o => o.id === id);
    const stockState = p => p.stock <= 0 ? 'Out of stock' : p.stock <= LOW ? 'Low stock' : 'In stock';
    const stockPill = p => pill(stockState(p), { 'Out of stock': 'cancelled', 'Low stock': 'pending', 'In stock': 'paid' }[stockState(p)]);

    function me() {
        try {
            const s = JSON.parse(localStorage.getItem('mq_session')) || JSON.parse(sessionStorage.getItem('mq_session'));
            if (s && s.email) { const u = usersMap()[s.email] || {}; return { id: s.email, name: u.name || s.email }; }
        } catch (e) { /* no session */ }
        return { id: 'admin', name: 'Administrator' };
    }

    function log(type, ref, action, result, remarks) {
        const l = vlogs();
        l.unshift({ type: type, ref: ref, action: action, result: result, by: me(), at: new Date().toISOString(), remarks: remarks || '' });
        S.set('vlogs', l);
    }

    let toastTimer;
    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
    }

    /* ---------- stock ---------- */
    function changeStock(id, fn, orderId) {
        const c = catalog();
        const p = c.find(x => x.id === id);
        if (!p) return;
        const before = p.stock;
        p.stock = Math.max(0, Math.round(fn(before)));
        S.set('catalog', c);
        if (orderId) {
            const l = stocklog();
            l.unshift({ order: orderId, name: p.name, qty: before - p.stock, before: before, after: p.stock, at: new Date().toISOString() });
            S.set('stocklog', l);
        }
    }

    function setStatus(id, status) {
        const l = orders();
        const o = l.find(x => x.id === id);
        if (!o) return;
        o.status = status;
        S.set('orders', l);
    }

    /* ---------- renderers ---------- */
    function renderDashboard() {
        const o = orders();
        $('#d-sales').textContent = pesoS(sum(o.filter(isSale).map(total)));
        $('#d-orders').textContent = o.length;
        $('#d-products').textContent = catalog().length;
        $('#d-pending').textContent = o.filter(isPending).length;
        $('#d-recent').innerHTML = o.slice(0, 5).map(x => '<tr><td data-label="Order ID" class="bold">' + esc(x.id) + '</td><td data-label="Customer">' + esc(custName(x)) +
            '</td><td data-label="Date">' + nd(x.date) + '</td><td data-label="Total">' + peso(total(x)) + '</td><td data-label="Payment">' + esc(x.payment) +
            '</td><td data-label="Status">' + pill(x.status) + '</td></tr>').join('') || empty(6, 'No orders yet. New customer orders appear here instantly.');
    }

    function renderProducts() {
        const c = catalog();
        $('#p-total').textContent = c.length;
        $('#p-in').textContent = c.filter(p => stockState(p) === 'In stock').length;
        $('#p-low').textContent = c.filter(p => stockState(p) === 'Low stock').length;
        $('#p-out').textContent = c.filter(p => stockState(p) === 'Out of stock').length;
        $('#p-rows').innerHTML = c.map(p => '<tr><td data-label="Product" class="bold">' + esc(p.name) + '</td><td data-label="SKU">' + esc(p.sku) + '</td><td data-label="Price" class="num">' + peso(p.price) +
            '</td><td data-label="Stock" class="num">' + p.stock + '</td><td data-label="Status">' + stockPill(p) +
            '</td><td data-label="Action"><button type="button" class="btn-reject sm" data-act="del-product" data-id="' + esc(p.id) + '">Remove</button></td></tr>').join('') || empty(6, 'No products yet.');
    }

    function renderInventory() {
        const c = catalog();
        $('#inv-rows').innerHTML = c.map(p => '<tr><td data-label="Product" class="bold">' + esc(p.name) + '</td><td data-label="SKU">' + esc(p.sku) + '</td><td data-label="Stock" class="num">' + p.stock +
            '</td><td data-label="Status">' + stockPill(p) + '</td></tr>').join('') || empty(4, 'No products yet.');

        const sel = $('#su-product');
        const keep = sel.value;
        sel.innerHTML = c.map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('');
        if (keep) sel.value = keep;

        const low = c.filter(p => p.stock <= LOW).sort((a, b) => a.stock - b.stock);
        $('#alert-count').textContent = low.length;
        $('#alert-list').innerHTML = low.map(p => '<div class="alert ' + (p.stock <= 0 ? 'out' : '') + '"><span class="dot">!</span><div><strong>' + esc(p.name) + ' (' + esc(p.sku) + ')</strong><small>' +
            (p.stock <= 0 ? 'Out of stock. Restock as soon as possible.' : 'Only ' + p.stock + ' left.') + '</small></div></div>').join('') || '<p class="empty-state">All products have enough stock.</p>';

        $('#auto-rows').innerHTML = stocklog().map(l => '<tr><td data-label="Order" class="bold">' + esc(l.order) + '</td><td data-label="Product">' + esc(l.name) + '</td><td data-label="Qty sold" class="num">' + l.qty +
            '</td><td data-label="Before" class="num">' + l.before + '</td><td data-label="After" class="num">' + l.after + '</td><td data-label="When">' + dt(l.at) + '</td></tr>').join('') || empty(6, 'No automatic updates yet.');
    }

    function orderActions(o) {
        const b = (act, text, cls) => '<button type="button" class="' + (cls || 'btn') + ' sm" data-act="' + act + '" data-id="' + esc(o.id) + '">' + text + '</button>';
        if (o.status === 'Pending') return b('verify', 'Verify payment') + b('cancel', 'Cancel', 'btn-reject');
        if (o.status === 'Paid') return b('pack', 'Mark packed') + b('cancel', 'Cancel', 'btn-reject');
        if (o.status === 'Packed') return b('ship', 'Mark shipped');
        if (o.status === 'Shipped') return '<span class="note-text">Waiting for delivery proof</span>';
        return '';
    }

    function renderOrders() {
        const q = $('#o-search').value.trim().toLowerCase();
        const f = $('#o-filter').value;
        const list = orders().filter(o => (!f || o.status === f) && (o.id + ' ' + custName(o)).toLowerCase().includes(q));
        $('#o-rows').innerHTML = list.map(o => '<tr><td data-label="Order ID" class="bold">' + esc(o.id) + '</td><td data-label="Customer">' + esc(custName(o)) + '</td><td data-label="Items">' + itemsText(o) +
            '</td><td data-label="Method">' + esc(o.payment) + '</td><td data-label="Amount" class="num">' + peso(total(o)) + '</td><td data-label="Status">' + pill(o.status) +
            '</td><td data-label="Action"><div class="row-actions">' + orderActions(o) + '</div></td></tr>').join('') || empty(7, 'No orders match.');
    }

    function thumbs(type, rec) {
        return '<div class="thumbs">' + (rec.photos || []).map((p, i) => '<img src="' + p.src + '" alt="' + esc(p.caption) + '" data-photo="' + type + '|' + esc(rec.id) + '|' + i + '">').join('') + '</div>';
    }

    function caseHtml(type, rec) {
        const o = orderById(rec.order) || { items: [], customer: {}, payment: '', status: '' };
        const title = type === 'delivery' ? 'Order ' + rec.order : 'Return ' + rec.id;
        const decided = rec.decision ? '<p class="case-note"><b>' + rec.status + '</b> by ' + esc(rec.decision.by.name) + ' on ' + dt(rec.decision.at) + (rec.decision.remarks ? '<br>' + esc(rec.decision.remarks) : '') + '</p>' : '';
        const buttons = rec.status !== 'Pending' ? '' : '<div class="case-actions"><button type="button" class="btn" data-act="approve" data-type="' + type + '" data-id="' + esc(rec.id) + '">Approve</button>' +
            '<button type="button" class="btn-reject" data-act="reject" data-type="' + type + '" data-id="' + esc(rec.id) + '">Reject</button></div>';
        return '<article class="case"><div class="case-main"><div class="case-head"><h3>' + esc(title) + '</h3>' + pill(rec.status) + '</div><div class="info">' +
            '<div><span>Customer</span><b>' + esc(custName(o)) + '</b></div><div><span>Order total</span><b>' + peso(total(o)) + '</b></div>' +
            '<div><span>' + (type === 'delivery' ? 'Proof uploaded' : 'Request filed') + '</span><b>' + dt(rec.uploaded || rec.filed) + '</b></div>' +
            '<div class="wide"><span>Items</span><b>' + itemsText(o) + '</b></div>' +
            (o.customer && o.customer.address ? '<div class="wide"><span>Delivery address</span><b>' + esc(o.customer.address) + '</b></div>' : '') +
            (type === 'return' ? '<div class="wide"><span>Reason</span><b>' + esc(rec.reason) + '</b></div><div class="wide"><span>Customer comment</span><b>' + esc(rec.comment) + '</b></div>' : '') +
            '</div>' + thumbs(type, rec) + decided + '</div>' + buttons + '</article>';
    }

    function renderVerification() {
        const d = deliveries(), r = returns(), all = d.concat(r);
        const pd = d.filter(x => x.status === 'Pending').length, pr = r.filter(x => x.status === 'Pending').length;
        $('#v-pd').textContent = pd; $('#v-pr').textContent = pr; $('#c-del').textContent = pd; $('#c-ret').textContent = pr;
        $('#v-ap').textContent = all.filter(x => x.status === 'Approved').length;
        $('#v-rj').textContent = all.filter(x => x.status === 'Rejected').length;
        const byPending = (a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1);
        $('#del-list').innerHTML = d.slice().sort(byPending).map(x => caseHtml('delivery', x)).join('') || '<p class="empty-note">No delivery proofs yet.</p>';
        $('#ret-list').innerHTML = r.slice().sort(byPending).map(x => caseHtml('return', x)).join('') || '<p class="empty-note">No return requests yet.</p>';
        $('#log-rows').innerHTML = vlogs().map(l => '<tr><td data-label="ID" class="bold">' + esc(l.ref) + '</td><td data-label="Action">' + pill(l.action, l.result) + '</td><td data-label="Employee">' + esc(l.by.name) +
            '</td><td data-label="Date">' + dt(l.at) + '</td><td data-label="Remarks">' + (l.remarks ? esc(l.remarks) : '—') + '</td></tr>').join('') || empty(5, 'No activity yet.');
    }

    function renderSales() {
        const from = $('#from').value, to = $('#to').value;
        const list = orders().filter(o => isSale(o) && (!from || o.date.slice(0, 10) >= from) && (!to || o.date.slice(0, 10) <= to));
        const t = sum(list.map(total));
        $('#s-total').textContent = pesoS(t);
        $('#s-count').textContent = list.length;
        $('#s-avg').textContent = list.length ? pesoS(t / list.length) : '₱0';
        $('#s-cust').textContent = new Set(list.map(o => o.customer && o.customer.email)).size;
        $('#s-rows').innerHTML = list.map(o => '<tr><td data-label="Order ID" class="bold">' + esc(o.id) + '</td><td data-label="Date">' + nd(o.date) + '</td><td data-label="Customer">' + esc(custName(o)) +
            '</td><td data-label="Payment">' + esc(o.payment) + '</td><td data-label="Status">' + pill(o.status) + '</td><td data-label="Amount" class="num">' + peso(total(o)) + '</td></tr>').join('') || empty(6, 'No transactions for these dates.');
    }

    // customers = storefront accounts + anyone who ordered as a guest
    function customerList() {
        const map = {};
        Object.keys(usersMap()).forEach(email => {
            const u = usersMap()[email];
            map[email] = { email: email, name: u.name || u.fullName || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || email, phone: u.phone || '', joined: u.created || u.joined || u.createdAt || '', role: u.role || 'customer' };
        });
        orders().forEach(o => {
            const e = o.customer && o.customer.email;
            if (e && !map[e]) map[e] = { email: e, name: custName(o), phone: o.customer.phone || '', joined: o.date, role: 'customer' };
        });
        return Object.keys(map).map(k => map[k]);
    }

    function renderCustomers() {
        const q = $('#c-search').value.trim().toLowerCase();
        const month = new Date().toISOString().slice(0, 7);
        const rows = customerList().map(c => {
            const mine = orders().filter(o => o.customer && o.customer.email === c.email);
            const recent = mine.some(o => Date.now() - new Date(o.date) < 60 * 864e5);
            const status = c.joined && String(c.joined).slice(0, 7) === month ? 'New' : recent ? 'Active' : 'Inactive';
            return { c: c, mine: mine, status: status };
        });
        $('#c-total').textContent = rows.length;
        $('#c-new').textContent = rows.filter(r => r.status === 'New').length;
        $('#c-ret2').textContent = rows.filter(r => r.mine.length >= 2).length;
        $('#c-active').textContent = orders().filter(isOpen).length;
        const shown = rows.filter(r => (r.c.name + ' ' + r.c.email + ' ' + r.c.phone + ' ' + r.mine.map(o => o.id).join(' ')).toLowerCase().includes(q));
        $('#c-rows').innerHTML = shown.map(r => '<tr><td data-label="Name" class="bold">' + esc(r.c.name) + '</td><td data-label="Email">' + esc(r.c.email) + '</td><td data-label="Phone">' + esc(r.c.phone) +
            '</td><td data-label="Orders" class="num">' + r.mine.length + '</td><td data-label="Spent" class="num">' + peso(sum(r.mine.filter(isSale).map(total))) + '</td><td data-label="Status">' + pill(r.status) + '</td></tr>').join('') || empty(6, 'No customers yet.');
    }

    function renderUsers() {
        const q = $('#u-search').value.trim().toLowerCase();
        $('#u-rows').innerHTML = customerList().filter(c => (c.name + ' ' + c.email).toLowerCase().includes(q)).map(c =>
            '<tr><td data-label="Name" class="bold">' + esc(c.name) + '</td><td data-label="Email">' + esc(c.email) + '</td><td data-label="Rank"><select class="select" data-rank="' + esc(c.email) + '" aria-label="Rank for ' + esc(c.name) + '">' +
            ['customer', 'staff', 'admin'].map(r => '<option' + (c.role === r ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></td></tr>').join('') || empty(3, 'No users yet.');
    }

    function renderChrome() {
        const pending = orders().filter(o => o.status === 'Pending').length;
        const pv = deliveries().filter(x => x.status === 'Pending').length + returns().filter(x => x.status === 'Pending').length;
        const low = catalog().filter(p => p.stock <= LOW).length;
        const notes = [];
        if (pending) notes.push([pending + ' order' + (pending === 1 ? '' : 's') + ' need payment verification', '#/orders']);
        if (pv) notes.push([pv + ' proof or return request' + (pv === 1 ? '' : 's') + ' to review', '#/verification']);
        if (low) notes.push([low + ' product' + (low === 1 ? ' is' : 's are') + ' low or out of stock', '#/inventory']);
        $('#notif-badge').hidden = !notes.length;
        $('#notif-badge').textContent = notes.length;
        $('#notif-list').innerHTML = notes.map(n => '<a class="note" href="' + n[1] + '"><div>' + n[0] + '</div></a>').join('') || '<div class="note"><div>You are all caught up.</div></div>';
        $('#who').textContent = me().name;
    }

    let lastPendingIds = null;
    function renderAll() {
        renderDashboard(); renderProducts(); renderInventory(); renderOrders(); renderVerification();
        renderSales(); renderCustomers(); renderUsers(); renderChrome();
        // tell the admin when a new customer order arrives
        const ids = orders().map(o => o.id);
        if (lastPendingIds && ids.some(id => !lastPendingIds.includes(id))) toast('New order received');
        lastPendingIds = ids;
    }

    /* ---------- routing, menu, dropdowns ---------- */
    const titles = { dashboard: 'Dashboard', products: 'Products', inventory: 'Inventory', orders: 'Orders & Payments', verification: 'Order Verification', sales: 'Sales Reports', customers: 'Customers', users: 'Manage Users' };
    function route() {
        let name = location.hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
        if (!titles[name]) name = 'dashboard';
        $$('.view').forEach(v => v.classList.toggle('active', v.id === name));
        $$('.sidebar .nav').forEach(a => a.dataset.route === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
        $('#page-title').textContent = titles[name];
        document.title = titles[name] + ' | MystiqueCollections Admin';
        document.body.classList.remove('menu-open');
        window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', route);

    $('#menu-btn').addEventListener('click', () => {
        const open = document.body.classList.toggle('menu-open');
        $('#menu-btn').setAttribute('aria-expanded', String(open));
    });
    $('#scrim').addEventListener('click', () => document.body.classList.remove('menu-open'));
    $$('.dropdown').forEach(box => {
        const btn = box.querySelector('[aria-expanded]');
        btn.addEventListener('click', () => {
            const open = !box.classList.contains('open');
            $$('.dropdown').forEach(b => { b.classList.remove('open'); b.querySelector('[aria-expanded]').setAttribute('aria-expanded', 'false'); });
            box.classList.toggle('open', open);
            btn.setAttribute('aria-expanded', String(open));
        });
    });
    document.addEventListener('click', e => { if (!e.target.closest('.dropdown')) $$('.dropdown').forEach(b => b.classList.remove('open')); });

    // tabs (inventory + verification)
    document.addEventListener('click', e => {
        const tab = e.target.closest('.tab[data-group]');
        if (!tab) return;
        const g = tab.dataset.group;
        $$('.tab[data-group="' + g + '"]').forEach(t => t.setAttribute('aria-pressed', String(t === tab)));
        $$('.tab-panel[data-group="' + g + '"]').forEach(p => { p.hidden = p.id !== g + '-' + tab.dataset.tab; });
    });

    /* ---------- actions ---------- */
    const dialog = $('#decision-dialog');
    let pending = null;

    function openDecision(type, id, approve) {
        const rec = (type === 'delivery' ? deliveries() : returns()).find(x => x.id === id);
        pending = { type: type, id: id, approve: approve };
        $('#decision-title').textContent = (approve ? 'Approve ' : 'Reject ') + (type === 'delivery' ? 'delivery proof for order ' + rec.order : 'return request ' + rec.id);
        $('#decision-text').textContent = type === 'delivery' && approve ? 'Approving marks the order Delivered and subtracts the items from stock.' : '';
        $('#remarks-label').textContent = !approve && type === 'return' ? 'Reason for rejecting (required)' : 'Remarks (optional)';
        $('#remarks').value = '';
        $('#decision-error').hidden = true;
        $('#decision-confirm').textContent = approve ? 'Approve' : 'Reject';
        $('#decision-confirm').classList.toggle('danger', !approve);
        dialog.showModal();
    }

    $('#decision-form').addEventListener('submit', e => {
        e.preventDefault();
        const remarks = $('#remarks').value.trim();
        if (!pending.approve && pending.type === 'return' && !remarks) { $('#decision-error').hidden = false; return; }
        const key = pending.type === 'delivery' ? 'deliveries' : 'returns';
        const list = S.get(key, []);
        const rec = list.find(x => x.id === pending.id);
        rec.status = pending.approve ? 'Approved' : 'Rejected';
        rec.decision = { by: me(), at: new Date().toISOString(), remarks: remarks };
        S.set(key, list);
        log(pending.type, pending.type === 'delivery' ? rec.order : rec.id, (pending.type === 'delivery' ? 'Delivery ' : 'Return ') + rec.status.toLowerCase(), rec.status, remarks);
        if (pending.type === 'delivery' && pending.approve) {
            const o = orderById(rec.order);
            if (o && o.status !== 'Delivered') {
                (o.items || []).forEach(i => changeStock(i.id, s => s - i.qty, o.id));
                setStatus(o.id, 'Delivered');
            }
        }
        dialog.close();
        toast(rec.status + '.');
    });
    $('#decision-cancel').addEventListener('click', () => dialog.close());

    document.addEventListener('click', e => {
        const img = e.target.closest('[data-photo]');
        if (img) {
            const p = img.dataset.photo.split('|');
            const rec = (p[0] === 'delivery' ? deliveries() : returns()).find(x => x.id === p[1]);
            const ph = rec.photos[Number(p[2])];
            $('#photo-title').textContent = ph.caption;
            $('#photo-large').src = ph.src;
            $('#photo-dialog').showModal();
            return;
        }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const id = b.dataset.id, a = b.dataset.act;
        if (a === 'approve' || a === 'reject') openDecision(b.dataset.type, id, a === 'approve');
        else if (a === 'verify') { setStatus(id, 'Paid'); log('payment', id, 'Payment verified', 'Approved', ''); toast('Payment verified for ' + id); }
        else if (a === 'pack') { setStatus(id, 'Packed'); toast(id + ' marked packed'); }
        else if (a === 'ship') { setStatus(id, 'Shipped'); toast(id + ' marked shipped'); }
        else if (a === 'cancel') { setStatus(id, 'Cancelled'); log('payment', id, 'Order cancelled', 'Rejected', ''); toast(id + ' cancelled'); }
        else if (a === 'del-product' && confirm('Remove this product from the admin catalog?')) S.set('catalog', catalog().filter(p => p.id !== id));
    });
    $('#photo-close').addEventListener('click', () => $('#photo-dialog').close());
    [$('#photo-dialog'), dialog].forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

    $('#product-form').addEventListener('submit', e => {
        e.preventDefault();
        const name = $('#np-name').value.trim();
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const c = catalog();
        if (c.some(p => p.id === id)) { toast('That product already exists'); return; }
        c.push({ id: id, name: name, sku: $('#np-sku').value.trim().toUpperCase(), price: Number($('#np-price').value), stock: Math.max(0, parseInt($('#np-stock').value, 10) || 0) });
        S.set('catalog', c);
        e.target.reset();
        $('#np-stock').value = 0;
        toast('Product added. Use the same id on the storefront: ' + id);
    });

    $('#stock-form').addEventListener('submit', e => {
        e.preventDefault();
        const qty = Math.max(0, parseInt($('#su-qty').value, 10) || 0);
        const mode = $('#su-action').value;
        changeStock($('#su-product').value, s => mode === 'add' ? s + qty : mode === 'remove' ? s - qty : qty);
        toast('Stock updated');
    });

    $('#date-filter').addEventListener('submit', e => { e.preventDefault(); renderSales(); });
    $('#clear-dates').addEventListener('click', () => { $('#from').value = ''; $('#to').value = ''; renderSales(); });
    $('#print-report').addEventListener('click', () => window.print());
    ['#o-search', '#o-filter'].forEach(s => $(s).addEventListener('input', renderOrders));
    $('#c-search').addEventListener('input', renderCustomers);
    $('#u-search').addEventListener('input', renderUsers);
    document.addEventListener('change', e => {
        const email = e.target.dataset && e.target.dataset.rank;
        if (!email) return;
        const u = usersMap();
        if (u[email]) { u[email].role = e.target.value; S.set('users', u); toast('Rank updated'); }
    });

    /* ---------- go ---------- */
    S.subscribe(renderAll);   // any change from a customer (or another admin tab) redraws instantly
    renderAll();
    route();
})();