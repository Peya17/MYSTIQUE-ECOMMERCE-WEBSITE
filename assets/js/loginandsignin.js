(function () {
    var $ = function (s, r) {
        return (r || document).querySelector(s);
    };

    var $$ = function (s, r) {
        return Array.prototype.slice.call(
            (r || document).querySelectorAll(s)
        );
    };


    //reset
    function reset(d) {

        $$('.view', d).forEach(function (v) {
            v.hidden = v.dataset.view !== 'main';
        });

        $$('form', d).forEach(function (f) {
            f.reset();
        });

        $$('.bad', d).forEach(function (b) {
            b.classList.remove('bad');
        });

        $$('.rules li', d).forEach(function (l) {
            l.classList.remove('ok');
        });

        $$('.meter span', d).forEach(function (s) {
            s.style.background = '';
        });
        var sl = $('#strength-label', d);
        if (sl) {
            sl.textContent = 'Enter a password';
        }
        $$('.eye', d).forEach(function (b) { //chooses all elements matched with eye
            var input = document.getElementById(b.dataset.eye);
            if (input) {
                input.type = 'password';
            }
            b.textContent = b.classList.contains('password-input')
                ? 'Show Password'
                : 'Show';
        });
    }


    //open dialog
    function openD(id) { //finds dialog using id
        var d = document.getElementById(id);
        if (!d) { //checks if it exists
            return;
        }
        reset(d); //resets to og state
        if (!d.open) {
            d.showModal(); //opens dialog
        }
        d.scrollTop = 0;
        var fc = $('.first-column', d);
        if (fc) {
            fc.scrollTop = 0;
        }
    }

    //open btn
    $$('[data-open]').forEach(function (b) {
        b.addEventListener('click', function () {
            openD(b.dataset.open);
        });
    });

    //switch
    $$('[data-swap]').forEach(function (b) {
        b.addEventListener('click', function () {
            var current = b.closest('dialog');
            current.close();
            openD(b.dataset.swap);
        });
    });

    //close btn and continue btn: go back to sign in
    $$('[data-close]').forEach(function (b) {
        b.addEventListener('click', function () {
            var current = b.closest('dialog');
            if (current) {
                current.close();
            }
            openD('dlg-signin');
        });
    });

    //prevent close with Esc
    $$('dialog').forEach(function (d) {
        d.addEventListener('cancel', function (e) {
            e.preventDefault();
        });
    });

    //show pass
    $$('.eye').forEach(function (b) {
        b.addEventListener('click', function () {
            var i = document.getElementById(b.dataset.eye);
            if (!i) {
                return;
            }
            var h = i.type === 'password';
            i.type = h ? 'text' : 'password';
            b.textContent = h
                ? (b.classList.contains('password-input') ? 'Hide Password' : 'Hide')
                : (b.classList.contains('password-input') ? 'Show Password' : 'Show');

            b.setAttribute(
                'aria-label',
                h ? 'Hide password' : 'Show password'
            );
        });
    });

    //initial dialog
    openD(
        location.hash === '#signup'
            ? 'dlg-signup'
            : location.hash === '#forgot'
                ? 'dlg-forgot'
                : 'dlg-signin'
    );

    //email valid
    var emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    //pass rules
    function rules(p) {
        return {
            len: p.length >= 8,
            case: /[a-z]/.test(p) && /[A-Z]/.test(p),
            num: /\d/.test(p),
            sym: /[^A-Za-z0-9]/.test(p)
        };
    }

    //signup pass strength meter
    var pass = $('#su-pass'); //choose first matching elemnt
    if (pass) {
        pass.addEventListener('input', function () {
            var r = rules(pass.value);
            var n = 0;
            $$('.rules li').forEach(function (li) {

                var ok = r[li.dataset.r];

                li.classList.toggle('ok', ok);

                if (ok) {
                    n++;
                }
            });
            var cols = [
                '',
                '#B5505C',
                '#D39A52',
                '#7FAE8C',
                '#4F7A5E'
            ];
            var names = [
                'Enter a password',
                'Weak',
                'Fair',
                'Good',
                'Strong'
            ];
            $$('.meter span').forEach(function (s, i) {
                s.style.background = i < n ? cols[n] : '';
            });
            $('#strength-label').textContent = names[n];
            if (pass.closest('.field').classList.contains('bad')) {
                flag(pass, n < 4);
            }
        });
    }

    //input error flag
    function flag(el, bad) { //flags if the input is error or nah
        var f = el.closest('.field');
        if (!f) {
            return;
        }
        f.classList.toggle('bad', bad);
        el.setAttribute('aria-invalid', bad);
    }
    $$('input').forEach(function (i) {
        i.addEventListener('input', function () {
            var f = i.closest('.field');
            if (f && f.classList.contains('bad') && i !== pass) {
                flag(i, false);
            }
        });
    });

    //form valid
    $$('form').forEach(function (f) {
        f.addEventListener('submit', function (e) {
            e.preventDefault();
            var k = f.dataset.form;
            var bad = false;
            var first = null;
            var d = f.closest('dialog');

            //check input
            function chk(el, ok) {
                if (!el) {
                    return;
                }
                flag(el, !ok);
                if (!ok) {
                    bad = true;
                    first = first || el;
                }
            }

            //sign in
            if (k === 'signin') {
                chk(
                    $('#si-email', f),
                    emailRx.test($('#si-email', f).value.trim())
                );
                chk(
                    $('#si-pass', f),
                    $('#si-pass', f).value.length > 0
                );
            }

            //forgot pass
            if (k === 'forgot') {
                chk(
                    $('#fp-email', f),
                    emailRx.test($('#fp-email', f).value.trim())
                );
            }

            //signup
            if (k === 'signup') {
                chk(
                    $('#su-first', f),
                    $('#su-first', f).value.trim() !== ''
                );
                chk(
                    $('#su-last', f),
                    $('#su-last', f).value.trim() !== ''
                );
                chk(
                    $('#su-email', f),
                    emailRx.test($('#su-email', f).value.trim())
                );

                var r = rules(pass.value);
                chk(
                    pass,
                    r.len && r.case && r.num && r.sym
                );
                chk(
                    $('#su-confirm', f),
                    $('#su-confirm', f).value === pass.value &&
                    pass.value !== ''
                );
                chk(
                    $('#su-terms', f),
                    $('#su-terms', f).checked
                );
            }

            //stops at invalid submit
            if (bad) {
                first.focus();
                return;
            }

            //loading spinner
            var b = $('button[type=submit]', f);
            var t = b.textContent;
            b.disabled = true;
            b.innerHTML = '<span class="spin"></span>';
            setTimeout(function () {
                b.disabled = false;
                b.textContent = t;
                $$('.view', d).forEach(function (v) {
                    v.hidden = v.dataset.view !== 'done';
                });
                var h = $('[data-view=done] h2', d);
                h.focus();
                var fc = $('.first-column', d);
                if (fc) {
                    fc.scrollTop = 0;
                }
            }, 900);
        });
    });

    //continue btn on the sign in success screen
    $$('.continue:not([data-close])').forEach(function (b) {
        b.addEventListener('click', function () {
            var d = b.closest('dialog');
            if (d) {
                d.close();
            }
            openD('dlg-signin');
        });
    });
})();

//auth features
(function () {
    'use strict';


    var CFG = {
        sessionDays: 2,      //2 days maximum of sign in
        maxAttempts: 5,      //max attempt of wrong pass before locking
        lockSeconds: 60,     //1 min to wait
        codeLength: 6,
        codeTtlMin: 10,      //expiration code
        maxCodeTries: 5,     //max atremp of code before voiding
        resendSeconds: 30,   //cool down of resend code
        demoInbox: true,     //demo email code pop up
        redirectUrl: 'Main page.html',     //redirect after sign in
        sendEmail: null      //send code to email (not yet completed)
    };

    //utility functions
    var $ = function (s, r) { 
        return (r || document).querySelector(s); 
    };

    var $$ = function (s, r) { 
        return Array.prototype.slice.call((r || document).querySelectorAll(s)); 
    };

    var EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; //email validation requirements
    var USER_RX = /^[a-z0-9._]{3,20}$/i; //username validation requirements
    var RESERVED = ['admin', 'administrator', 'mystique', 'support', 'root', 'staff'];
    var COLS = ['', '#B5505C', '#D39A52', '#7FAE8C', '#4F7A5E']; //pass color
    var NAMES = ['Enter a password', 'Weak', 'Fair', 'Good', 'Strong']; //pass indicator 
    var popupMode = document.body.dataset.mode === 'popup';

    var store = {
        get: function (k, area) { 
            try { 
                return JSON.parse((area || localStorage).getItem(k)); 
            } catch (e) { 
                return null; 
            } 
        },
        set: function (k, v, area) { 
            try { 
                (area || localStorage).setItem(k, JSON.stringify(v)); return true; 
            } catch (e) { 
                return false; 
            } 
        },
        del: function (k, area) { 
            try { 
                (area || localStorage).removeItem(k); 
            } catch (e) { 
            } 
        }
    };

    function wait(ms) { 
        return new Promise(function (r) { 
            setTimeout(r, ms); 
        }); 
    }
    function fmt(s) { 
        return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); 
    }
    function rules(p) { //pass requirements
        return { 
            len: p.length >= 8, case: /[a-z]/.test(p) && /[A-Z]/.test(p), num: /\d/.test(p), sym: /[^A-Za-z0-9]/.test(p) 
        };
    }
    //pass requirements
    function missing(r) {
        var m = [];
        if (!r.len) m.push('8+ characters');
        if (!r.case) m.push('upper and lowercase letters');
        if (!r.num) m.push('a number');
        if (!r.sym) m.push('a special character');
        return m;
    }
    function rand(n) {
        var a = new Uint32Array(1);
        if (window.crypto && crypto.getRandomValues) { crypto.getRandomValues(a); } else { a[0] = Math.floor(Math.random() * 4294967296); }
        return a[0] % n;
    }
    function genCode() { return ('000000' + rand(1000000)).slice(-CFG.codeLength); }
    function genSalt() { return rand(4294967296).toString(36) + rand(4294967296).toString(36); }

    function hash(pw, salt) {
        var data = salt + ':' + pw;
        if (window.crypto && crypto.subtle && window.TextEncoder) {
            return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)).then(function (b) {
                return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
            });
        }
        var h = 5381;
        for (var i = 0; i < data.length; i++) { h = ((h << 5) + h + data.charCodeAt(i)) | 0; }
        return Promise.resolve('f' + (h >>> 0).toString(16));
    }

    /*temp database*/
    function getUsers() { return store.get('mq_users') || {}; }
    function saveUsers(u) { return store.set('mq_users', u); }

    /*toast n pop up of demo*/
    var region = $('#toast-region');
    var mail = $('#mail-popup');

    function raise(el) {
        if (!el) return;
        if (el.showPopover) {
            try {
                if (el.matches(':popover-open')) el.hidePopover();
                el.showPopover();
            } catch (e) { }
        } else {
            (document.querySelector('dialog[open]') || document.body).appendChild(el); //older browsers
        }
    }

    function toast(msg, type, ms) {
        type = type || 'info';
        var t = document.createElement('div');
        t.className = 'toast toast-' + type + ' enter';
        t.setAttribute('role', type === 'error' ? 'alert' : 'status');
        var ic = document.createElement('span');
        ic.className = 't-ic';
        ic.setAttribute('aria-hidden', 'true');
        var tx = document.createElement('span');
        tx.textContent = msg;
        t.appendChild(ic);
        t.appendChild(tx);
        while (region.children.length >= 3) { region.removeChild(region.firstChild); }
        region.appendChild(t);
        raise(region);
        setTimeout(function () { t.classList.remove('enter'); }, 400);
        setTimeout(function () {
            t.classList.add('leave');
            setTimeout(function () {
                if (t.parentNode) t.parentNode.removeChild(t);
                if (!region.children.length && region.hidePopover) { try { region.hidePopover(); } catch (e) { } }
            }, 260);
        }, ms || 5000);
    }

    function showMail(to, code, purpose) {
        if (!CFG.demoInbox || !mail) return;
        $('.mail-to', mail).textContent = 'To: ' + to;
        $('.mail-subject', mail).textContent = purpose === 'reset' ? 'Your Mystique password recovery code' : 'Verify your Mystique email';
        $('.mail-code', mail).textContent = code;
        mail.hidden = false;
        raise(mail);
    }
    function hideMail() {
        if (!mail) return;
        mail.hidden = true;
        try { if (mail.hidePopover && mail.matches(':popover-open')) mail.hidePopover(); } catch (e) { }
    }

    /*field validation*/
    function setMsg(el, m) { //changes displayed txt
        var f = el.closest('.field');
        var msg = f && $('.msg', f);
        if (!msg) return;
        if (!msg.dataset.def) msg.dataset.def = msg.textContent.trim();
        msg.textContent = m || msg.dataset.def;
    }
    function check(el, ok, msg) { //check if input is valid
        var f = el.closest('.field');
        if (!f) return ok;
        setMsg(el, ok ? null : msg);
        f.classList.toggle('bad', !ok);
        el.setAttribute('aria-invalid', String(!ok));
        return ok;
    }

    /*loading animation*/
    function busy(f, on) {
        var b = $('button[type=submit]', f);
        if (!b) return;
        if (on) {
            b.dataset.t = b.textContent.trim();
            b.disabled = true;
            b.setAttribute('aria-busy', 'true');
            b.innerHTML = '<span class="spin"></span>';
        } else {
            b.disabled = false;
            b.removeAttribute('aria-busy');
            b.textContent = b.dataset.t || b.textContent;
        }
    }

    /* ----------dialog helpers---------- */
    function show(id) {
        var d = document.getElementById(id);
        $$('dialog[open]').forEach(function (x) { if (x !== d) x.close(); });
        $$('.view', d).forEach(function (v) { v.hidden = v.dataset.view !== 'main'; });
        $$('form', d).forEach(function (f) { f.reset(); });
        $$('.bad', d).forEach(function (b) { b.classList.remove('bad'); });
        if (!d.open) d.showModal();
        var fc = $('.first-column', d);
        if (fc) fc.scrollTop = 0;
        var h = $('h2', d);
        if (h) h.focus();
        return d;
    }
    function showDone(d) {
        $$('.view', d).forEach(function (v) { v.hidden = v.dataset.view !== 'done'; });
        var h = $('[data-view=done] h2', d);
        if (h) h.focus();
    }

    /* ----------session limit---------- */
    function saveSession(u, remember) {
        var s = { email: u.email, name: u.first, exp: Date.now() + CFG.sessionDays * 864e5, remember: remember };
        if (remember) { store.set('mq_session', s); store.del('mq_session', sessionStorage); }
        else { store.set('mq_session', s, sessionStorage); store.del('mq_session'); } // ends when the tab closes
    }
    function clearSession() { store.del('mq_session'); store.del('mq_session', sessionStorage); }
    function getSession() {
        var s = store.get('mq_session') || store.get('mq_session', sessionStorage);
        if (!s) return null;
        if (s.exp < Date.now() || !getUsers()[s.email]) { clearSession(); return null; }
        return s;
    }

    function showSignedIn(d, name) {
        showDone(d);
        var sub = $('[data-view=done] .subheading', d);
        if (sub) sub.textContent = 'Welcome back, ' + name + '. Your saved styles and favorites are waiting for you.';
        if (!$('.signout', d)) {
            var p = document.createElement('p');
            p.className = 'signout-wrap';
            p.innerHTML = '<button type="button" class="create-account signout">Not you? Sign out</button>';
            $('[data-view=done]', d).appendChild(p);
            $('.signout', p).addEventListener('click', function () {
                clearSession();
                toast('You have been signed out.', 'info');
                document.dispatchEvent(new CustomEvent('mystique:signout'));
                if (popupMode) { d.close(); } else { show('dlg-signin'); }
            });
        }
    }

    /* ----------login limit attempt---------- */
    function attempts() { return store.get('mq_attempts') || {}; }
    function lockLeft(email) {
        var a = attempts()[email];
        if (!a || !a.lockUntil) return 0;
        var l = Math.ceil((a.lockUntil - Date.now()) / 1000);
        return l > 0 ? l : 0;
    }
    function recordFail(email) {
        var all = attempts();
        var a = all[email] || { count: 0 };
        if (a.lockUntil && a.lockUntil <= Date.now()) a = { count: 0 };
        a.count++;
        if (a.count >= CFG.maxAttempts) { a.lockUntil = Date.now() + CFG.lockSeconds * 1000; a.count = 0; }
        all[email] = a;
        store.set('mq_attempts', all);
        return { locked: !!a.lockUntil && a.lockUntil > Date.now(), left: CFG.maxAttempts - a.count };
    }
    function clearFails(email) {
        var all = attempts();
        delete all[email];
        store.set('mq_attempts', all);
    }
    var lockTimer;
    function lockUI(f, email) {
        var b = $('button[type=submit]', f);
        if (!b) return;
        clearInterval(lockTimer);
        if (!b.dataset.t) b.dataset.t = b.textContent.trim();
        function t() {
            var l = lockLeft(email);
            if (l > 0) { b.disabled = true; b.textContent = 'Try again in ' + fmt(l); }
            else { clearInterval(lockTimer); b.disabled = false; b.textContent = b.dataset.t; }
        }
        t();
        lockTimer = setInterval(t, 500);
    }

    /* ---------- verification codes ---------- */
    var pending = store.get('mq_pending', sessionStorage);
    var resetAuth = null;
    var timerId;

    function sendCode(email, purpose) {
        var p = {
            email: email, purpose: purpose, code: genCode(), tries: 0,
            expires: Date.now() + CFG.codeTtlMin * 60000,
            nextResend: Date.now() + CFG.resendSeconds * 1000
        };
        pending = p;
        store.set('mq_pending', p, sessionStorage);
        var subject = purpose === 'reset' ? 'Your Mystique password recovery code' : 'Verify your Mystique email';
        var job = CFG.sendEmail ? Promise.resolve(CFG.sendEmail(email, subject, p.code, purpose)) : Promise.resolve();
        return job.then(function () { return p; });
    }

    function startTimer() {
        clearInterval(timerId);
        function tick() {
            var btn = $('#vf-resend'), lbl = $('#vf-timer');
            var left = pending ? Math.max(0, Math.ceil((pending.nextResend - Date.now()) / 1000)) : 0;
            if (left > 0) { btn.disabled = true; lbl.textContent = 'You can request a new code in ' + fmt(left) + '. '; }
            else { btn.disabled = false; lbl.textContent = 'Didn’t get it? '; clearInterval(timerId); }
        }
        tick();
        timerId = setInterval(tick, 500);
    }

    function startVerification(email, purpose) {
        return sendCode(email, purpose).then(function (p) {
            var d = show('dlg-verify');
            $('#vf-title', d).textContent = purpose === 'reset' ? 'Enter Recovery Code' : 'Verify Your Email';
            $('#vf-email', d).textContent = email;
            startTimer();
            showMail(email, p.code, purpose); // code is "sent" right away
            toast('We sent a ' + CFG.codeLength + '-digit code to ' + email + '.', 'success');
            setTimeout(function () { $('#vf-code', d).focus(); }, 60);
        }).catch(function () {
            toast('We couldn’t send the code. Please try again.', 'error');
        });
    }

    $('#vf-resend').addEventListener('click', function () {
        if (!pending) return;
        var left = Math.ceil((pending.nextResend - Date.now()) / 1000);
        if (left > 0) { toast('Please wait ' + fmt(left) + ' before requesting a new code.', 'warning'); return; }
        sendCode(pending.email, pending.purpose).then(function (p) {
            startTimer();
            showMail(p.email, p.code, p.purpose);
            $('#vf-code').value = '';
            toast('A new code was sent to ' + p.email + '.', 'success');
        }).catch(function () { toast('We couldn’t resend the code. Please try again.', 'error'); });
    });

    $('#vf-code').addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); });
    $('#dlg-verify').addEventListener('close', hideMail);

    /* ----------pass meter---------- */
    function meter(p) {
        var d = $('#dlg-reset'), r = rules(p), n = 0;
        $$('.pw-rules li', d).forEach(function (li) {
            var ok = r[li.dataset.r];
            li.classList.toggle('ok', ok);
            if (ok) n++;
        });
        $$('.pw-meter span', d).forEach(function (s, i) { s.style.background = i < n ? COLS[n] : ''; });
        $('#rs-strength', d).textContent = NAMES[n];
    }
    $('#rs-pass').addEventListener('input', function () { meter(this.value); });
    $('[data-form=reset]').addEventListener('reset', function () { setTimeout(function () { meter(''); }, 0); });

    /* ----------available username---------- */
    var un = $('#su-user'), st = $('#user-status'), uTimer, uSeq = 0;
    function setStatus(cls, text) { st.className = 'hint ' + cls; st.textContent = text; }
    function lookupUsername(name, ownEmail) {
        var n = name.toLowerCase();
        return wait(350).then(function () { // simulated server round-trip
            if (RESERVED.indexOf(n) > -1) return false;
            var users = getUsers();
            return !Object.keys(users).some(function (k) {
                return users[k].username.toLowerCase() === n && k !== ownEmail;
            });
        });
    }
    un.addEventListener('input', function () {
        clearTimeout(uTimer);
        var v = un.value.trim();
        if (!v) { setStatus('', ''); return; }
        if (/[^a-z0-9._]/i.test(v)) { setStatus('is-bad', 'Only letters, numbers, dots and underscores.'); return; }
        if (v.length < 3) { setStatus('is-wait', 'At least 3 characters.'); return; }
        setStatus('is-wait', 'Checking availability…');
        var seq = ++uSeq;
        uTimer = setTimeout(function () {
            lookupUsername(v, $('#su-email').value.trim().toLowerCase()).then(function (free) {
                if (seq !== uSeq) return;
                if (free) { setStatus('is-ok', '✓ “' + v + '” is available.'); }
                else { setStatus('is-bad', '“' + v + '” is already taken. Try “' + v + (10 + rand(90)) + '”.'); }
            });
        }, 450);
    });
    $('[data-form=signup]').addEventListener('reset', function () { clearTimeout(uTimer); uSeq++; setStatus('', ''); });

    /* ----------capslock warning---------- */
    $$('input[autocomplete$="password"]').forEach(function (i) {
        var host = i.closest('.inp') || i;
        var w = document.createElement('p');
        w.className = 'caps-warn';
        w.hidden = true;
        w.textContent = 'Caps Lock is on';
        host.parentNode.insertBefore(w, host.nextSibling);
        var on = false, last = 0;
        function upd(e) {
            if (!e.getModifierState) return;
            var s = e.getModifierState('CapsLock');
            w.hidden = !s;
            if (s && !on && Date.now() - last > 4000) {
                last = Date.now();
                toast('Caps Lock is on. Passwords are case-sensitive.', 'warning');
            }
            on = s;
        }
        i.addEventListener('keydown', upd);
        i.addEventListener('keyup', upd);
        i.addEventListener('blur', function () { w.hidden = true; on = false; });
    });

    /* ----------form handlers---------- */
    var handlers = {};

    handlers.signin = function (f, d) {
        var em = $('#si-email', f), pw = $('#si-pass', f);
        var email = em.value.trim().toLowerCase();
        var okE = check(em, EMAIL_RX.test(email), 'Enter a valid email address, like you@example.com.');
        var okP = check(pw, pw.value.length > 0, 'Enter your password.');
        if (!okE || !okP) {
            (okE ? pw : em).focus();
            toast(!okE ? 'That email address doesn’t look right. Check for typos.' : 'Please enter your password.', 'error');
            return;
        }
        var l = lockLeft(email);
        if (l > 0) {
            toast('Too many failed attempts. Sign-in is paused for ' + fmt(l) + '.', 'error');
            lockUI(f, email);
            return;
        }
        busy(f, true);
        var u = getUsers()[email];
        Promise.all([u ? hash(pw.value, u.salt) : Promise.resolve(null), wait(900)]).then(function (r) {
            busy(f, false);
            function fail(el, inline, message) {
                var res = recordFail(email);
                check(el, false, inline);
                el.focus();
                if (res.locked) {
                    toast('Too many failed attempts. Sign-in is paused for ' + fmt(CFG.lockSeconds) + '.', 'error', 7000);
                    lockUI(f, email);
                } else if (res.left <= 2) {
                    toast(message + ' ' + res.left + ' ' + (res.left === 1 ? 'attempt' : 'attempts') + ' left before sign-in is paused.', 'warning', 6000);
                } else {
                    toast(message, 'error');
                }
            }
            if (!u) { fail(em, 'No account found with this email.', 'We couldn’t find an account with that email. Check the spelling or create an account.'); return; }
            if (r[0] !== u.hash) { fail(pw, 'Incorrect password.', 'Incorrect password. Try again or use “Forgot password?”.'); return; }
            clearFails(email);
            if (!u.verified) {
                toast('Please verify your email first. We just sent you a new code.', 'warning', 6000);
                startVerification(u.email, 'verify');
                return;
            }
            var remember = $('#check', f).checked;
            saveSession(u, remember);
            toast('Welcome back, ' + u.first + '!' + (remember ? ' You’ll stay signed in on this device for up to ' + CFG.sessionDays + ' days.' : ''), 'success', 6000);
            document.dispatchEvent(new CustomEvent('mystique:signin', { detail: { email: u.email, name: u.first } }));
            showSignedIn(d, u.first);
               if (CFG.redirectUrl) { 
                setTimeout(function () { 
                    location.href = CFG.redirectUrl; 
                }, 
                1500); 
            }
        });
    };

    handlers.signup = function (f) {
        var first = $('#su-first', f), last = $('#su-last', f), user = $('#su-user', f), email = $('#su-email', f);
        var pw = $('#su-pass', f), conf = $('#su-confirm', f), terms = $('#su-terms', f);
        var r = rules(pw.value), bad = [];
        function c(el, ok, msg) { if (!check(el, ok, msg)) bad.push(el); }
        c(first, first.value.trim() !== '');
        c(last, last.value.trim() !== '');
        c(user, USER_RX.test(user.value.trim()), 'Use 3–20 letters, numbers, dots or underscores.');
        c(email, EMAIL_RX.test(email.value.trim()));
        c(pw, r.len && r.case && r.num && r.sym, 'Your password still needs: ' + missing(r).join(', ') + '.');
        c(conf, conf.value === pw.value && pw.value !== '', 'Passwords do not match.');
        c(terms, terms.checked);
        if (bad.length) {
            bad[0].focus();
            toast('Please fix the highlighted fields to continue.', 'error');
            return;
        }
        var em = email.value.trim().toLowerCase(), uname = user.value.trim();
        var users = getUsers();
        if (users[em] && users[em].verified) {
            check(email, false, 'An account with this email already exists. Try signing in.');
            email.focus();
            toast('That email is already registered. Try signing in instead.', 'error');
            return;
        }
        busy(f, true);
        var salt = genSalt();
        Promise.all([hash(pw.value, salt), lookupUsername(uname, em), wait(900)]).then(function (res) {
            if (!res[1]) {
                busy(f, false);
                check(user, false, 'That username is taken. Pick another one.');
                user.focus();
                toast('“' + uname + '” is already taken. Please choose another username.', 'error');
                return;
            }
            var all = getUsers();
            all[em] = {
                first: first.value.trim(), last: last.value.trim(), username: uname, email: em,
                phone: $('#su-phone', f).value.trim(), birthday: $('#su-bday', f).value,
                interests: $$('input[name=interest]:checked', f).map(function (i) { return i.value; }),
                newsletter: $('#su-news', f).checked, salt: salt, hash: res[0], verified: false, created: Date.now()
            };
            if (!saveUsers(all)) {
                busy(f, false);
                toast('Your browser blocked local storage, so the account couldn’t be saved.', 'error');
                return;
            }
            busy(f, false);
            return startVerification(em, 'verify');
        }).catch(function () {
            busy(f, false);
            toast('Something went wrong. Please try again.', 'error');
        });
    };

    handlers.forgot = function (f) {
        var el = $('#fp-email', f);
        var email = el.value.trim().toLowerCase();
        if (!check(el, EMAIL_RX.test(email), 'Enter a valid email address, like you@example.com.')) {
            el.focus();
            toast('That email address doesn’t look right.', 'error');
            return;
        }
        if (!getUsers()[email]) {
            check(el, false, 'No account found with this email.');
            el.focus();
            toast('We couldn’t find an account with that email.', 'error');
            return;
        }
        busy(f, true);
        wait(700).then(function () { busy(f, false); return startVerification(email, 'reset'); });
    };

    handlers.verify = function (f) {
        var inp = $('#vf-code', f), v = inp.value.replace(/\D/g, '');
        if (!pending) {
            check(inp, false, 'This code is no longer valid. Request a new one.');
            toast('Your code session ended. Request a new code.', 'error');
            return;
        }
        if (v.length !== CFG.codeLength) { check(inp, false, 'Enter the ' + CFG.codeLength + '-digit code from your email.'); inp.focus(); return; }
        if (Date.now() > pending.expires) {
            check(inp, false, 'This code has expired. Request a new one.');
            toast('That code has expired. Request a new one.', 'error');
            return;
        }
        busy(f, true);
        wait(700).then(function () {
            busy(f, false);
            if (v !== pending.code) {
                pending.tries++;
                var left = CFG.maxCodeTries - pending.tries;
                if (left <= 0) { pending.expires = 0; }
                store.set('mq_pending', pending, sessionStorage);
                var m = left <= 0 ? 'Too many incorrect codes. Request a new one.'
                    : 'That code isn’t correct. ' + left + ' ' + (left === 1 ? 'try' : 'tries') + ' left.';
                check(inp, false, m);
                toast(m, 'error');
                inp.select();
                return;
            }
            var p = pending;
            pending = null;
            store.del('mq_pending', sessionStorage);
            clearInterval(timerId);
            hideMail();
            var users = getUsers();
            if (p.purpose === 'verify') {
                if (users[p.email]) { users[p.email].verified = true; saveUsers(users); }
                showDone($('#dlg-verify'));
                toast('Email verified. You can sign in now.', 'success');
            } else {
                resetAuth = { email: p.email, until: Date.now() + 10 * 60000 };
                var d = show('dlg-reset');
                $('#rs-email', d).textContent = p.email;
                toast('Code verified. Choose a new password.', 'success');
            }
        });
    };

    handlers.reset = function (f, d) {
        if (!resetAuth || resetAuth.until < Date.now()) {
            toast('Your recovery session expired. Please start again.', 'error');
            show('dlg-forgot');
            return;
        }
        var pw = $('#rs-pass', f), conf = $('#rs-confirm', f), r = rules(pw.value), bad = [];
        function c(el, ok, msg) { if (!check(el, ok, msg)) bad.push(el); }
        c(pw, r.len && r.case && r.num && r.sym, 'Your password still needs: ' + missing(r).join(', ') + '.');
        c(conf, conf.value === pw.value && pw.value !== '', 'Passwords do not match.');
        if (bad.length) { bad[0].focus(); toast('Please fix the highlighted fields to continue.', 'error'); return; }
        var users = getUsers(), u = users[resetAuth.email];
        busy(f, true);
        Promise.all([u ? hash(pw.value, u.salt) : null, wait(900)]).then(function (res) {
            if (!u) { busy(f, false); toast('That account no longer exists.', 'error'); return; }
            if (res[0] === u.hash) {
                busy(f, false);
                check(pw, false, 'Your new password must be different from the old one.');
                pw.focus();
                toast('Choose a password you haven’t used before.', 'error');
                return;
            }
            var salt = genSalt();
            return hash(pw.value, salt).then(function (h) {
                u.salt = salt;
                u.hash = h;
                u.verified = true; // they proved they own this email
                saveUsers(users);
                clearFails(u.email);
                resetAuth = null;
                busy(f, false);
                showDone(d);
                toast('Password changed successfully. Sign in with your new password.', 'success', 7000);
            });
        }).catch(function () {
            busy(f, false);
            toast('Something went wrong. Please try again.', 'error');
        });
    };

    // Capture phase on document: runs before the original form listeners and replaces them.
    document.addEventListener('submit', function (e) {
        var f = e.target, h = f.dataset && handlers[f.dataset.form];
        if (!h) return;
        e.preventDefault();
        e.stopPropagation();
        h(f, f.closest('dialog'));
    }, true);

    /* ----------dark/light mode---------- */
    var ICON_SUN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    var ICON_MOON = '<svg viewBox="0 0 24 24"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>';

    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        $$('.theme-toggle').forEach(function (b) {
            b.setAttribute('aria-pressed', String(t === 'dark'));
            b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            b.innerHTML = t === 'dark' ? ICON_SUN : ICON_MOON;
        });
    }
    //toggle
    $$('dialog .first-column').forEach(function (fc) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'theme-toggle';
        b.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            store.set('mq_theme', next);
            applyTheme(next);
        });
        fc.insertBefore(b, fc.firstChild);
    });
    applyTheme(store.get('mq_theme') ||
        (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    /* ----------popup---------- */
    if (popupMode) {
        document.body.classList.add('is-popup');
        $$('dialog[open]').forEach(function (d) { d.close(); }); // don't auto-open on the main page
        // X / Continue just close the popup (the original would jump back to sign in)
        document.addEventListener('click', function (e) {
            var c = e.target.closest('[data-close]');
            if (!c) return;
            e.stopPropagation();
            var d = c.closest('dialog');
            if (c.classList.contains('continue')) { show('dlg-signin'); } else if (d) { d.close(); }
        }, true);
        $$('dialog').forEach(function (d) {
            d.addEventListener('keydown', function (e) { if (e.key === 'Escape') d.close(); });
            d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); // click the backdrop
        });
    }

    //redirect
    document.addEventListener('click', function (e) {
        var c = e.target.closest('#dlg-signin .continue');
        if (!c || !getSession()) return;
        e.stopPropagation();
        if (CFG.redirectUrl) { location.href = CFG.redirectUrl; return; }
        if (popupMode) { c.closest('dialog').close(); }
    }, true);

    /* ----------restore session---------- */
    if (!popupMode) {
        var d0 = $('#dlg-signin'), s0 = getSession();
        if (s0 && d0.open) showSignedIn(d0, s0.name);
    }

    //auth API
    window.MystiqueAuth = {
        config: CFG,
        getSession: getSession,
        signOut: function () { clearSession(); document.dispatchEvent(new CustomEvent('mystique:signout')); },
        open: function (id) { show(id || 'dlg-signin'); }
    };

    // Keep the text fields empty when the page shows up (beats browser autofill / back-button restore)
(function () {
    function clearFields() {
        document.querySelectorAll(
            'dialog input[type="text"], dialog input[type="email"], dialog input[type="password"], dialog input[type="tel"]'
        ).forEach(function (i) {
            // don't wipe the code or password the user is typing right now
            if (document.activeElement !== i) i.value = '';
        });
    }
    clearFields();
    setTimeout(clearFields, 100);   // Chrome often autofills a moment after load
    setTimeout(clearFields, 500);
    window.addEventListener('pageshow', clearFields);   // back/forward cache
})();
})();