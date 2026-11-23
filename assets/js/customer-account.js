
/* =========================================================
   MYSTIQUE — ACCOUNT, SETTINGS, ORDERS & PAYMENTS
   Main JavaScript
   ========================================================= */
/* =========================================================
   1. SIDEBAR VIEW SWITCHING AND PROFILE
   Include with settings.js
   ========================================================= */
(function () {
    'use strict';

    /* -----------------------------------------------------
       1.1 HELPER FUNCTIONS
      ----------------------------------------------------- */
    function $(id) {
        return document.getElementById(id);
    }
    function read() {
        try {
            return JSON.parse(localStorage.getItem('mq_profile')) || {};
        } catch (e) {
            return {};
        }
    }
    function write(v) {
        try {
            localStorage.setItem('mq_profile', JSON.stringify(v));
            return true;
        } catch (e) {
            return false;
        }
    }

    /* -----------------------------------------------------
       1.2 TOAST NOTIFICATION
       ----------------------------------------------------- */
    function say(msg) {
        if (window.MQ && MQ.toast) {
            MQ.toast(msg);
            return;
        }
        var t = document.querySelector('.toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(say.t);
        say.t = setTimeout(function () {
            t.classList.remove('show');
        }, 1800);
    }

    /* -----------------------------------------------------
       1.3 SIDEBAR VIEW SWITCHING
       Switch views by URL hash
       ----------------------------------------------------- */
    var links = Array.prototype.slice.call(
        document.querySelectorAll('.nav a')
    );
    var views = Array.prototype.slice.call(
        document.querySelectorAll('.view')
    );
    var current = 'profile';
    function show(id) {
        var v = $(id);
        if (!v || !v.classList.contains('view')) {
            return false;
        }
        views.forEach(function (x) {
            x.classList.toggle('on', x === v);
        });
        links.forEach(function (a) {
            var on = a.getAttribute('href') === '#' + id;

            a.classList.toggle('on', on);
            if (on) {
                a.setAttribute('aria-current', 'page');
            } else {
                a.removeAttribute('aria-current');
            }
        });
        current = id;
        window.scrollTo(0, 0);
        return true;
    }

    /* Hash Change Event */
    window.addEventListener('hashchange', function () {
        var id = location.hash.slice(1) || 'profile';
        if (!show(id)) {
            say('Coming soon');
            history.replaceState(null, '', '#' + current);
        }
    });

    /* Initial View */
    if (!show(location.hash.slice(1) || 'profile')) {
        show('profile');
    }

    /* -----------------------------------------------------
       1.4 PROFILE INFORMATION
       ----------------------------------------------------- */
    var DEF = {
        name: 'Karen J. Barrientos',
        email: 'karen.barrientos@example.com',
        phone: '',
        bday: '',
        prefs: 'Makeup · Skincare'
    };
    var ids = {
        name: 'p-name',
        email: 'p-email',
        phone: 'p-phone',
        bday: 'p-bday',
        prefs: 'p-prefs'
    };
    var data = Object.assign({}, DEF, read());
    var form = $('p-form');
    var btn = $('p-edit');
    var err = $('p-err');
    var editing = false;

    /* Profile Header */
    function header() {
        var parts = data.name.trim().split(/\s+/).filter(Boolean);
        $('p-first').textContent = parts[0] || 'there';
        $('p-avatar').textContent = parts.length
            ? (
                parts[0][0] +
                (parts.length > 1 ? parts[parts.length - 1][0] : '')
            ).toUpperCase()
            : '·';
    }

    /* Fill Profile Fields */
    function fill() {
        Object.keys(ids).forEach(function (k) {
            $(ids[k]).value = data[k];
        });
        header();
    }

    /* Lock and Unlock Profile Fields */
    function lock(on) {
        Object.keys(ids).forEach(function (k) {
            $(ids[k]).readOnly = on;
        });
        form.classList.toggle('editing', !on);
    }
    fill();

    /* -----------------------------------------------------
       1.5 EDIT AND SAVE PROFILE
       ----------------------------------------------------- */
    btn.addEventListener('click', function () {
        err.textContent = '';
        if (!editing) {
            editing = true;
            lock(false);
            btn.textContent = 'Save Profile';
            $('p-name').focus();
            return;
        }

        /* Get Updated Information */
        var next = {};
        Object.keys(ids).forEach(function (k) {
            next[k] = $(ids[k]).value.trim();
        });

        /* Validate Full Name */
        if (!next.name) {
            err.textContent = 'Please enter your full name.';
            $('p-name').focus();
            return;
        }

        /* Validate Email */
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next.email)) {
            err.textContent = 'Enter a valid email address.';
            $('p-email').focus();
            return;
        }

        /* Save Profile */
        data = next;
        if (!write(data)) {
            err.textContent = 'Your browser blocked saving. Try again.';
            return;
        }
        editing = false;
        lock(true);
        btn.textContent = 'Edit Profile';
        header();
        say('Profile updated');
    });

    /* -----------------------------------------------------
       1.6 COMING SOON BUTTONS
       ----------------------------------------------------- */
    document.addEventListener('click', function (e) {
        var s = e.target.closest('[data-soon]');
        if (s) {
            say(s.getAttribute('data-soon'));
        }
    });
})();
/* =========================================================
   2. SETTINGS TABS AND SAVE
   Include after your account script
   ========================================================= */
(function () {
    'use strict';

    /* -----------------------------------------------------
       2.1 SETTINGS INITIALIZATION
       ---------------------------------------------------- */
    var root = document.getElementById('settings');
    if (!root) {
        return;
    }
    var KEY = 'mq_settings';

    /* -----------------------------------------------------
       2.2 LOCAL STORAGE
       ----------------------------------------------------- */
    function read() {
        try {
            return JSON.parse(localStorage.getItem(KEY)) || {};
        } catch (e) {
            return {};
        }
    }
    function write(v) {
        try {
            localStorage.setItem(KEY, JSON.stringify(v));
            return true;
        } catch (e) {
            return false;
        }
    }

    /* -----------------------------------------------------
       2.3 TOAST NOTIFICATION
       ----------------------------------------------------- */
    function say(msg) {
        if (window.MQ && MQ.toast) {
            MQ.toast(msg);
            return;
        }
        var t = document.querySelector('.toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(say.t);
        say.t = setTimeout(function () {
            t.classList.remove('show');
        }, 1800);
    }

    /* -----------------------------------------------------
       2.4 SETTINGS TABS
       ----------------------------------------------------- */
    var tabs = Array.prototype.slice.call(
        root.querySelectorAll('.stab')
    );
    var panels = Array.prototype.slice.call(
        root.querySelectorAll('.set-panel')
    );

    /* Select Settings Tab */
    function select(tab) {
        tabs.forEach(function (t) {
            var on = t === tab;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p) {
            p.hidden = p.id !== tab.getAttribute('aria-controls');
        });
    }

    /* Tab Click and Keyboard Navigation */
    tabs.forEach(function (t, i) {
        t.addEventListener('click', function () {
            select(t);
        });

        /* Keyboard Navigation */
        t.addEventListener('keydown', function (e) {
            var d = {
                ArrowDown: 1,
                ArrowRight: 1,
                ArrowUp: -1,
                ArrowLeft: -1
            }[e.key];
            if (!d) {
                return;
            }
            e.preventDefault();
            var n = tabs[(i + d + tabs.length) % tabs.length];
            n.focus();
            select(n);
        });
    });

    /* -----------------------------------------------------
       2.5 LOAD SAVED SETTINGS
       ----------------------------------------------------- */
    var saved = read();
    Array.prototype.forEach.call(
        root.querySelectorAll('[name]'),
        function (f) {

            if (!(f.name in saved)) {
                return;
            }

            if (f.type === 'checkbox') {
                f.checked = !!saved[f.name];
            } else {
                f.value = saved[f.name];
            }
        }
    );

    /* -----------------------------------------------------
       2.6 SETTINGS VALIDATION
       ----------------------------------------------------- */
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function $(id) {
        return document.getElementById(id);
    }

    /* -----------------------------------------------------
       2.7 SAVE SETTINGS
       ----------------------------------------------------- */
    root.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-save]');
        if (!btn) {
            return;
        }
        var panel = btn.closest('.set-panel');
        var err = panel.querySelector('.set-err');
        err.textContent = '';

        /* Account Email Validation */
        if (panel.id === 'set-account') {
            var em = $('s-email').value.trim();
            if (em && !EMAIL.test(em)) {
                err.textContent = 'Enter a valid email address.';
                $('s-email').focus();
                return;
            }
        }

        /* -------------------------------------------------
           Password Validation
           ------------------------------------------------- */
        var passwordChanged = false;
        if (panel.id === 'set-security') {
            var cur = $('s-cur-pw').value;
            var p1 = $('s-new-pw').value;
            var p2 = $('s-new-pw2').value;
            if (cur || p1 || p2) {
                /* Current Password */
                if (!cur) {
                    err.textContent = 'Enter your current password.';
                    $('s-cur-pw').focus();
                    return;
                }

                /* New Password Requirements */
                if (
                    p1.length < 8 ||
                    !/[a-z]/.test(p1) ||
                    !/[A-Z]/.test(p1) ||
                    !/\d/.test(p1)
                ) {
                    err.textContent =
                        'New password needs 8+ characters with uppercase, lowercase and a number.';
                    $('s-new-pw').focus();
                    return;
                }

                /* Confirm Password */
                if (p1 !== p2) {
                    err.textContent = 'Passwords do not match.';
                    $('s-new-pw2').focus();
                    return;
                }

                passwordChanged = true;
                // Demo only: nothing is sent anywhere
            }
        }

        /* -------------------------------------------------
           Collect and Save Settings
           ------------------------------------------------- */
        var data = read();
        Array.prototype.forEach.call(
            panel.querySelectorAll('[name]'),
            function (f) {
                data[f.name] = f.type === 'checkbox'
                    ? f.checked
                    : f.value;
            }
        );

        /* Check Saving Result */
        if (!write(data)) {
            err.textContent = 'Your browser blocked saving. Try again.';
            return;
        }

        /* Clear Password Fields After Saving */
        if (passwordChanged) {
            Array.prototype.forEach.call(
                panel.querySelectorAll('input[type=password]'),
                function (i) {
                    i.value = '';
                }
            );
            say('Password updated');
        } else {
            say('Changes saved');
        }
    });
})();

/* =========================================================
   3. ORDERS AND PAYMENTS
   Recent Orders, Payment Details and Tracking
   ========================================================= */
(function () {
    'use strict';

    /* -----------------------------------------------------
       3.1 ORDERS INITIALIZATION
       ----------------------------------------------------- */
    var root = document.getElementById('orders');
    if (!root) {
        return;
    }

    /* -----------------------------------------------------
       3.2 ORDER STATUS INFORMATION
       ----------------------------------------------------- */
    var STAGES = [
        'Order placed',
        'Payment verified',
        'Preparing',
        'Shipped',
        'Delivered'
    ];

    var SHORT = [
        'Placed',
        'Paid',
        'Prepared',
        'Shipped',
        'Delivered'
    ];

    /* -----------------------------------------------------
       3.3 ORDER DATA
       ----------------------------------------------------- */
    var ORDERS = [
        {
            id: 'MC-2026-1089',
            items: '3 beauty essentials · Midnight Mauve',
            summary: '3 beauty essentials',
            total: 2850,
            status: 'Payment review',
            stage: 0,
            method: 'GCash',
            pay: 'Awaiting verification',
            receipt: 'Submitted · awaiting review',
            tracking: 'Not assigned yet',
            note: 'We will show carrier tracking after payment verification and dispatch.'
        },
        {
            id: 'MS-10441',
            items: 'Second Skin Tint',
            summary: 'Second Skin Tint',
            total: 890,
            status: 'Delivered',
            stage: 4,
            method: 'Maya',
            pay: 'Paid',
            receipt: 'Verified',
            tracking: 'Demo tracking 10441',
            note: 'Delivered. Thank you for choosing Mystique.'
        },
        {
            id: 'MS-10422',
            items: 'Everyday Mini Bag',
            summary: 'Everyday Mini Bag',
            total: 1490,
            status: 'Processing',
            stage: 2,
            method: 'Credit / Debit Card',
            pay: 'Paid',
            receipt: 'Verified',
            tracking: 'Not assigned yet',
            note: 'Your order is being prepared. Tracking appears once it ships.'
        }
    ];

    /* -----------------------------------------------------
       3.4 HELPER FUNCTIONS
       ----------------------------------------------------- */
    function $(id) {
        return document.getElementById(id);
    }

    /* Philippine Peso Formatting */
    function peso(n) {
        return '₱' + n.toLocaleString('en-PH');
    }

    function pesoD(n) {
        return '₱' + n.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /* -----------------------------------------------------
       3.5 RECENT ORDERS LIST
       ----------------------------------------------------- */
    var rows = $('o-rows');
    var buttons = ORDERS.map(function (o, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'orow';
        b.setAttribute('aria-pressed', 'false');

        /* Order Information */
        [
            ['#' + o.id],
            [o.items],
            [peso(o.total)],
            [o.status]
        ].forEach(function (c) {
            var s = document.createElement('span');
            s.textContent = c[0];
            b.appendChild(s);
        });

        /* Order Selection */
        b.addEventListener('click', function () {
            select(i);
        });
        rows.appendChild(b);
        return b;
    });

    /* -----------------------------------------------------
       3.6 SELECT ORDER
       ----------------------------------------------------- */
    function select(i) {
        var o = ORDERS[i];

        /* Highlight Selected Order */
        buttons.forEach(function (b, n) {
            b.setAttribute('aria-pressed', String(n === i));
        });

        /* Payment Information */
        $('o-pay-order').textContent = 'Order #' + o.id;
        $('o-method').textContent = o.method;
        $('o-status').textContent = o.pay;
        $('o-receipt').textContent = o.receipt;

        /* Tracking Information */
        $('o-track-sum').textContent =
            'Order #' + o.id + ' · ' + o.summary + ' · ' + pesoD(o.total);
        $('o-stage').textContent = STAGES[o.stage];
        $('o-tracking').textContent = o.tracking;
        $('o-note').textContent = o.note;

        /* -------------------------------------------------
           3.7 ORDER TRACKING PROGRESS
           ------------------------------------------------- */
        var ol = $('o-steps');
        ol.style.setProperty(
            '--p',
            o.stage / (STAGES.length - 1)
        );
        ol.innerHTML = '';

        /* Generate Tracking Steps */
        SHORT.forEach(function (label, n) {
            var li = document.createElement('li');

            /* Completed Step */
            if (n < o.stage) {
                li.className = 'done';
            }

            /* Current Step */
            if (n === o.stage) {
                li.className = 'now';
                li.setAttribute('aria-current', 'step');
            }

            /* Step Content */
            li.innerHTML = '<i></i><span></span>';
            li.lastChild.textContent = label;
            ol.appendChild(li);

        });

    }


    /* -----------------------------------------------------
       3.8 INITIAL ORDER SELECTION
       ----------------------------------------------------- */

    select(0);

})();
