/* Sidebar view switching + Profile. Include with settings.js. */
(function () {
    'use strict';
    function $(id) { return document.getElementById(id); }
    function read() { try { return JSON.parse(localStorage.getItem('mq_profile')) || {}; } catch (e) { return {}; } }
    function write(v) { try { localStorage.setItem('mq_profile', JSON.stringify(v)); return true; } catch (e) { return false; } }
    function say(msg) {
        if (window.MQ && MQ.toast) { MQ.toast(msg); return; }
        var t = document.querySelector('.toast');
        if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(say.t);
        say.t = setTimeout(function () { t.classList.remove('show'); }, 1800);
    }

    /* ---- sidebar: switch views by hash ---- */
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
    var views = Array.prototype.slice.call(document.querySelectorAll('.view'));
    var current = 'profile';
    function show(id) {
        var v = $(id);
        if (!v || !v.classList.contains('view')) return false;
        views.forEach(function (x) { x.classList.toggle('on', x === v); });
        links.forEach(function (a) {
            var on = a.getAttribute('href') === '#' + id;
            a.classList.toggle('on', on);
            if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        });
        current = id;
        window.scrollTo(0, 0);
        return true;
    }
    window.addEventListener('hashchange', function () {
        var id = location.hash.slice(1) || 'profile';
        if (!show(id)) { say('Coming soon'); history.replaceState(null, '', '#' + current); }
    });
    if (!show(location.hash.slice(1) || 'profile')) show('profile');

    /* ---- profile ---- */
    var DEF = { name: 'Karen J. Barrientos', email: 'karen.barrientos@example.com', phone: '', bday: '', prefs: 'Makeup · Skincare' };
    var ids = { name: 'p-name', email: 'p-email', phone: 'p-phone', bday: 'p-bday', prefs: 'p-prefs' };
    var data = Object.assign({}, DEF, read());
    var form = $('p-form'), btn = $('p-edit'), err = $('p-err'), editing = false;

    function header() {
        var parts = data.name.trim().split(/\s+/).filter(Boolean);
        $('p-first').textContent = parts[0] || 'there';
        $('p-avatar').textContent = parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() : '·';
    }
    function fill() { Object.keys(ids).forEach(function (k) { $(ids[k]).value = data[k]; }); header(); }
    function lock(on) {
        Object.keys(ids).forEach(function (k) { $(ids[k]).readOnly = on; });
        form.classList.toggle('editing', !on);
    }
    fill();

    btn.addEventListener('click', function () {
        err.textContent = '';
        if (!editing) {
            editing = true;
            lock(false);
            btn.textContent = 'Save Profile';
            $('p-name').focus();
            return;
        }
        var next = {};
        Object.keys(ids).forEach(function (k) { next[k] = $(ids[k]).value.trim(); });
        if (!next.name) { err.textContent = 'Please enter your full name.'; $('p-name').focus(); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next.email)) { err.textContent = 'Enter a valid email address.'; $('p-email').focus(); return; }
        data = next;
        if (!write(data)) { err.textContent = 'Your browser blocked saving. Try again.'; return; }
        editing = false;
        lock(true);
        btn.textContent = 'Edit Profile';
        header();
        say('Profile updated');
    });

    document.addEventListener('click', function (e) {
        var s = e.target.closest('[data-soon]');
        if (s) say(s.getAttribute('data-soon'));
    });
})();

/* Settings tabs + save. Include after your account script. */
(function () {
    'use strict';
    var root = document.getElementById('settings');
    if (!root) return;

    var KEY = 'mq_settings';
    function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
    function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }

    function say(msg) {
        if (window.MQ && MQ.toast) { MQ.toast(msg); return; }
        var t = document.querySelector('.toast');
        if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(say.t);
        say.t = setTimeout(function () { t.classList.remove('show'); }, 1800);
    }

    /* tabs */
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.stab'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('.set-panel'));
    function select(tab) {
        tabs.forEach(function (t) {
            var on = t === tab;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p) { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
    }
    tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { select(t); });
        t.addEventListener('keydown', function (e) {
            var d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
            if (!d) return;
            e.preventDefault();
            var n = tabs[(i + d + tabs.length) % tabs.length];
            n.focus();
            select(n);
        });
    });

    /* load saved values */
    var saved = read();
    Array.prototype.forEach.call(root.querySelectorAll('[name]'), function (f) {
        if (!(f.name in saved)) return;
        if (f.type === 'checkbox') f.checked = !!saved[f.name]; else f.value = saved[f.name];
    });

    /* save */
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function $(id) { return document.getElementById(id); }

    root.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-save]');
        if (!btn) return;
        var panel = btn.closest('.set-panel');
        var err = panel.querySelector('.set-err');
        err.textContent = '';

        if (panel.id === 'set-account') {
            var em = $('s-email').value.trim();
            if (em && !EMAIL.test(em)) { err.textContent = 'Enter a valid email address.'; $('s-email').focus(); return; }
        }

        var passwordChanged = false;
        if (panel.id === 'set-security') {
            var cur = $('s-cur-pw').value, p1 = $('s-new-pw').value, p2 = $('s-new-pw2').value;
            if (cur || p1 || p2) {
                if (!cur) { err.textContent = 'Enter your current password.'; $('s-cur-pw').focus(); return; }
                if (p1.length < 8 || !/[a-z]/.test(p1) || !/[A-Z]/.test(p1) || !/\d/.test(p1)) {
                    err.textContent = 'New password needs 8+ characters with uppercase, lowercase and a number.'; $('s-new-pw').focus(); return;
                }
                if (p1 !== p2) { err.textContent = 'Passwords do not match.'; $('s-new-pw2').focus(); return; }
                passwordChanged = true; // demo only: nothing is sent anywhere
            }
        }

        var data = read();
        Array.prototype.forEach.call(panel.querySelectorAll('[name]'), function (f) {
            data[f.name] = f.type === 'checkbox' ? f.checked : f.value;
        });
        if (!write(data)) { err.textContent = 'Your browser blocked saving. Try again.'; return; }
        if (passwordChanged) {
            Array.prototype.forEach.call(panel.querySelectorAll('input[type=password]'), function (i) { i.value = ''; });
            say('Password updated');
        } else {
            say('Changes saved');
        }
    });
})();

/* Orders & Payments: recent orders list + payment and tracking panels. */
(function () {
    'use strict';
    var root = document.getElementById('orders');
    if (!root) return;

    var STAGES = ['Order placed', 'Payment verified', 'Preparing', 'Shipped', 'Delivered'];
    var SHORT = ['Placed', 'Paid', 'Prepared', 'Shipped', 'Delivered'];
    var ORDERS = [
        { id: 'MC-2026-1089', items: '3 beauty essentials · Midnight Mauve', summary: '3 beauty essentials', total: 2850, status: 'Payment review', stage: 0,
          method: 'GCash', pay: 'Awaiting verification', receipt: 'Submitted · awaiting review', tracking: 'Not assigned yet',
          note: 'We will show carrier tracking after payment verification and dispatch.' },
        { id: 'MS-10441', items: 'Second Skin Tint', summary: 'Second Skin Tint', total: 890, status: 'Delivered', stage: 4,
          method: 'Maya', pay: 'Paid', receipt: 'Verified', tracking: 'Demo tracking 10441',
          note: 'Delivered. Thank you for choosing Mystique.' },
        { id: 'MS-10422', items: 'Everyday Mini Bag', summary: 'Everyday Mini Bag', total: 1490, status: 'Processing', stage: 2,
          method: 'Credit / Debit Card', pay: 'Paid', receipt: 'Verified', tracking: 'Not assigned yet',
          note: 'Your order is being prepared. Tracking appears once it ships.' }
    ];

    function $(id) { return document.getElementById(id); }
    function peso(n) { return '₱' + n.toLocaleString('en-PH'); }
    function pesoD(n) { return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    var rows = $('o-rows');
    var buttons = ORDERS.map(function (o, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'orow';
        b.setAttribute('aria-pressed', 'false');
        [['#' + o.id], [o.items], [peso(o.total)], [o.status]].forEach(function (c) {
            var s = document.createElement('span');
            s.textContent = c[0];
            b.appendChild(s);
        });
        b.addEventListener('click', function () { select(i); });
        rows.appendChild(b);
        return b;
    });

    function select(i) {
        var o = ORDERS[i];
        buttons.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });

        $('o-pay-order').textContent = 'Order #' + o.id;
        $('o-method').textContent = o.method;
        $('o-status').textContent = o.pay;
        $('o-receipt').textContent = o.receipt;

        $('o-track-sum').textContent = 'Order #' + o.id + ' · ' + o.summary + ' · ' + pesoD(o.total);
        $('o-stage').textContent = STAGES[o.stage];
        $('o-tracking').textContent = o.tracking;
        $('o-note').textContent = o.note;

        var ol = $('o-steps');
        ol.style.setProperty('--p', o.stage / (STAGES.length - 1));
        ol.innerHTML = '';
        SHORT.forEach(function (label, n) {
            var li = document.createElement('li');
            if (n < o.stage) li.className = 'done';
            if (n === o.stage) { li.className = 'now'; li.setAttribute('aria-current', 'step'); }
            li.innerHTML = '<i></i><span></span>';
            li.lastChild.textContent = label;
            ol.appendChild(li);
        });
    }
    select(0);
})();