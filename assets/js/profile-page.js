/* =========================================================
   MYSTIQUE — profile settings page (load after profile.js and general.js)
   Sections (the #hash in the address bar picks one):
       #details  #addresses  #password  #preferences  #orders
   ========================================================= */
(function () {
    'use strict';

    var P = window.MQProfile;
    var root = document.getElementById('pfPage');
    if (!P || !root) { if (!P) console.error('profile-page.js needs profile.js to load first.'); return; }

    var esc = P.esc, V = P.valid;
    var MAX_ADDRESSES = 5;
    var SECTIONS = [
        ['details', 'Personal details'],
        ['addresses', 'Delivery addresses'],
        ['password', 'Password'],
        ['preferences', 'Preferences'],
        ['orders', 'Orders']
    ];

    // what is open inside a section (cleared when you change section)
    var ui = { addr: null, confirmDel: null, showDelete: false };

    function current() {
        var h = location.hash.replace('#', '');
        return SECTIONS.some(function (s) { return s[0] === h; }) ? h : 'details';
    }

    function today() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    /* ---------- Sections ---------- */
    function detailsHtml(u) {
        return '<h2 class="pf-h2" id="pfHeading" tabindex="-1">Personal details</h2>' +
            '<p class="pf-note">The basics we use for your orders and delivery.</p>' +
            '<form id="pfDetails" novalidate><p class="pf-form-error" role="alert"></p>' +
            '<div class="pf-grid2">' +
            P.fieldHtml({ id: 'pf-p-name', label: 'Full name', autocomplete: 'name', value: u.name }) +
            P.fieldHtml({ id: 'pf-p-email', label: 'Email address', type: 'email', autocomplete: 'email', value: u.email }) +
            '</div><div class="pf-grid2">' +
            P.fieldHtml({ id: 'pf-p-phone', label: 'Mobile number', type: 'tel', autocomplete: 'tel', optional: true, value: u.phone, placeholder: '09XX XXX XXXX' }) +
            P.fieldHtml({ id: 'pf-p-birthday', label: 'Birthday', type: 'date', autocomplete: 'bday', optional: true, value: u.birthday, max: today() }) +
            '</div><div class="pf-form-actions"><button type="submit" class="pf-btn pf-btn-primary">Save changes</button></div></form>' +
            '<div class="pf-divider"></div>' +
            '<h3 class="pf-h3">Close your account</h3>' +
            '<p class="pf-note" style="margin:6px 0 16px">This removes your profile, saved addresses and preferences from this browser. Your bag and wishlist are not affected.</p>' +
            (ui.showDelete
                ? '<form id="pfDelete" novalidate><p class="pf-form-error" role="alert"></p>' +
                  P.fieldHtml({ id: 'pf-d-pw', label: 'Enter your password to confirm', type: 'password', autocomplete: 'current-password', pw: true }) +
                  '<div class="pf-form-actions"><button type="submit" class="pf-btn pf-btn-ghost pf-btn-danger">Yes, delete my account</button>' +
                  '<button type="button" class="pf-btn pf-btn-ghost" data-pa="delete-cancel">Keep my account</button></div></form>'
                : '<button type="button" class="pf-btn pf-btn-ghost pf-btn-danger" data-pa="delete-open">Delete my account</button>');
    }

    function addressFormHtml(u) {
        var isNew = ui.addr === 'new';
        var a = isNew ? {} : (u.addresses || []).filter(function (x) { return x.id === ui.addr; })[0] || {};
        var first = !(u.addresses || []).length;
        return '<form id="pfAddress" class="pf-form-card" novalidate data-id="' + esc(isNew ? '' : ui.addr) + '">' +
            '<h3 class="pf-h3">' + (isNew ? 'Add a new address' : 'Edit address') + '</h3>' +
            '<p class="pf-form-error" role="alert"></p>' +
            '<div class="pf-grid2">' +
            P.fieldHtml({ id: 'pf-a-label', label: 'Label', tag: 'select', options: ['Home', 'Work', 'Other'], value: a.label || 'Home' }) +
            P.fieldHtml({ id: 'pf-a-name', label: 'Recipient name', autocomplete: 'name', value: a.name || u.name }) +
            '</div>' +
            P.fieldHtml({ id: 'pf-a-phone', label: 'Contact number', type: 'tel', autocomplete: 'tel', value: a.phone || u.phone, placeholder: '09XX XXX XXXX' }) +
            P.fieldHtml({ id: 'pf-a-street', label: 'Street address', autocomplete: 'address-line1', value: a.street, placeholder: 'House no., street, barangay' }) +
            '<div class="pf-grid2">' +
            P.fieldHtml({ id: 'pf-a-city', label: 'City', autocomplete: 'address-level2', value: a.city }) +
            P.fieldHtml({ id: 'pf-a-province', label: 'Province', autocomplete: 'address-level1', value: a.province }) +
            '</div><div class="pf-grid2">' +
            P.fieldHtml({ id: 'pf-a-zip', label: 'Zip code', autocomplete: 'postal-code', value: a.zip, inputmode: 'numeric', maxlength: 4 }) +
            '</div>' +
            P.fieldHtml({ id: 'pf-a-notes', label: 'Delivery instructions', tag: 'textarea', optional: true, value: a.notes }) +
            (first
                ? ''
                : '<label class="pf-check"><input type="checkbox" id="pf-a-default"' + (a.isDefault ? ' checked' : '') + '><span>Make this my default address</span></label>') +
            '<div class="pf-form-actions"><button type="submit" class="pf-btn pf-btn-primary">Save address</button>' +
            '<button type="button" class="pf-btn pf-btn-ghost" data-pa="addr-cancel">Cancel</button></div></form>';
    }

    function addressesHtml(u) {
        var list = u.addresses || [];
        var cards = list.map(function (a) {
            return '<article class="pf-addr"><div class="pf-addr-head"><h3 class="pf-h3">' + esc(a.label) + '</h3>' +
                (a.isDefault ? '<span class="pf-badge">Default</span>' : '') + '</div>' +
                '<p>' + esc(a.name) + '</p><p class="pf-muted">' + esc(a.phone) + '</p>' +
                '<p>' + esc(P.addressLine(a)) + '</p>' +
                (a.notes ? '<p class="pf-muted">' + esc(a.notes) + '</p>' : '') +
                (ui.confirmDel === a.id
                    ? '<div class="pf-confirm"><span>Delete this address?</span><div class="pf-form-actions">' +
                      '<button type="button" class="pf-btn pf-btn-ghost pf-btn-sm pf-btn-danger" data-pa="addr-del-yes" data-id="' + esc(a.id) + '">Yes, delete</button>' +
                      '<button type="button" class="pf-btn pf-btn-ghost pf-btn-sm" data-pa="addr-del-no">Cancel</button></div></div>'
                    : '<div class="pf-addr-actions">' +
                      '<button type="button" class="pf-link" data-pa="addr-edit" data-id="' + esc(a.id) + '">Edit</button>' +
                      '<button type="button" class="pf-link" data-pa="addr-del" data-id="' + esc(a.id) + '">Delete</button>' +
                      (a.isDefault ? '' : '<button type="button" class="pf-link" data-pa="addr-default" data-id="' + esc(a.id) + '">Set as default</button>') +
                      '</div>') +
                '</article>';
        }).join('');

        return '<h2 class="pf-h2" id="pfHeading" tabindex="-1">Delivery addresses</h2>' +
            '<p class="pf-note">Save up to ' + MAX_ADDRESSES + ' places. Your default fills in at checkout.</p>' +
            (list.length ? '<div class="pf-addr-grid">' + cards + '</div>' : (ui.addr ? '' : '<p class="pf-empty">No addresses saved yet.</p>')) +
            (ui.addr
                ? addressFormHtml(u)
                : (list.length < MAX_ADDRESSES
                    ? '<button type="button" class="pf-btn pf-btn-primary" data-pa="addr-new">+ Add an address</button>'
                    : '<p class="pf-note">You’ve reached the limit of ' + MAX_ADDRESSES + ' addresses. Delete one to add another.</p>'));
    }

    function passwordHtml() {
        return '<h2 class="pf-h2" id="pfHeading" tabindex="-1">Password</h2>' +
            '<p class="pf-note">Choose something only you would know.</p>' +
            '<form id="pfPassword" novalidate style="max-width:420px"><p class="pf-form-error" role="alert"></p>' +
            P.fieldHtml({ id: 'pf-w-current', label: 'Current password', type: 'password', autocomplete: 'current-password', pw: true }) +
            P.fieldHtml({ id: 'pf-w-new', label: 'New password', type: 'password', autocomplete: 'new-password', pw: true, hint: P.PW_HINT }) +
            P.fieldHtml({ id: 'pf-w-confirm', label: 'Confirm new password', type: 'password', autocomplete: 'new-password', pw: true }) +
            '<div class="pf-form-actions"><button type="submit" class="pf-btn pf-btn-primary">Update password</button></div></form>';
    }

    function preferencesHtml(u) {
        var p = u.prefs || {};
        function check(id, label, note, on) {
            return '<label class="pf-check"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span>' + label + '<small>' + note + '</small></span></label>';
        }
        var pay = Object.keys(P.PAYMENTS).map(function (k) {
            return '<label class="pf-radio"><input type="radio" name="pf-payment" value="' + k + '"' + (p.payment === k ? ' checked' : '') + '><span>' + esc(P.PAYMENTS[k]) + '</span></label>';
        }).join('');

        return '<h2 class="pf-h2" id="pfHeading" tabindex="-1">Preferences</h2>' +
            '<p class="pf-note">Make shopping feel a little more like yours.</p>' +
            '<form id="pfPrefs" novalidate><p class="pf-form-error" role="alert"></p>' +
            '<h3 class="pf-h3" style="margin-bottom:14px">Stay in the loop</h3>' +
            check('pf-n-orders', 'Order updates', 'Confirmations and delivery news.', p.orders !== false) +
            check('pf-n-arrivals', 'New arrivals', 'Be the first to see what’s new.', !!p.arrivals) +
            check('pf-n-offers', 'Offers and promo codes', 'A little something now and then.', !!p.offers) +
            '<div class="pf-divider" style="margin:26px 0"></div>' +
            '<h3 class="pf-h3" style="margin-bottom:14px">At checkout</h3>' +
            check('pf-n-prefill', 'Fill in my details for me', 'Uses your default address and contact details.', p.prefill !== false) +
            '<p class="pf-hint" style="margin:0 0 12px">Preferred payment method</p>' +
            '<label class="pf-radio"><input type="radio" name="pf-payment" value=""' + (!p.payment ? ' checked' : '') + '><span>No preference</span></label>' + pay +
            '<div class="pf-form-actions"><button type="submit" class="pf-btn pf-btn-primary">Save preferences</button></div></form>';
    }

    function ordersHtml(u) {
        var orders = P.userOrders(u);
        var head = '<h2 class="pf-h2" id="pfHeading" tabindex="-1">Orders</h2><p class="pf-note">Orders placed with ' + esc(u.email) + ' on this device.</p>';
        if (!orders.length) {
            return head + '<p class="pf-empty">No orders yet. <a href="shop.html">Find your little luxuries</a></p>';
        }
        return head + '<div class="pf-orders">' + orders.map(function (o) {
            var st = P.orderStatus(o);
            var d = new Date(o.placedAt);
            var date = isNaN(d) ? '' : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
            var items = (o.items || []).map(function (i) {
                return '<div class="pf-row"><span>' + esc(i.qty) + ' × ' + esc(i.name) + ' (' + esc(i.variation) + ')</span><span>' + P.pesoD(i.price * i.qty) + '</span></div>';
            }).join('');
            return '<details class="pf-order"><summary>' +
                '<span class="pf-order-num">' + esc(o.number) + '</span><span class="pf-order-total">' + P.pesoD(o.total) + '</span>' +
                '<span class="pf-order-date">' + esc(date) + '</span><span class="pf-status' + (st[1] ? ' ok' : '') + '">' + st[0] + '</span></summary>' +
                '<div class="pf-order-body">' + items +
                '<div class="pf-row"><span>Shipping fee</span><span>' + P.pesoD(o.shippingFee) + '</span></div>' +
                (o.discount ? '<div class="pf-row"><span>Promo ' + esc(o.promo) + '</span><span>−' + P.pesoD(o.discount) + '</span></div>' : '') +
                '<div class="pf-row total"><span>Total</span><span>' + P.pesoD(o.total) + '</span></div>' +
                '<div class="pf-row"><span>Payment</span><span>' + esc((P.PAYMENTS[o.payment && o.payment.method]) || '') + '</span></div>' +
                '<div class="pf-row"><span>Delivered to</span><span>' + esc(o.customer.address) + '</span></div>' +
                '<button type="button" class="pf-btn pf-btn-ghost pf-btn-sm" data-pa="reorder" data-num="' + esc(o.number) + '">Order again</button>' +
                '</div></details>';
        }).join('') + '</div>';
    }

    /* ---------- Page ---------- */
    function gateHtml() {
        return '<div class="pf-card pf-gate"><p class="pf-eyebrow">Your Account</p>' +
            '<h2 class="pf-h2" id="pfHeading">Sign in to see your details.</h2>' +
            '<p class="pf-note">Manage your details, delivery addresses and past orders in one place.</p>' +
            '<button type="button" class="pf-btn pf-btn-primary" data-pf="open">Sign in or create an account</button></div>';
    }

    function render(focusHeading) {
        var u = P.getUser();
        if (!u) { root.innerHTML = gateHtml(); return; }
        var s = current();
        var orderCount = P.userOrders(u).length;

        var nav = SECTIONS.map(function (x) {
            return '<a href="#' + x[0] + '"' + (x[0] === s ? ' class="active" aria-current="page"' : '') + '>' + x[1] +
                (x[0] === 'orders' && orderCount ? '<span class="pf-count">' + orderCount + '</span>' : '') +
                (x[0] === 'addresses' && (u.addresses || []).length ? '<span class="pf-count">' + u.addresses.length + '</span>' : '') + '</a>';
        }).join('');

        var content = s === 'details' ? detailsHtml(u)
            : s === 'addresses' ? addressesHtml(u)
            : s === 'password' ? passwordHtml()
            : s === 'preferences' ? preferencesHtml(u)
            : ordersHtml(u);

        root.innerHTML = '<div class="pf-layout"><aside class="pf-side">' +
            '<div class="pf-who"><span class="pf-avatar" aria-hidden="true">' + esc(P.initials(u)) + '</span><div><strong>' + esc(u.name) + '</strong><small>' + esc(u.email) + '</small></div></div>' +
            '<nav class="pf-nav" aria-label="Account sections">' + nav + '</nav>' +
            '<div class="pf-side-links"><a href="wishlist.html">Wishlist <span>' + P.wishCount() + '</span></a><a href="cart.html">Your bag <span>' + P.bagCount() + '</span></a></div>' +
            '<button type="button" class="pf-btn pf-btn-ghost pf-btn-block" data-pf="signout">Sign out</button></aside>' +
            '<section class="pf-card" aria-labelledby="pfHeading">' + content + '</section></div>';

        if (focusHeading) { var h = document.getElementById('pfHeading'); if (h) h.focus({ preventScroll: true }); }
    }

    function resetUi() { ui.addr = null; ui.confirmDel = null; ui.showDelete = false; }

    /* ---------- Saving ---------- */
    function result(form, res, fieldMap, okMsg) {
        if (!res.ok) {
            var input = res.field && fieldMap && fieldMap[res.field];
            if (input) { P.setErr(input, res.error); input.focus(); }
            else if (form === root) P.toast(res.error);
            else P.formError(form, res.error);
            return false;
        }
        if (okMsg) P.toast(okMsg);
        return true;
    }

    function saveDetails(form) {
        P.clearErrors(form);
        var f = { name: form.querySelector('#pf-p-name'), email: form.querySelector('#pf-p-email'), phone: form.querySelector('#pf-p-phone'), birthday: form.querySelector('#pf-p-birthday') };
        var bad = null;
        function check(input, ok, msg) { if (!ok) { P.setErr(input, msg); bad = bad || input; } }
        check(f.name, V.name(f.name.value), 'Please enter your full name.');
        check(f.email, V.email(f.email.value), 'Enter a valid email address.');
        check(f.phone, !f.phone.value.trim() || V.phone(f.phone.value), 'Enter a valid mobile number (at least 10 digits).');
        check(f.birthday, !f.birthday.value || f.birthday.value <= today(), 'Birthday can’t be in the future.');
        if (bad) { bad.focus(); return; }

        var res = P.updateUser({ name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), birthday: f.birthday.value });
        if (result(form, res, f, 'Details saved')) render();
    }

    function saveAddress(form) {
        P.clearErrors(form);
        var g = function (id) { return form.querySelector('#pf-a-' + id); };
        var bad = null;
        function check(input, ok, msg) { if (!ok) { P.setErr(input, msg); bad = bad || input; } }
        check(g('name'), V.name(g('name').value), 'Please enter the recipient’s name.');
        check(g('phone'), V.phone(g('phone').value), 'Enter a valid contact number (at least 10 digits).');
        check(g('street'), g('street').value.trim().length > 4, 'Please enter your street address.');
        check(g('city'), g('city').value.trim() !== '', 'Please enter your city.');
        check(g('province'), g('province').value.trim() !== '', 'Please enter your province.');
        check(g('zip'), V.zip(g('zip').value), 'Enter a 4-digit zip code.');
        if (bad) { bad.focus(); return; }

        var u = P.getUser();
        var list = (u.addresses || []).slice();
        var id = form.dataset.id;
        var makeDefault = !list.length || !!(form.querySelector('#pf-a-default') && form.querySelector('#pf-a-default').checked);
        var entry = {
            id: id || 'a' + Date.now().toString(36),
            label: g('label').value, name: g('name').value.trim(), phone: g('phone').value.trim(),
            street: g('street').value.trim(), city: g('city').value.trim(), province: g('province').value.trim(),
            zip: g('zip').value.trim(), notes: g('notes').value.trim(), isDefault: false
        };

        if (id) {
            var i = list.map(function (x) { return x.id; }).indexOf(id);
            if (i < 0) { P.formError(form, 'That address no longer exists.'); return; }
            entry.isDefault = makeDefault || list[i].isDefault;
            list[i] = entry;
        } else {
            if (list.length >= MAX_ADDRESSES) { P.formError(form, 'You can save up to ' + MAX_ADDRESSES + ' addresses.'); return; }
            entry.isDefault = makeDefault;
            list.push(entry);
        }
        if (entry.isDefault) list.forEach(function (x) { x.isDefault = x.id === entry.id; });

        var res = P.updateUser({ addresses: list });
        if (result(form, res, null, 'Address saved')) { ui.addr = null; render(); }
    }

    function savePassword(form) {
        P.clearErrors(form);
        var f = { current: form.querySelector('#pf-w-current'), next: form.querySelector('#pf-w-new'), confirm: form.querySelector('#pf-w-confirm') };
        var bad = null;
        function check(input, ok, msg) { if (!ok) { P.setErr(input, msg); bad = bad || input; } }
        check(f.current, !!f.current.value, 'Enter your current password.');
        check(f.next, V.password(f.next.value), P.PW_HINT);
        if (!bad) check(f.next, f.next.value !== f.current.value, 'Choose a password you haven’t used here.');
        check(f.confirm, f.next.value === f.confirm.value, 'The passwords don’t match.');
        if (bad) { bad.focus(); return; }

        var btn = form.querySelector('button[type=submit]');
        P.busy(btn, true, 'Updating…');
        P.changePassword(f.current.value, f.next.value).then(function (res) {
            P.busy(btn, false);
            if (result(form, res, { current: f.current }, 'Password updated')) form.reset();
        });
    }

    function savePrefs(form) {
        var on = function (id) { return form.querySelector(id).checked; };
        var pay = form.querySelector('input[name="pf-payment"]:checked');
        var res = P.updateUser({
            prefs: {
                orders: on('#pf-n-orders'), arrivals: on('#pf-n-arrivals'), offers: on('#pf-n-offers'),
                prefill: on('#pf-n-prefill'), payment: pay ? pay.value : ''
            }
        });
        result(form, res, null, 'Preferences saved');
    }

    function removeAccount(form) {
        P.clearErrors(form);
        var pw = form.querySelector('#pf-d-pw');
        if (!pw.value) { P.setErr(pw, 'Enter your password to confirm.'); pw.focus(); return; }
        var btn = form.querySelector('button[type=submit]');
        P.busy(btn, true, 'Deleting…');
        P.deleteAccount(pw.value).then(function (res) {
            P.busy(btn, false);
            if (result(form, res, { password: pw }, 'Your account has been deleted')) { resetUi(); render(); }
        });
    }

    /* ---------- Events ---------- */
    root.addEventListener('submit', function (e) {
        var form = e.target;
        var map = { pfDetails: saveDetails, pfAddress: saveAddress, pfPassword: savePassword, pfPrefs: savePrefs, pfDelete: removeAccount };
        if (!map[form.id]) return;
        e.preventDefault();
        map[form.id](form);
    });

    root.addEventListener('click', function (e) {
        var el = e.target.closest('[data-pa]');
        if (!el) return;
        var a = el.dataset.pa, id = el.dataset.id, u = P.getUser();
        if (!u) return;

        if (a === 'addr-new') { ui.addr = 'new'; ui.confirmDel = null; render(); focusFirst('#pf-a-name'); }
        else if (a === 'addr-edit') { ui.addr = id; ui.confirmDel = null; render(); focusFirst('#pf-a-name'); }
        else if (a === 'addr-cancel') { ui.addr = null; render(); }
        else if (a === 'addr-del') { ui.confirmDel = id; render(); }
        else if (a === 'addr-del-no') { ui.confirmDel = null; render(); }
        else if (a === 'addr-del-yes') {
            var list = (u.addresses || []).filter(function (x) { return x.id !== id; });
            if (list.length && !list.some(function (x) { return x.isDefault; })) list[0].isDefault = true;
            ui.confirmDel = null;
            if (result(root, P.updateUser({ addresses: list }), null, 'Address deleted')) render();
        } else if (a === 'addr-default') {
            var next = (u.addresses || []).map(function (x) { x.isDefault = x.id === id; return x; });
            if (result(root, P.updateUser({ addresses: next }), null, 'Default address updated')) render();
        } else if (a === 'delete-open') { ui.showDelete = true; render(); focusFirst('#pf-d-pw'); }
        else if (a === 'delete-cancel') { ui.showDelete = false; render(); }
        else if (a === 'reorder') {
            var o = P.userOrders(u).filter(function (x) { return x.number === el.dataset.num; })[0];
            if (o) P.reorder(o);
        }
    });

    function focusFirst(sel) { var n = document.querySelector(sel); if (n) n.focus(); }

    window.addEventListener('hashchange', function () { resetUi(); render(true); window.scrollTo(0, 0); });
    document.addEventListener('mq:authchange', function () { resetUi(); render(); });

    render();
})();