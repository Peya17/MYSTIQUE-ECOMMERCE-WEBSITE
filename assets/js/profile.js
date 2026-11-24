/* =========================================================
   MYSTIQUE — profile popup + accounts (shared by every page)
   general.js loads this file automatically; wishlist.html loads it with a
   <script> tag (that page does not use general.js).

   Accounts are saved in this browser only (localStorage), the same way the
   bag and wishlist are:
       mq_users    every account made on this device
       mq_session  who is signed in (sessionStorage when "Keep me signed in" is off)
   Passwords are never stored as typed: they are salted and hashed.
   NOTE: because there is no server, this is a front-end account. When you add a
   backend, swap the functions in the "Accounts" block for real requests.

   The popup now only shows for a signed-in user. Signed-out users are sent
   to the login / sign up page.

   Other scripts (profile-page.js) use it through window.MQProfile.
   ========================================================= */
(function () {
    'use strict';
    if (window.MQProfile) return;

    var USERS_KEY = 'mq_users';
    var SESSION_KEY = 'mq_session';
    var AUTH_PAGE = 'loginandsignin.html#signup';
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;   // same rule as checkout
    var PAYMENTS = { gcash: 'GCash', maya: 'Maya', bank: 'Bank Transfer', card: 'Credit / Debit Card', cod: 'Cash on Delivery' };
    var thisScript = document.currentScript;

    /* ---------- Load the stylesheet (assets/css/profile.css) ---------- */
    (function loadCss() {
        if (document.querySelector('link[href*="profile.css"]')) return;
        try {
            var l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = new URL('../css/profile.css', thisScript.src).href;
            document.head.appendChild(l);
        } catch (e) { /* the page can still add the <link> itself */ }
    })();

    /* ---------- Small helpers ---------- */
    function $(s, r) { return (r || document).querySelector(s); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function read(k, d, area) {
        try { var v = (area || localStorage).getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    }
    function write(k, v, area) {
        try { (area || localStorage).setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    }
    function pesoD(n) { return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    var validName = function (v) { return String(v).trim().length > 1; };
    var validEmail = function (v) { return EMAIL_RE.test(String(v).trim()); };
    var validPhone = function (v) { return String(v).replace(/\D/g, '').length >= 10; };
    var validZip = function (v) { return /^\d{4}$/.test(String(v).trim()); };
    var validPw = function (v) { return v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v); };
    var PW_HINT = 'At least 8 characters, with a letter and a number.';

    /* ---------- Toast (same look as the site toast; works on every page) ---------- */
    var toastTimer;
    function toast(msg) {
        var t = $('.pf-toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'pf-toast';
            t.setAttribute('role', 'status');
            t.setAttribute('aria-live', 'polite');
            document.body.appendChild(t);
        }
        t.textContent = msg;
        void t.offsetWidth;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    /* =====================================================
       Accounts
       ===================================================== */
    function getUsers() { var u = read(USERS_KEY, []); return Array.isArray(u) ? u : []; }
    function saveUsers(list) { return write(USERS_KEY, list); }

    function randHex(n) {
        var a = new Uint8Array(n), i;
        if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
        else for (i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
        return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }

    function bestAlgo() {
        return window.crypto && window.crypto.subtle && window.TextEncoder ? 'pbkdf2' : 'weak';
    }

    function hashWith(pw, salt, algo) {
        if (algo === 'pbkdf2') {
            if (!(window.crypto && window.crypto.subtle && window.TextEncoder)) return Promise.reject(new Error('no crypto'));
            var enc = new TextEncoder();
            return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
                .then(function (key) {
                    return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
                })
                .then(function (bits) {
                    return Array.prototype.map.call(new Uint8Array(bits), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
                });
        }
        var s = salt + pw, h1 = 5381, h2 = 52711, i, c;     // fallback for very old browsers
        for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); h1 = ((h1 * 33) ^ c) >>> 0; h2 = ((h2 * 33) ^ c) >>> 0; }
        return Promise.resolve(h1.toString(16) + h2.toString(16));
    }

    var GENERIC_ERR = { ok: false, error: 'Something went wrong. Please try again.' };
    var STORAGE_ERR = { ok: false, error: 'We couldn’t save that. Your browser’s storage looks unavailable.' };

    function getSessionId() {
        var s = read(SESSION_KEY, null, localStorage) || read(SESSION_KEY, null, sessionStorage);
        return s && s.id ? s.id : null;
    }
    function clearSession() {
        try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
        try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    }
    function setSession(id, remember) {
        clearSession();
        write(SESSION_KEY, { id: id }, remember ? localStorage : sessionStorage);
    }

    // Reads the signed-in account. Understands BOTH storage formats:
    //   new:  mq_session = { id }            + mq_users = [ { id, email, ... } ]
    //   old:  mq_session = { email, exp }    + mq_users = { "email": {...} }
    function getUser() {
        var s = read(SESSION_KEY, null, localStorage) || read(SESSION_KEY, null, sessionStorage);
        if (!s || typeof s !== 'object') return null;
        if (s.exp && s.exp <= Date.now()) return null;

        var users = read(USERS_KEY, []);
        var email = s.email ? String(s.email).toLowerCase() : '';
        var u = null, key = '';

        if (Array.isArray(users)) {                                   // new format
            u = users.filter(function (x) {
                return x && ((s.id && x.id === s.id) || (email && String(x.email || '').toLowerCase() === email));
            })[0];
        } else if (users && typeof users === 'object') {              // login page format: { "email": {...} }
            key = Object.keys(users).filter(function (k) { return k.toLowerCase() === email; })[0] || '';
            u = key ? users[key] : null;
        }
        if (!u) return null;

        var addr = Array.isArray(u.addresses) ? u.addresses : [];
        var full = u.name || u.fullName || u.fullname ||
            [u.firstName || u.firstname, u.lastName || u.lastname].filter(Boolean).join(' ') ||
            u.username || '';
        var mail = u.email || key || s.email || '';
        return Object.assign({}, u, {
            id: u.id || s.id || mail,
            name: full || mail.split('@')[0],
            email: mail,
            phone: u.phone || u.mobile || '',
            addresses: addr,
            prefs: u.prefs || {}
        });
    }

    function changed() {
        document.dispatchEvent(new CustomEvent('mq:authchange', { detail: { user: getUser() } }));
    }
    function firstName(u) { return String(u.name || '').trim().split(/\s+/)[0] || 'you'; }
    function initials(u) {
        var p = String(u.name || '').trim().split(/\s+/).filter(Boolean);
        if (!p.length) return '?';
        return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
    }

    var fails = {};   // sign-in attempts, kept in memory only

    function signUp(d) {
        var name = String(d.name || '').trim();
        var email = String(d.email || '').trim();
        var phone = String(d.phone || '').trim();
        function no(field, error) { return Promise.resolve({ ok: false, field: field, error: error }); }

        if (!validName(name)) return no('name', 'Please enter your full name.');
        if (!validEmail(email)) return no('email', 'Enter a valid email address.');
        if (phone && !validPhone(phone)) return no('phone', 'Enter a valid mobile number (at least 10 digits).');
        if (!validPw(d.password || '')) return no('password', PW_HINT);
        if (d.password !== d.confirm) return no('confirm', 'The passwords don’t match.');

        var users = getUsers();
        if (users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
            return no('email', 'An account with this email already exists. Try signing in.');
        }

        var algo = bestAlgo(), salt = randHex(16);
        return hashWith(d.password, salt, algo).then(function (hash) {
            var user = {
                id: 'u' + Date.now().toString(36) + randHex(3),
                name: name, email: email, phone: phone, birthday: '',
                salt: salt, algo: algo, hash: hash,
                created: new Date().toISOString(),
                prevEmails: [], addresses: [],
                prefs: { orders: true, arrivals: false, offers: false, prefill: true, payment: '' }
            };
            users.push(user);
            if (!saveUsers(users)) return STORAGE_ERR;
            setSession(user.id, true);
            changed();
            return { ok: true, user: user };
        }).catch(function () { return GENERIC_ERR; });
    }

    function signIn(email, password, remember) {
        var key = String(email || '').trim().toLowerCase();
        var f = fails[key];
        if (f && f.until > Date.now()) {
            return Promise.resolve({ ok: false, error: 'Too many attempts. Please try again in ' + Math.ceil((f.until - Date.now()) / 1000) + ' seconds.' });
        }
        function bad() {
            f = fails[key] = fails[key] || { count: 0, until: 0 };
            f.count++;
            if (f.count >= 5) { f.count = 0; f.until = Date.now() + 30000; }
            return { ok: false, error: 'That email and password don’t match.' };
        }
        var user = getUsers().filter(function (u) { return u.email.toLowerCase() === key; })[0];
        if (!user) return Promise.resolve(bad());
        return hashWith(password, user.salt, user.algo).then(function (h) {
            if (h !== user.hash) return bad();
            delete fails[key];
            setSession(user.id, !!remember);
            changed();
            return { ok: true, user: user };
        }).catch(function () { return GENERIC_ERR; });
    }

    function signOut() { clearSession(); changed(); }

    function verifyPassword(user, pw) {
        return hashWith(pw, user.salt, user.algo).then(function (h) { return h === user.hash; });
    }

    // patch can hold: name, email, phone, birthday, addresses, prefs
    // (saving works for accounts stored in the array format)
    function updateUser(patch) {
        var users = getUsers(), id = getSessionId();
        var u = users.filter(function (x) { return x.id === id; })[0];
        if (!u) return { ok: false, error: 'Please sign in again.' };
        if (patch.email && patch.email.toLowerCase() !== u.email.toLowerCase()) {
            if (users.some(function (x) { return x.id !== u.id && x.email.toLowerCase() === patch.email.toLowerCase(); })) {
                return { ok: false, field: 'email', error: 'That email is already used by another account.' };
            }
            u.prevEmails = u.prevEmails || [];
            if (u.prevEmails.indexOf(u.email.toLowerCase()) < 0) u.prevEmails.push(u.email.toLowerCase());
        }
        Object.keys(patch).forEach(function (k) { u[k] = patch[k]; });
        if (!saveUsers(users)) return STORAGE_ERR;
        changed();
        return { ok: true, user: u };
    }

    function changePassword(current, next) {
        var user = getUser();
        if (!user) return Promise.resolve({ ok: false, error: 'Please sign in again.' });
        return verifyPassword(user, current).then(function (good) {
            if (!good) return { ok: false, field: 'current', error: 'That isn’t your current password.' };
            var algo = bestAlgo(), salt = randHex(16);
            return hashWith(next, salt, algo).then(function (hash) {
                var users = getUsers();
                var u = users.filter(function (x) { return x.id === user.id; })[0];
                u.salt = salt; u.algo = algo; u.hash = hash;
                return saveUsers(users) ? { ok: true } : STORAGE_ERR;
            });
        }).catch(function () { return GENERIC_ERR; });
    }

    function deleteAccount(password) {
        var user = getUser();
        if (!user) return Promise.resolve({ ok: false, error: 'Please sign in again.' });
        return verifyPassword(user, password).then(function (good) {
            if (!good) return { ok: false, field: 'password', error: 'That password isn’t right.' };
            var rest = getUsers().filter(function (x) { return x.id !== user.id; });
            if (!saveUsers(rest)) return STORAGE_ERR;
            clearSession();
            changed();
            return { ok: true };
        }).catch(function () { return GENERIC_ERR; });
    }

    /* ---------- Orders (checkout saves them in "mq_orders") ---------- */
    function userOrders(user) {
        if (!user) return [];
        var mine = [user.email.toLowerCase()].concat(user.prevEmails || []);
        return read('mq_orders', []).filter(function (o) {
            return o && o.customer && mine.indexOf(String(o.customer.email || '').toLowerCase()) > -1;
        });
    }

    function orderStatus(o) {
        var m = o.payment && o.payment.method;
        if (m === 'gcash' || m === 'maya' || m === 'bank') return ['Under verification', false];
        if (m === 'cod') return ['Pay on delivery', false];
        return ['Paid', true];
    }

    // puts an old order's items back in the bag (same storage as general.js)
    function reorder(o) {
        var cart = read('mq_cart', []), added = 0;
        (o.items || []).forEach(function (i) {
            if (window.MQ && !window.MQ.byId(i.id)) return;
            var shade = /^Shade: /.test(i.variation || '') ? i.variation.slice(7) : '';
            var line = cart.filter(function (l) { return l.id === i.id && l.shade === shade; })[0];
            if (line) line.qty += i.qty; else cart.push({ id: i.id, shade: shade, qty: i.qty });
            added++;
        });
        if (!added) { toast('Those items are no longer available'); return; }
        write('mq_cart', cart);
        if (window.MQ) { window.MQ.state.cart = cart; window.MQ.saveCart(true); }
        else Array.prototype.forEach.call(document.querySelectorAll('[data-cart-count]'), function (b) {
            b.textContent = cart.reduce(function (s, l) { return s + l.qty; }, 0);
        });
        toast('Added to your bag');
    }

    function bagCount() { return read('mq_cart', []).reduce(function (s, l) { return s + (l.qty || 0); }, 0); }
    function wishCount() { return read('mq_wish', []).length; }

    function defaultAddress(u) {
        var list = (u && u.addresses) || [];
        return list.filter(function (a) { return a.isDefault; })[0] || list[0] || null;
    }
    function addressLine(a) { return [a.street, a.city, a.province].filter(Boolean).join(', ') + (a.zip ? ' ' + a.zip : ''); }

    /* =====================================================
       Form building blocks (also used by profile-page.js)
       ===================================================== */
    function fieldHtml(o) {
        var type = o.type || 'text';
        var attrs = ' id="' + o.id + '" name="' + o.id + '"' +
            (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') +
            (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') +
            (o.max ? ' max="' + o.max + '"' : '') +
            (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') +
            (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '');
        var input;
        if (o.tag === 'textarea') {
            input = '<textarea class="pf-input"' + attrs + ' rows="3">' + esc(o.value) + '</textarea>';
        } else if (o.tag === 'select') {
            input = '<select class="pf-input"' + attrs + '>' + o.options.map(function (x) {
                return '<option value="' + esc(x) + '"' + (x === o.value ? ' selected' : '') + '>' + esc(x) + '</option>';
            }).join('') + '</select>';
        } else {
            input = '<input class="pf-input" type="' + type + '"' + attrs + ' value="' + esc(o.value) + '">';
        }
        if (o.pw) {
            input = '<div class="pf-pw">' + input +
                '<button type="button" class="pf-pw-toggle" data-pf="toggle-pw" aria-label="Show password" aria-pressed="false">Show</button></div>';
        }
        return '<div class="pf-field"><label for="' + o.id + '">' + o.label +
            (o.optional ? ' <span class="pf-optional">(optional)</span>' : '') + '</label>' + input +
            (o.hint ? '<p class="pf-hint">' + o.hint + '</p>' : '') +
            '<p class="pf-error" id="' + o.id + '-err" role="alert"></p></div>';
    }

    // shows (or clears, with an empty message) the error under one input
    function setErr(input, msg) {
        if (!input) return;
        var f = input.closest('.pf-field');
        if (!f) return;
        f.classList.toggle('bad', !!msg);
        var e = f.querySelector('.pf-error');
        if (e) e.textContent = msg || '';
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
        if (msg) input.setAttribute('aria-describedby', input.id + '-err'); else input.removeAttribute('aria-describedby');
    }
    function clearErrors(form) {
        Array.prototype.forEach.call(form.querySelectorAll('.pf-input'), function (i) { setErr(i, ''); });
        var fe = form.querySelector('.pf-form-error');
        if (fe) { fe.textContent = ''; fe.classList.remove('show'); }
    }
    function formError(form, msg) {
        var fe = form.querySelector('.pf-form-error');
        if (!fe) return;
        fe.textContent = msg;
        fe.classList.add('show');
    }
    function busy(btn, on, label) {
        if (!btn) return;
        if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Please wait…'; btn.disabled = true; }
        else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
    }
    function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }

    /* =====================================================
       Popup (signed-in account only)
       ===================================================== */
    var overlay, body, lastFocus, prevOverflow = '';

    function accountHtml(u) {
        var a = defaultAddress(u);
        return '<div class="pf-who"><span class="pf-avatar" aria-hidden="true">' + esc(initials(u)) + '</span><div>' +
            '<h2 class="pf-title pf-title-sm" id="pfTitle" tabindex="-1">Hi, ' + esc(firstName(u)) + '.</h2>' +
            '<p class="pf-email">' + esc(u.email) + '</p></div></div>' +
            '<div class="pf-stats">' +
            '<a class="pf-stat" href="cart.html"><b>' + bagCount() + '</b><span>Bag</span></a>' +
            '<a class="pf-stat" href="wishlist.html"><b>' + wishCount() + '</b><span>Wishlist</span></a>' +
            '<a class="pf-stat" href="profile.html#orders"><b>' + userOrders(u).length + '</b><span>Orders</span></a></div>' +
            (a ? '<div class="pf-default"><span>Delivering to</span><p>' + esc(addressLine(a)) + '</p></div>' : '') +
            '<nav class="pf-menu" aria-label="Account">' +
            '<a href="profile.html#details">Profile settings <span aria-hidden="true">→</span></a>' +
            '<a href="profile.html#addresses">Delivery addresses <span aria-hidden="true">→</span></a>' +
            '<a href="profile.html#orders">My orders <span aria-hidden="true">→</span></a>' +
            '<a href="wishlist.html">Wishlist <span aria-hidden="true">→</span></a></nav>' +
            '<button type="button" class="pf-btn pf-btn-ghost pf-btn-block" data-pf="signout">Sign out</button>';
    }

    function render(keepFocus) {
        var user = getUser();
        if (!user) { close(); return; }
        body.innerHTML = accountHtml(user);
        if (keepFocus) return;
        ($('#pfTitle', body) || $('.pf-close', overlay)).focus();
    }

    function build() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.className = 'pf-overlay';
        overlay.id = 'pfOverlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<div class="pf-box" role="dialog" aria-modal="true" aria-labelledby="pfTitle">' +
            '<button type="button" class="pf-close" data-pf="close" aria-label="Close">×</button>' +
            '<div id="pfBody"></div></div>';
        document.body.appendChild(overlay);
        body = $('#pfBody', overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) { close(); return; }
            if (e.target.closest('a[href]')) close();      // links inside the popup leave the popup
        });
    }

    function open() {
        if (!getUser()) { window.location.href = AUTH_PAGE; return; }   // signed out: go to login, no popup
        build();
        lastFocus = document.activeElement;
        if (!overlay.classList.contains('open')) prevOverflow = document.body.style.overflow;
        render();
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (!overlay || !overlay.classList.contains('open')) return;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = prevOverflow;
        if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
    }

    function isOpen() { return !!overlay && overlay.classList.contains('open'); }

    /* ---------- Global clicks: header profile button + data-pf actions ---------- */
    document.addEventListener('click', function (e) {
        if (!e.target.closest) return;

        // the profile icon in pages with their own header (capture phase).
        // open() sends signed-out users to the login page.
        if (e.target.closest('[data-action="profile"], .tool-btn[aria-label="Profile"]')) {
            e.preventDefault();
            e.stopPropagation();
            open();
            return;
        }

        var el = e.target.closest('[data-pf]');
        if (!el) return;
        var a = el.dataset.pf;

        if (a === 'close') close();
        else if (a === 'open') open();
        else if (a === 'signout') {
            signOut();
            toast('You’ve been signed out');
            close();           // header flips back to "Sign Up" via mq:authchange
        } else if (a === 'toggle-pw') {
            var input = el.parentNode.querySelector('input');
            var show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            el.textContent = show ? 'Hide' : 'Show';
            el.setAttribute('aria-pressed', show);
            el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        }
    }, true);

    document.addEventListener('keydown', function (e) {
        if (!isOpen()) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return;
        var box = $('.pf-box', overlay);
        var items = Array.prototype.filter.call(
            box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea'),
            function (n) { return n.offsetParent !== null; }
        );
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // another tab signed in / out or changed the account
    window.addEventListener('storage', function (e) {
        if (e.key !== SESSION_KEY && e.key !== USERS_KEY) return;
        changed();
        if (isOpen()) { if (getUser()) render(true); else close(); }
    });

    /* ---------- Checkout: fill the delivery form from the saved profile ---------- */
    function prefillCheckout() {
        if (!document.getElementById('delivery-form')) return;
        var u = getUser();
        if (!u || (u.prefs && u.prefs.prefill === false)) return;
        var a = defaultAddress(u);
        function set(id, v) { var el = document.getElementById(id); if (el && v && !el.value) el.value = v; }

        set('full-name', (a && a.name) || u.name);
        set('email-address', u.email);
        set('contact-number', (a && a.phone) || u.phone);
        if (a) {
            set('street-address', a.street);
            set('city', a.city);
            set('province', a.province);
            set('zip-code', a.zip);
            set('delivery-notes', a.notes);
        }
        var pay = u.prefs && u.prefs.payment;
        if (pay) {
            var r = document.querySelector('input[name="payment-method"][value="' + pay + '"]');
            if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prefillCheckout);
    else prefillCheckout();
    document.addEventListener('mq:authchange', prefillCheckout);

    /* ---------- Public API ---------- */
    window.MQProfile = {
        open: open, close: close, toast: toast,
        getUser: getUser, signUp: signUp, signIn: signIn, signOut: signOut,
        updateUser: updateUser, changePassword: changePassword, deleteAccount: deleteAccount,
        userOrders: userOrders, orderStatus: orderStatus, reorder: reorder,
        bagCount: bagCount, wishCount: wishCount, defaultAddress: defaultAddress, addressLine: addressLine,
        initials: initials, firstName: firstName,
        esc: esc, pesoD: pesoD, PAYMENTS: PAYMENTS, PW_HINT: PW_HINT,
        valid: { name: validName, email: validEmail, phone: validPhone, zip: validZip, password: validPw },
        fieldHtml: fieldHtml, setErr: setErr, clearErrors: clearErrors, formError: formError, busy: busy, val: val
    };
})();