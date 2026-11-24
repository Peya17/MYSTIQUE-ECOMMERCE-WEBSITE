/* =========================================================
   MYSTIQUE — shared script
   Header + footer, search, product data, cart + wishlist state, quick view.
   Every page shares the same saved cart (localStorage "mq_cart"), so the
   bag count stays the same on the main page, shop, our world and cart.

   Other scripts (home.js, cart.js, checkout.js ...) load AFTER this file and
   plug in through window.MQ:
       MQ.page('cart', fn)      run fn when <body data-page="cart">
       MQ.action('line', fn)    handle clicks on [data-action="line"]
   ========================================================= */
(function () {
    'use strict';

    /* ---------- Config ---------- */
    // where this file was loaded from (used to find profile.js next to it)
    const THIS_SRC = document.currentScript && document.currentScript.src;

    const PROMO = { code: 'MYSTIQUE15', rate: 0.15 };
    const SHIPPING = 120;

    // login / sign up page (Sign Up button points here)
    const AUTH_PAGE = 'loginandsignin.html';

    // where the profile icon goes once the customer is signed in
    const PROFILE_PAGE = 'profile.html';

    // folder that holds every product photo (change this one line if yours moves)
    const IMG_BASE = 'assets/images/images/';

    /* ---------- Product data ----------
       Edit prices and copy here.
       Bag photos live in IMG_BASE as {id}-1.jpg, {id}-2.jpg ... (the last one is the promo graphic). */
    const LINE = { emy: 'Emy Line', seffy: 'Seffy Line', makeup: 'Makeup', skincare: 'Skincare', bags: 'Bags' };
    const FEATURES = 'Scratchproof vegan leather finish, concealed hardware, a protective bottom and thoughtful interior pockets.';
    const SHORT = { emy: 'Everyday elegance in vegan leather.', seffy: 'Sleek, structured and made to last.' };
    const PHOTOS = { 'emy-grey': 4 };

    function bag(line, colorName, color, price, reviews, best) {
        const name = (line === 'emy' ? 'Emy ' : 'Seffy ') + colorName;
        const id = name.toLowerCase().replace(/ /g, '-');
        return {
            id: id, name: name, line: line, cat: 'bags', colorName: colorName, color: color, price: price,
            rating: 4.8, reviews: reviews, img: id + '-1.jpg', photos: PHOTOS[id] || 3, shades: [], best: !!best,
            short: SHORT[line],
            desc: 'A limited edition ' + LINE[line] + ' handbag in ' + colorName.toLowerCase() + ', crafted in premium vegan leather. ' + FEATURES,
            how: 'Wipe clean with a soft, dry cloth. Store upright in its dust bag, away from heat and direct sunlight.'
        };
    }

    // Makeup product from the Figma product details + quick view frames.
    // Shade names and colors other than Midnight Mauve are placeholders: edit freely.
    const VELVET = {
        id: 'velvet-lip-color', name: 'Velvet Lip Color', line: 'makeup', cat: 'makeup',
        crumb: 'Lips', tag: 'Lip color',
        colorName: 'Midnight Mauve', color: '#4A2438', price: 650, rating: 4.9, reviews: 128,
        img: 'velvet-lip-color.jpg', photos: 0, best: false,
        shades: [
            { n: 'Midnight Mauve', c: '#4A2438' },
            { n: 'Plum Rose', c: '#7A3A58' },
            { n: 'Dusty Rose', c: '#A5667E' },
            { n: 'Soft Petal', c: '#C98A9B' }
        ],
        short: 'Satin-soft, buildable color.',
        desc: 'A satin-soft veil of color, made for every version of you. Comfortable, buildable color with a silky luminous finish.',
        how: 'Glide onto lips from the center outward. Layer to build your perfect finish. Net weight 3.5 g. Store in a cool, dry place.',
        perks: 'Vegan · Cruelty-free · Thoughtfully packaged'
    };

    const PRODUCTS = [
        bag('emy', 'Beige', '#D8C3A5', 1499, 128, true),
        bag('emy', 'Blue', '#6F8FB5', 1499, 96, true),
        bag('emy', 'Grey', '#9A9A9F', 1499, 64),
        bag('emy', 'Yellow', '#E3C65B', 1499, 52),
        bag('seffy', 'Black', '#2A2226', 1599, 110, true),
        bag('seffy', 'Green', '#4F6F58', 1599, 73, true),
        VELVET
    ];

    /* ---------- Small helpers ---------- */
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const byId = id => PRODUCTS.find(p => p.id === id);
    const peso = n => '₱' + n.toLocaleString('en-PH');
    const pesoD = n => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const stars = p => '★★★★★ ' + p.rating.toFixed(1) + ' (' + p.reviews + ')';
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const tagOf = p => p.tag || LINE[p.line];
    const heartSvg = s => '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none"><path d="M12 20.5s-8-4.9-8-11A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8 2.9c0 6.1-8 11-8 11z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    const lineSub = (l, p) => LINE[p.line] + ' · ' + p.colorName;
    const imgSlot = p => '<div class="img-slot"><img src="' + IMG_BASE + p.img + '" alt="' + p.name + '" onerror="this.style.display=\'none\'"></div>';

    const store = {
        get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
    };

    /* ---------- Shared state (one object, read by every script) ---------- */
    const state = {
        cart: store.get('mq_cart', []),
        wish: store.get('mq_wish', []),
        promo: store.get('mq_promo', '')
    };

    /* ---------- Toast ---------- */
    let toastTimer;
    function toast(msg) {
        let t = $('.toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
    }

    /* ---------- Cart + wishlist state ---------- */
    const cartCount = () => state.cart.reduce((s, l) => s + l.qty, 0);

    function badges(bump) {
        $$('[data-cart-count]').forEach(b => {
            b.textContent = cartCount();
            if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
        });
        $$('[data-wish-count]').forEach(b => {
            b.textContent = state.wish.length;
            b.hidden = state.wish.length === 0;
        });
    }

    function saveCart(bump) {
        store.set('mq_cart', state.cart);
        badges(bump);
    }

    function addToCart(id, shade, qty) {
        const line = state.cart.find(l => l.id === id && l.shade === shade);
        if (line) line.qty += qty; else state.cart.push({ id: id, shade: shade, qty: qty });
        saveCart(true);
        toast('Added to your bag');
    }

    function toggleWish(id) {
        const i = state.wish.indexOf(id);
        if (i > -1) state.wish.splice(i, 1); else state.wish.push(id);
        store.set('mq_wish', state.wish);
        badges();
        return i === -1;
    }

    function cartTotals() {
        const sub = state.cart.reduce((s, l) => s + byId(l.id).price * l.qty, 0);
        const ship = state.cart.length ? SHIPPING : 0;
        const disc = state.promo === PROMO.code ? Math.round(sub * PROMO.rate) : 0;
        return { sub: sub, ship: ship, disc: disc, total: sub + ship - disc };
    }

    /* ---------- Search ---------- */
    // every word typed must appear somewhere in the product's name, category, tag, color, shade or blurb
    function searchProducts(q) {
        const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.length) return [];
        return PRODUCTS.filter(p => {
            const hay = [p.name, LINE[p.line], p.tag, p.cat, p.colorName, p.short]
                .concat(p.shades.map(s => s.n)).join(' ').toLowerCase();
            return words.every(w => hay.indexOf(w) > -1);
        });
    }

    function renderSearch() {
        const box = $('#searchResults');
        const input = $('#searchInput');
        if (!box || !input) return;
        const q = input.value.trim();
        $('#searchClear').hidden = !q;
        if (!q) {
            box.innerHTML = '<p class="sr-hint">Popular searches</p><div class="sr-chips">' +
                '<a href="shop.html?tab=makeup">Makeup</a><a href="shop.html?tab=skincare">Skincare</a>' +
                '<a href="shop.html?tab=bags">Bags</a><a href="shop.html?q=lip">Lip color</a></div>';
            return;
        }
        const hits = searchProducts(q);
        if (!hits.length) {
            box.innerHTML = '<p class="sr-empty">No matches for “' + esc(q) + '”. Try makeup, skincare or bags.</p>';
            return;
        }
        box.innerHTML = hits.slice(0, 5).map(p =>
            '<a class="sr-item" href="product.html?id=' + p.id + '">' +
            '<span class="sr-thumb"><img src="' + IMG_BASE + p.img + '" alt="" onerror="this.style.display=\'none\'"></span>' +
            '<span class="sr-text"><strong>' + esc(p.name) + '</strong><small>' + peso(p.price) + ' · ' + esc(tagOf(p)) + '</small></span></a>'
        ).join('') + (hits.length > 5
            ? '<a class="sr-all" href="shop.html?q=' + encodeURIComponent(q) + '">See all ' + hits.length + ' results →</a>' : '');
    }

    function setSearch(open) {
        const panel = $('#searchPanel');
        if (!panel) return;
        panel.hidden = !open;
        const btn = $('[data-action="search"]');
        if (btn) btn.setAttribute('aria-expanded', open);
        if (open) {
            renderSearch();
            $('#searchInput').focus();
        }
    }

    /* ---------- Shared header + footer (your original markup) ---------- */
    const HEADER = `
    <div class="announcement-bar">
        <div class="announcement-content">
            <span>Limited Edition Mystique Collections — Enjoy 15% off your first order with code MYSTIQUE15.</span>
            <a href="shop.html" class="goto-btn" aria-label="Go to offer">
                <svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.75 6.0006H11.2512M6.0006 11.2512L11.2512 6.0006L6.0006 0.75" stroke-width="1.5" stroke-linecap="round" stroke="#ffffff"/>
                </svg>
            </a>
        </div>
    </div>
    <header class="navbar-header">
        <nav class="navbar">
            <div class="navbar-logo">
                <a href="Main page.html">mystique</a>
                <span class="navbar-sub">Collections</span>
            </div>
            <ul class="navbar-links">
                <li><a href="shop.html">Shop</a></li>
                <li><a href="shop.html#new-arrivals">New Arrivals</a></li>
                <li><a href="shop.html#bestsellers">Bestsellers</a></li>
                <li><a href="ourworld.html">Our World</a></li>
            </ul>
            <div class="navbar-tools">
                <button type="button" class="tool-btn" aria-label="Search" aria-expanded="false" aria-controls="searchPanel" data-action="search">
                    <svg width="20" height="20" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.7501 15.7501L12.1335 12.1335M14.0833 7.41667C14.0833 11.0986 11.0986 14.0833 7.41667 14.0833C3.73477 14.0833 0.75 11.0986 0.75 7.41667C0.75 3.73477 3.73477 0.75 7.41667 0.75C11.0986 0.75 14.0833 3.73477 14.0833 7.41667Z" stroke-width="1.5" stroke-linecap="round" stroke="currentColor"/>
                    </svg>
                </button>
                <a href="wishlist.html" class="tool-btn" aria-label="Wishlist">
                    ${heartSvg(20)}
                    <span class="cart-badge" data-wish-count hidden>0</span>
                </a>
                <a href="cart.html" class="tool-btn" aria-label="Shopping Bag">
                    <svg width="21" height="21" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.3333 8.33322C13.3333 9.21734 12.9821 10.0653 12.357 10.6904C11.7319 11.3156 10.8841 11.6668 10 11.6668C9.11594 11.6668 8.2681 11.3156 7.64298 10.6904C7.01786 10.0653 6.66667 9.21734 6.66667 8.33322M2.58545 5.0281H2.58563M2.58563 5.0281H17.4138M2.58563 5.0281C2.64191 4.85934 2.72521 4.69958 2.83333 4.55541L4.5 2.33274C4.65525 2.12573 4.85655 1.95771 5.08798 1.84198C5.3194 1.72626 5.57459 1.66602 5.83333 1.66602H14.1667C14.4254 1.66602 14.6806 1.72626 14.912 1.84198C15.1434 1.95771 15.3448 2.12573 15.5 2.33274L17.1667 4.55541C17.383 4.84393 17.5 5.19485 17.5 5.55549V16.6672C17.5 17.1093 17.3244 17.5332 17.0118 17.8458C16.6993 18.1584 16.2754 18.334 15.8333 18.334H4.16667C3.72464 18.334 3.30072 18.1584 2.98816 17.8458C2.67559 17.5332 2.5 17.1093 2.5 16.6672V5.55549C2.5 5.37506 2.52928 5.19707 2.58563 5.0281Z" stroke-width="1.5" stroke-linecap="round" stroke="currentColor"/>
                    </svg>
                    <span class="cart-badge" data-cart-count>0</span>
                </a>
                <button type="button" class="tool-btn" aria-label="Profile" data-profile>
                    <svg width="17" height="19" viewBox="0 0 15 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.416 9.08333C9.71696 9.08333 11.5822 7.21785 11.5822 4.91667C11.5822 2.61548 9.71696 0.75 7.416 0.75C5.11504 0.75 3.24975 2.61548 3.24975 4.91667C3.24975 7.21785 5.11504 9.08333 7.416 9.08333ZM7.416 9.08333C9.18393 9.08333 10.8795 9.78571 12.1296 11.036C13.3797 12.2862 14.082 13.9819 14.082 15.75M7.416 9.08333C5.64807 9.08333 3.95254 9.78571 2.70243 11.036C1.45231 12.2862 0.75 13.9819 0.75 15.75"
                        stroke-width="1.5" stroke-linecap="round"
                        stroke="currentColor"/>
                    </svg>
                </button>
            </div>
        </nav>
        <div class="search-panel" id="searchPanel" hidden>
            <div class="search-inner">
                <form class="search-form" id="searchForm" action="shop.html" method="get" role="search">
                    <svg width="18" height="18" viewBox="0 0 17 17" fill="none" aria-hidden="true">
                        <path d="M15.7501 15.7501L12.1335 12.1335M14.0833 7.41667C14.0833 11.0986 11.0986 14.0833 7.41667 14.0833C3.73477 14.0833 0.75 11.0986 0.75 7.41667C0.75 3.73477 3.73477 0.75 7.41667 0.75C11.0986 0.75 14.0833 3.73477 14.0833 7.41667Z" stroke-width="1.5" stroke-linecap="round" stroke="#8F5E77"/>
                    </svg>
                    <input type="search" id="searchInput" name="q" placeholder="Search makeup, skincare and bags" autocomplete="off" aria-label="Search products">
                    <button type="button" class="search-clear" id="searchClear" data-action="search-clear" aria-label="Clear search" hidden>×</button>
                </form>
                <div class="search-results" id="searchResults" aria-live="polite"></div>
            </div>
        </div>
    </header>`;

    const FOOTER = `
    <footer class="site-footer">
        <div class="footer-container">
            <div class="footer-column brand-col">
                <a href="front-page.html" class="footer-logo">mystique</a>
                <p>(^^placeholder^^)</p>
                <p>(Should be Logo)</p>
            </div>
            <div class="footer-column hours-col">
                <h3>Opening Hours</h3>
                <p>Monday to Friday: <span>Oras mo na</span></p>
                <p>Saturday to Sunday: <span>muehhehehe</span></p>
            </div>
            <div class="footer-column links-col">
                <h3>Contact Info</h3>
                <ul class="footer-links">
                    <li><a href="#">Address: Lot 123, Etivac St., Brgy. Etivac, Etivac City, Etivac, Philippines</a></li>
                    <li><a href="#">Email: mystiquebusinessemail.123@gmail.com</a></li>
                    <li><a href="#">Phone Number: +63 6767 6767</a></li>
                    <li><a href="#">Instagram: Da Only Mystique Official 100% Legit Pure (Verified)</a></li>
                </ul>
            </div>
        </div>
    </footer>`;

    /* ---------- Profile icon <-> Sign Up ---------- */
    // Reads the session the login page saves ("mq_session").
    // It understands BOTH formats, so it works no matter which one the login page uses:
    //   new  (profile.js):  mq_session = { id }            + mq_users = [ { id, email, ... } ]
    //   old  (login page):  mq_session = { email, exp }    + mq_users = { "email": {...} }
    function readJSON(area, key) {
        try { return JSON.parse(area.getItem(key)); } catch (e) { return null; }
    }

    function isSignedIn() {
        try {
            const s = readJSON(localStorage, 'mq_session') || readJSON(sessionStorage, 'mq_session');
            if (!s || typeof s !== 'object') return false;
            if (s.exp && s.exp <= Date.now()) return false;            // expired session

            const users = readJSON(localStorage, 'mq_users') || [];
            const email = s.email ? String(s.email).toLowerCase() : '';

            if (Array.isArray(users)) {
                return users.some(u => u && ((s.id && u.id === s.id) ||
                    (email && String(u.email || '').toLowerCase() === email)));
            }
            // object keyed by email
            return Object.keys(users).some(k => k.toLowerCase() === email);
        } catch (e) { return false; }
    }

        // profile.js (popup + accounts) is loaded on demand, or up front at boot
    let profileQueue = null;
    function loadProfileScript(cb) {
        if (window.MQProfile || !THIS_SRC) { cb(); return; }
        if (!profileQueue) {
            profileQueue = [];
            const ps = document.createElement('script');
            ps.src = new URL('profile.js', THIS_SRC).href;
            ps.onload = ps.onerror = function () {
                const q = profileQueue;
                profileQueue = null;
                q.forEach(f => f());
            };
            document.body.appendChild(ps);
        }
        profileQueue.push(cb);
    }

    // popup first: signed in -> account popup, signed out -> login page
    function openProfile() {
        loadProfileScript(function () {
            if (window.MQProfile) window.MQProfile.open();
            else window.location.href = PROFILE_PAGE;   // last resort if profile.js can't load
        });
    }

    function updateProfileBtn() {
        $$('[data-profile]').forEach(b => {
            b.onclick = openProfile;
        });
    }

    /* ---------- Reusable card pieces ---------- */
    // quick = true: clicking the photo opens the quick view instead of leaving the page
    function media(p, quick) {
        const on = state.wish.indexOf(p.id) > -1;
        const imgAttrs = quick
            ? ' data-action="quick" data-id="' + p.id + '" aria-label="Quick view ' + p.name + '"'
            : '';
        return '<div class="card-media">' +
            '<a class="img-wrap" href="product.html?id=' + p.id + '"' + imgAttrs + '><img src="' + IMG_BASE + p.img + '" alt="' + p.name + '" loading="lazy" onerror="this.style.display=\'none\'"></a>' +
            '<button type="button" class="heart' + (on ? ' on' : '') + '" data-action="wish" data-id="' + p.id + '" aria-pressed="' + on + '" aria-label="Save ' + p.name + ' to wishlist">' + heartSvg(18) + '</button>' +
            '</div>';
    }

    function card(p, quick) {
        return '<article class="card">' + media(p, quick === true) +
            '<h3 class="card-title">' + p.name + '</h3>' +
            '<div class="card-foot"><p class="card-meta">' + peso(p.price) + ' · ' + tagOf(p) + '</p>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="quick" data-id="' + p.id + '">View →</button></div>' +
            '</article>';
    }

    function swatchHtml(p, size) {
        return p.shades.map((s, i) =>
            '<button type="button" class="swatch ' + size + (i ? '' : ' active') + '" data-action="swatch" data-shade="' + s.n + '" style="background:' + s.c + '" aria-label="' + s.n + '"></button>'
        ).join('');
    }

    function wishCard(p) {
        return '<article class="card wish-card">' + media(p) +
            '<h3 class="card-title">' + p.name + '</h3>' +
            '<p class="card-sub">' + LINE[p.line] + ' · ' + p.colorName + '</p>' +
            '<p class="rating">' + stars(p) + '</p>' +
            '<div class="price-row"><span class="price">' + pesoD(p.price) + '</span><span class="swatches">' + swatchHtml(p, 'sm') + '</span></div>' +
            '<button type="button" class="btn btn-primary" data-action="add" data-id="' + p.id + '">Add to Bag</button>' +
            '<button type="button" class="btn btn-ghost" data-action="quick" data-id="' + p.id + '">Preview Product</button>' +
            '</article>';
    }

    /* ---------- Quick view modal ---------- */
    function ensureModal() {
        if ($('#qv')) return;
        document.body.insertAdjacentHTML('beforeend',
            '<div class="modal" id="qv" aria-hidden="true">' +
            '<div class="modal-box" role="dialog" aria-modal="true" aria-label="Quick view">' +
            '<button type="button" class="modal-close" data-action="close" aria-label="Close">×</button>' +
            '<div class="img-slot qv-img"><img id="qvImg" alt=""></div>' +
            '<div class="panel qv-panel">' +
            '<h2 id="qvName"></h2><p class="rating" id="qvRate"></p>' +
            '<p class="qv-desc" id="qvDesc"></p><p class="price" id="qvPrice"></p>' +
            '<button type="button" class="btn btn-dark btn-block" id="qvAdd" data-action="add">Add to Bag</button>' +
            '<a class="btn btn-ghost btn-block" id="qvMore" href="#">View full details →</a>' +
            '</div></div></div>');
    }

    // shade is optional: products with shades (Velvet Lip Color) open on the chosen one
    function openQuick(id, shade) {
        const p = byId(id);
        if (!p) return;
        ensureModal();
        const img = $('#qvImg');
        img.style.display = '';
        img.onerror = function () { img.style.display = 'none'; };
        img.src = IMG_BASE + p.img;
        img.alt = p.name;
        const sh = p.shades.length ? (p.shades.some(s => s.n === shade) ? shade : p.shades[0].n) : '';
        $('#qvName').textContent = p.name;
        $('#qvRate').textContent = stars(p).replace('★ ', '★  ');
        $('#qvDesc').innerHTML = (sh || (LINE[p.line] + ' · ' + p.colorName)) + '<br>' + p.short;
        $('#qvPrice').textContent = pesoD(p.price);
        $('#qvAdd').dataset.id = id;
        $('#qvAdd').dataset.shade = sh;
        $('#qvMore').href = 'product.html?id=' + id + (sh ? '&shade=' + encodeURIComponent(sh) : '');
        const m = $('#qv');
        m.classList.add('open');
        m.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        $('.modal-close', m).focus();
    }

    function closeQuick() {
        const m = $('#qv');
        if (!m) return;
        m.classList.remove('open');
        m.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    // the shade currently chosen near a button (product page or wishlist card)
    function pickShade(el, id) {
        const p = byId(id);
        if (!p || !p.shades.length) return '';
        const root = el.closest('.card, .pd-panel');
        const on = root && $('.swatch.active[data-shade]', root);
        return on ? on.dataset.shade : p.shades[0].n;
    }

    /* ---------- Page renderers + extra click actions ----------
       The cart page lives in cart.js, which plugs in with MQ.page / MQ.action. */
    const pages = {};
    const actions = {};
    let booted = false;

    // bestsellers: clicking a photo (or "View →") opens the quick view
    pages.home = function () {
        $('#homeBest').innerHTML = PRODUCTS.filter(p => p.best).slice(0, 4).map(p => card(p, true)).join('');
    };

    pages.shop = function () {
        const tabs = $$('[data-tab]');
        const grid = $('#newGrid');
        const params = new URLSearchParams(location.search);
        const start = params.get('tab');
        let query = (params.get('q') || '').trim();
        function show(tab) {
            tabs.forEach(t => t.classList.toggle('active', !query && t.dataset.tab === tab));
            if (query) {
                const hits = searchProducts(query);
                grid.innerHTML = '<p class="empty">' + (hits.length
                    ? hits.length + (hits.length === 1 ? ' result' : ' results') + ' for “' + esc(query) + '”. '
                    : 'No matches for “' + esc(query) + '”. ') + '<a href="shop.html">Show everything</a></p>' + hits.map(p => card(p)).join('');
                return;
            }
            const list = PRODUCTS.filter(p => tab === 'all' || p.line === tab || p.cat === tab);
            grid.innerHTML = list.length ? list.map(p => card(p)).join('') : '<p class="empty">Nothing here yet. Check back soon.</p>';
        }
        tabs.forEach(t => t.addEventListener('click', () => { query = ''; show(t.dataset.tab); }));
        show(['all', 'emy', 'seffy', 'makeup', 'skincare', 'bags'].indexOf(start) > -1 ? start : 'all');
        $('#bestGrid').innerHTML = PRODUCTS.filter(p => p.best).map(p => card(p)).join('');
    };

    pages.product = function () {
        const root = $('#productRoot');
        const p = byId(new URLSearchParams(location.search).get('id')) || PRODUCTS[0];
        const on = state.wish.indexOf(p.id) > -1;
        document.title = p.name + ' | mystique';
        const siblings = PRODUCTS.filter(x => x.line === p.line);
        let shadeBlock = siblings.length > 1
            ? '<p class="label">Color / ' + p.colorName + '</p><div class="swatches">' +
              siblings.map(x =>
                '<a class="swatch' + (x.id === p.id ? ' active' : '') + '" href="product.html?id=' + x.id + '" style="background:' + x.color + '" aria-label="' + x.colorName + '"></a>'
              ).join('') + '</div>'
            : '';
        if (p.shades.length) {
            const want = new URLSearchParams(location.search).get('shade');
            const cur = p.shades.some(s => s.n === want) ? want : p.shades[0].n;
            shadeBlock = '<p class="label">Shade / <span id="shadeLabel">' + cur + '</span></p><div class="swatches">' +
                p.shades.map(s => '<button type="button" class="swatch' + (s.n === cur ? ' active' : '') + '" data-action="swatch" data-shade="' + s.n + '" style="background:' + s.c + '" aria-label="' + s.n + '"></button>').join('') + '</div>';
        }
        root.innerHTML =
            '<p class="crumbs"><a href="shop.html">Shop</a> / ' + (p.crumb || LINE[p.line]) + ' / ' + p.name + '</p>' +
            '<div class="pd"><div>' +
            '<div class="img-slot pd-photo"><img id="pdMain" src="' + IMG_BASE + p.img + '" alt="' + p.name + '" onerror="this.style.display=\'none\'"></div>' +
            '<div class="thumbs">' + Array.from({ length: p.photos }, (_, i) => i + 1).map(n =>
                '<button type="button" class="thumb' + (n === 1 ? ' active' : '') + '" data-action="thumb" data-id="' + p.id + '" data-n="' + n + '" data-last="' + (n === p.photos ? 1 : 0) + '" aria-label="Show photo ' + n + '">' +
                '<img src="' + IMG_BASE + p.id + '-' + n + '.jpg" alt="" onerror="this.style.display=\'none\'"></button>').join('') + '</div>' +
            '<p class="pd-tagline">The Mystique Edit · a touch of everyday luxury</p>' +
            '<div class="pd-details"><h3>' + (p.cat === 'bags' ? 'Details &amp; care' : 'Details &amp; how to use') + '</h3><p>' + p.how + '</p></div></div>' +
            '<div class="panel pd-panel"><h1>' + p.name + '</h1>' +
            '<p class="rating">' + stars(p).replace(' (', ' · ').replace(')', ' reviews') + '</p>' +
            '<p class="pd-price">' + pesoD(p.price) + '</p><p class="pd-desc">' + p.desc + '</p>' +
            shadeBlock +
            '<p class="label">Quantity</p><div class="qty"><button type="button" data-action="qty" data-d="-1" aria-label="Decrease quantity">−</button><span id="qtyVal">1</span><button type="button" data-action="qty" data-d="1" aria-label="Increase quantity">+</button></div>' +
            '<div class="pd-actions"><button type="button" class="btn btn-primary" data-action="addqty" data-id="' + p.id + '">Add to Bag →</button>' +
            '<button type="button" class="btn btn-ghost wish-square' + (on ? ' on' : '') + '" data-action="wish" data-id="' + p.id + '" aria-pressed="' + on + '" aria-label="Save to wishlist">' + heartSvg(22) + '</button></div>' +
            '<p class="perks">' + (p.perks || 'Vegan leather · Scratchproof · Concealed hardware') + '</p></div></div>';
    };

    pages.wishlist = function () {
        const grid = $('#wishGrid');
        const items = state.wish.map(byId).filter(Boolean);
        grid.innerHTML = items.length
            ? items.map(wishCard).join('')
            : '<p class="empty">Nothing saved yet. Tap the heart on anything you love and it will wait for you here. <a href="shop.html">Browse the collection</a></p>';
    };

    /* ---------- Click handling (one listener for the whole site) ---------- */
    document.addEventListener('click', function (e) {
        if (e.target.id === 'qv') { closeQuick(); return; }

        // click outside the header closes the search bar
        const panel = $('#searchPanel');
        if (panel && !panel.hidden && !e.target.closest('.navbar-header')) setSearch(false);

        const el = e.target.closest('[data-action]');
        if (!el) return;
        const a = el.dataset.action;
        const id = el.dataset.id;
        const page = document.body.dataset.page;
        if (a === 'wish') {
            const on = toggleWish(id);
            el.classList.toggle('on', on);
            el.setAttribute('aria-pressed', on);
            toast(on ? 'Saved to your wishlist' : 'Removed from your wishlist');
            if (page === 'wishlist' && !on) pages.wishlist();
        } else if (a === 'quick') {
            e.preventDefault(); // photo links fall back to product.html only without JS
            openQuick(id);
        } else if (a === 'close') {
            closeQuick();
        } else if (a === 'search') {
            setSearch(!!$('#searchPanel').hidden);
        } else if (a === 'search-clear') {
            $('#searchInput').value = '';
            renderSearch();
            $('#searchInput').focus();
        } else if (a === 'swatch') {
            $$('.swatch', el.parentElement).forEach(s => s.classList.toggle('active', s === el));
            const lab = $('#shadeLabel');
            if (lab) lab.textContent = el.dataset.shade;
        } else if (a === 'add') {
            addToCart(id, el.dataset.shade || pickShade(el, id), 1);
        } else if (a === 'addqty') {
            addToCart(id, pickShade(el, id), parseInt($('#qtyVal').textContent, 10) || 1);
        } else if (a === 'qty') {
            const q = $('#qtyVal');
            q.textContent = Math.max(1, (parseInt(q.textContent, 10) || 1) + parseInt(el.dataset.d, 10));
        } else if (a === 'thumb') {
            const m = $('#pdMain');
            m.style.display = '';
            m.src = IMG_BASE + id + '-' + el.dataset.n + '.jpg';
            m.classList.toggle('contain', el.dataset.last === '1');
            $$('.thumb').forEach(t => t.classList.toggle('active', t === el));
        } else if (a === 'soon') {
            toast(el.dataset.msg || 'Coming soon');
        } else if (actions[a]) {
            // actions added by other scripts (cart.js: line, remove, promo)
            actions[a](el, e);
        }
    });

    document.addEventListener('input', function (e) {
        if (e.target.id === 'searchInput') renderSearch();
    });

    // empty search should not leave the page
    document.addEventListener('submit', function (e) {
        if (e.target.id === 'searchForm' && !$('#searchInput').value.trim()) e.preventDefault();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeQuick();
            setSearch(false);
        }
    });

    /* ---------- Public API for the other scripts ---------- */
    window.MQ = {
        $: $, $$: $$, store: store, state: state, PROMO: PROMO, LINE: LINE,
        byId: byId, peso: peso, pesoD: pesoD, imgSlot: imgSlot, lineSub: lineSub,
        cartTotals: cartTotals, saveCart: saveCart, toast: toast,
        openQuick: openQuick, PRODUCTS: PRODUCTS, card: card, searchProducts: searchProducts,
        updateProfileBtn: updateProfileBtn, isSignedIn: isSignedIn,
        // runs fn for <body data-page="name">; if the page already booted, runs it now
        page: function (name, fn) {
            pages[name] = fn;
            if (booted && document.body.dataset.page === name) fn();
        },
        // registers a handler for clicks on [data-action="name"]
        action: function (name, fn) {
            actions[name] = fn;
        }
    };

    /* ---------- Boot ---------- */
    // pages with their own header and footer (our world) add data-own-chrome to <body>,
    // so the shared header and footer are not injected a second time
    if (!document.body.hasAttribute('data-own-chrome')) {
        document.body.insertAdjacentHTML('afterbegin', HEADER);
        document.body.insertAdjacentHTML('beforeend', FOOTER);
        // keep the typed search visible on the results page
        const sq = new URLSearchParams(location.search).get('q');
        if (sq && $('#searchInput')) $('#searchInput').value = sq;
    }
    const page = document.body.dataset.page;
    if (pages[page]) pages[page]();
    updateProfileBtn();
    badges();
    booted = true;

        // load profile.js (account popup) next to this file, unless the page already did
    loadProfileScript(function () {});
})();