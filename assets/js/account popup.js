/* =========================================================
   MYSTIQUE — account popup (signed-in view only)
   Reads the REAL account saved by the login page:
       mq_users    every account made on this device
       mq_session  who is signed in (localStorage or sessionStorage)
   There is no sign-in / create-account form in here. Signed-out visitors
   never see this popup: general.js shows the "Sign Up" button for them.

   general.js loads this file and calls  MQAccount.open()  when the
   profile icon is clicked.
   ========================================================= */
(function () {
    'use strict';
    if (window.MQAccount) return;

    var LOGIN_PAGE = 'loginandsignin.html';

    /* ---------- Reading the saved account ---------- */
    function read(area, key) {
        try { return JSON.parse(area.getItem(key)); } catch (e) { return null; }
    }
    function readLS(key, fallback) {
        var v = read(localStorage, key);
        return v == null ? fallback : v;
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function session() {
        var s = read(localStorage, 'mq_session') || read(sessionStorage, 'mq_session');
        if (!s || typeof s !== 'object') return null;
        if (s.exp && s.exp <= Date.now()) return null;
        return s;
    }

    // returns the signed-in customer, or null
    function account() {
        var s = session();
        if (!s) return null;
        var users = readLS('mq_users', {});
        var email = s.email ? String(s.email).toLowerCase() : '';
        var u = null;

        if (Array.isArray(users)) {                       // list format
            u = users.filter(function (x) {
                return x && ((s.id && x.id === s.id) || (email && String(x.email || '').toLowerCase() === email));
            })[0] || null;
        } else if (users && typeof users === 'object') {  // login page format: keyed by email
            u = users[email] || users[s.email] || null;
            if (!u) {
                Object.keys(users).some(function (k) {
                    if (k.toLowerCase() === email) { u = users[k]; return true; }
                    return false;
                });
            }
        }
        if (!u) return null;

        var parts = String(u.name || '').trim().split(/\s+/).filter(Boolean);
        var first = u.first || parts[0] || 'there';
        var last = u.last || parts.slice(1).join(' ') || '';
        return {
            first: first,
            last: last,
            name: (first + ' ' + last).trim(),
            email: u.email || s.email || '',
            username: u.username || '',
            phone: u.phone || '',
            created: u.created || null
        };
    }

    function initials(a) {
        var f = String(a.first || '').trim().charAt(0);
        var l = String(a.last || '').trim().charAt(0);
        return (f + l).toUpperCase() || '?';
    }
    function bagCount() {
        return readLS('mq_cart', []).reduce(function (s, l) { return s + (l.qty || 0); }, 0);
    }
    function wishCount() {
        return readLS('mq_wish', []).length;
    }
    function orderCount(a) {
        var email = String(a.email || '').toLowerCase();
        return readLS('mq_orders', []).filter(function (o) {
            return o && o.customer && String(o.customer.email || '').toLowerCase() === email;
        }).length;
    }
    function memberSince(a) {
        if (!a.created) return '';
        var d = new Date(a.created);
        return isNaN(d) ? '' : d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    }

    /* ---------- Styles (added by this file, so no extra CSS link is needed) ---------- */
    function addStyles() {
        if (document.getElementById('acct-style')) return;
        var st = document.createElement('style');
        st.id = 'acct-style';
        st.textContent =
            '.acct-overlay{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(53,29,48,.55);font-family:"Inter",system-ui,sans-serif;font-size:15px;line-height:1.5;color:#351D30}' +
            '.acct-overlay.open{display:flex;animation:acct-fade .2s ease}' +
            '@keyframes acct-fade{from{opacity:0}}' +
            '.acct-overlay *{box-sizing:border-box}' +
            '.acct-box{position:relative;width:100%;max-width:440px;max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);overflow-y:auto;scrollbar-width:none;padding:28px 28px 24px;border-radius:30px;background:#FAEEF3;box-shadow:0 24px 50px rgba(53,29,48,.45)}' +
            '.acct-box::-webkit-scrollbar{display:none}' +
            '.acct-close{position:absolute;top:14px;right:18px;width:36px;height:36px;border:none;border-radius:50%;background:none;color:#351D30;font-size:28px;line-height:1;cursor:pointer;transition:transform .2s ease,background-color .2s ease}' +
            '.acct-close:hover{transform:scale(1.05);background:rgba(124,69,97,.12)}' +
            '.acct-who{display:flex;align-items:center;gap:16px;margin:4px 36px 20px 0}' +
            '.acct-who>div{min-width:0}' +
            '.acct-avatar{flex:none;width:64px;height:64px;display:grid;place-items:center;border-radius:50%;background:#4A2638;color:#fff;box-shadow:3px 4px 9px rgba(124,69,97,.22);font-family:"Cormorant Garamond",Georgia,serif;font-size:28px;font-weight:500;letter-spacing:.02em}' +
            '.acct-title{margin:0;font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:32px;line-height:1.05;color:#351D30;overflow:hidden;text-overflow:ellipsis}' +
            '.acct-title:focus{outline:none}' +
            '.acct-email{margin:4px 0 0;font-size:13px;color:rgba(53,29,48,.65);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
            '.acct-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}' +
            '.acct-stat{display:block;padding:12px 10px;border:1px solid rgba(255,255,255,.75);border-radius:18px;background:#F1E1E8;box-shadow:3px 4px 9px rgba(124,69,97,.22),-2px -2px 6px rgba(255,255,255,.8);text-align:center;color:#351D30;text-decoration:none;transition:transform .2s ease}' +
            'a.acct-stat:hover{transform:scale(1.05)}' +
            '.acct-stat b{display:block;font-family:"Cormorant Garamond",Georgia,serif;font-size:30px;font-weight:500;line-height:1.1}' +
            '.acct-stat span{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(53,29,48,.65)}' +
            '.acct-details{margin-bottom:16px;padding:6px 16px;border:1px solid rgba(255,255,255,.75);border-radius:18px;background:#F6E9EF;box-shadow:3px 4px 9px rgba(124,69,97,.22),-2px -2px 6px rgba(255,255,255,.8)}' +
            '.acct-row{display:flex;justify-content:space-between;gap:16px;padding:9px 0;font-size:14px}' +
            '.acct-row+.acct-row{border-top:1px solid #E2C6D2}' +
            '.acct-row span:first-child{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(53,29,48,.65);padding-top:2px}' +
            '.acct-row span:last-child{text-align:right;overflow-wrap:anywhere}' +
            '.acct-menu{display:grid;gap:10px;margin-bottom:18px}' +
            '.acct-menu a{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border:1px solid rgba(255,255,255,.75);border-radius:14px;background:#F6E9EF;box-shadow:3px 4px 9px rgba(124,69,97,.22),-2px -2px 6px rgba(255,255,255,.8);font-size:14px;color:#351D30;text-decoration:none;transition:transform .2s ease,background-color .2s ease}' +
            '.acct-menu a:hover{transform:scale(1.02);background:#EFD9E2}' +
            '.acct-out{display:flex;width:100%;align-items:center;justify-content:center;padding:12px 22px;border:1px solid rgba(255,255,255,.75);border-radius:12px;background:#F6E9EF;box-shadow:3px 4px 9px rgba(124,69,97,.22),-2px -2px 6px rgba(255,255,255,.8);font-family:inherit;font-size:13px;letter-spacing:.04em;color:#351D30;cursor:pointer;transition:transform .2s ease,background-color .2s ease}' +
            '.acct-out:hover{transform:scale(1.03);background:#EFD9E2}' +
            '.acct-overlay a:focus-visible,.acct-overlay button:focus-visible{outline:2px solid #7C4561;outline-offset:3px}' +
            '@media(max-width:560px){.acct-box{padding:26px 20px 22px;border-radius:26px}.acct-stats{gap:8px}}' +
            '@media(prefers-reduced-motion:reduce){.acct-overlay.open{animation:none}.acct-overlay *{transition:none!important}}';
        document.head.appendChild(st);
    }

    /* ---------- Popup ---------- */
    var overlay, lastFocus, prevOverflow = '';

    function html(a) {
        var since = memberSince(a);
        var rows = '';
        if (a.username) rows += '<div class="acct-row"><span>Username</span><span>' + esc(a.username) + '</span></div>';
        rows += '<div class="acct-row"><span>Mobile</span><span>' + (a.phone ? esc(a.phone) : 'Not added') + '</span></div>';
        if (since) rows += '<div class="acct-row"><span>Member since</span><span>' + esc(since) + '</span></div>';

        return '<button type="button" class="acct-close" data-acct="close" aria-label="Close">×</button>' +
            '<div class="acct-who"><span class="acct-avatar" aria-hidden="true">' + esc(initials(a)) + '</span>' +
            '<div><h2 class="acct-title" id="acctTitle" tabindex="-1">Hi, ' + esc(a.first) + '.</h2>' +
            '<p class="acct-email">' + esc(a.email) + '</p></div></div>' +
            '<div class="acct-stats">' +
            '<a class="acct-stat" href="cart.html"><b>' + bagCount() + '</b><span>Bag</span></a>' +
            '<a class="acct-stat" href="wishlist.html"><b>' + wishCount() + '</b><span>Wishlist</span></a>' +
            '<div class="acct-stat"><b>' + orderCount(a) + '</b><span>Orders</span></div></div>' +
            '<div class="acct-details">' + rows + '</div>' +
            '<nav class="acct-menu" aria-label="Account">' +
            '<a href="wishlist.html">Wishlist <span aria-hidden="true">→</span></a>' +
            '<a href="cart.html">Your bag <span aria-hidden="true">→</span></a></nav>' +
            '<button type="button" class="acct-out" data-acct="signout">Sign out</button>';
    }

    function build() {
        if (overlay) return;
        addStyles();
        overlay = document.createElement('div');
        overlay.className = 'acct-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<div class="acct-box" role="dialog" aria-modal="true" aria-labelledby="acctTitle"></div>';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) { close(); return; }
            var el = e.target.closest('[data-acct]');
            if (el) {
                if (el.dataset.acct === 'close') close();
                else if (el.dataset.acct === 'signout') signOut();
                return;
            }
            if (e.target.closest('a[href]')) close();
        });
    }

    function isOpen() { return !!overlay && overlay.classList.contains('open'); }

    function open() {
        var a = account();
        if (!a) { window.location.href = LOGIN_PAGE; return; }   // not signed in: go to the login page
        build();
        lastFocus = document.activeElement;
        if (!isOpen()) prevOverflow = document.body.style.overflow;
        overlay.querySelector('.acct-box').innerHTML = html(a);
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        var t = document.getElementById('acctTitle');
        if (t) t.focus();
    }

    function close() {
        if (!isOpen()) return;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = prevOverflow;
        if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
    }

    function signOut() {
        try { localStorage.removeItem('mq_session'); } catch (e) { }
        try { sessionStorage.removeItem('mq_session'); } catch (e) { }
        close();
        document.dispatchEvent(new CustomEvent('mystique:signout'));
        document.dispatchEvent(new CustomEvent('mq:authchange'));
        if (window.MQ) {
            if (window.MQ.updateProfileBtn) window.MQ.updateProfileBtn();   // icon turns back into "Sign Up"
            if (window.MQ.toast) window.MQ.toast('You’ve been signed out');
        }
    }

    document.addEventListener('keydown', function (e) {
        if (!isOpen()) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return;
        var box = overlay.querySelector('.acct-box');
        var items = Array.prototype.filter.call(
            box.querySelectorAll('a[href], button:not([disabled])'),
            function (n) { return n.offsetParent !== null; }
        );
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // signed out in another tab while the popup is open
    window.addEventListener('storage', function (e) {
        if (e.key === 'mq_session' && isOpen() && !account()) close();
    });

    window.MQAccount = { open: open, close: close, getAccount: account };
})();