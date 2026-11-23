/* =========================================================
   MYSTIQUE — wishlist page script (standalone)
   Does not need script.js. It reads and writes the same saved data
   ("mq_cart", "mq_wish"), so the bag and wishlist counts stay in sync
   with every other page.
   ========================================================= */
(function () {
    'use strict';

    // folder that holds every product photo (same as script.js)
    var IMG_BASE = 'assets/images/images/';

    var LINE = { emy: 'Emy Line', seffy: 'Seffy Line' };
    var SHORT = { emy: 'Everyday elegance in vegan leather.', seffy: 'Sleek, structured and made to last.' };

    function bag(line, colorName, color, price, reviews) {
        var name = (line === 'emy' ? 'Emy ' : 'Seffy ') + colorName;
        var id = name.toLowerCase().replace(/ /g, '-');
        return { id: id, name: name, line: line, colorName: colorName, color: color,
                 price: price, rating: 4.8, reviews: reviews, img: id + '-1.jpg', short: SHORT[line] };
    }

    // keep in step with the product list in script.js
    var PRODUCTS = [
        bag('emy', 'Beige', '#D8C3A5', 1499, 128),
        bag('emy', 'Blue', '#6F8FB5', 1499, 96),
        bag('emy', 'Grey', '#9A9A9F', 1499, 64),
        bag('emy', 'Yellow', '#E3C65B', 1499, 52),
        bag('seffy', 'Black', '#2A2226', 1599, 110),
        bag('seffy', 'Green', '#4F6F58', 1599, 73)
    ];

    /* ---------- Helpers ---------- */
    function $(s, r) { return (r || document).querySelector(s); }
    function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
    function byId(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; }
    function pesoD(n) { return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function stars(p) { return '★★★★★ ' + p.rating.toFixed(1) + ' (' + p.reviews + ')'; }
    function heartSvg(s) {
        return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none"><path d="M12 20.5s-8-4.9-8-11A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8 2.9c0 6.1-8 11-8 11z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    }

    var store = {
        get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
        set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
    };

    var cart = store.get('mq_cart', []);
    var wish = store.get('mq_wish', []);

    /* ---------- Toast ---------- */
    var toastTimer;
    function toast(msg) {
        var t = $('.toast');
        if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
    }

    /* ---------- Badges, cart, wishlist ---------- */
    function badges(bump) {
        var count = cart.reduce(function (s, l) { return s + l.qty; }, 0);
        $$('[data-cart-count]').forEach(function (b) {
            b.textContent = count;
            if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
        });
        $$('[data-wish-count]').forEach(function (b) {
            b.textContent = wish.length;
            b.hidden = wish.length === 0;
        });
    }

    function addToCart(id) {
        var line = cart.filter(function (l) { return l.id === id && l.shade === ''; })[0];
        if (line) line.qty += 1; else cart.push({ id: id, shade: '', qty: 1 });
        store.set('mq_cart', cart);
        badges(true);
        toast('Added to your bag');
    }

    function removeFromWish(id) {
        wish = wish.filter(function (w) { return w !== id; });
        store.set('mq_wish', wish);
        badges();
    }

    /* ---------- Render ---------- */
    function wishCard(p) {
        return '<article class="wl-card">' +
            '<div class="wl-media">' +
                '<a href="product.html?id=' + p.id + '"><img src="' + IMG_BASE + p.img + '" alt="' + p.name + '" loading="lazy" onerror="this.style.display=\'none\'"></a>' +
                '<button type="button" class="wl-heart on" data-action="unwish" data-id="' + p.id + '" aria-label="Remove ' + p.name + ' from wishlist">' + heartSvg(18) + '</button>' +
            '</div>' +
            '<h3 class="wl-name">' + p.name + '</h3>' +
            '<p class="wl-line">' + LINE[p.line] + ' · ' + p.colorName + '</p>' +
            '<p class="wl-rating">' + stars(p) + '</p>' +
            '<div class="wl-price-row"><span class="wl-price">' + pesoD(p.price) + '</span><span class="wl-dot" style="background:' + p.color + '" title="' + p.colorName + '"></span></div>' +
            '<button type="button" class="wl-btn wl-btn-primary" data-action="add" data-id="' + p.id + '">Add to Bag</button>' +
            '<button type="button" class="wl-btn wl-btn-ghost" data-action="quick" data-id="' + p.id + '">Preview Product</button>' +
        '</article>';
    }

    function render() {
        var items = wish.map(byId).filter(Boolean);
        $('#wishGrid').innerHTML = items.length
            ? items.map(wishCard).join('')
            : '<p class="wl-empty">Nothing saved yet. Tap the heart on anything you love and it will wait for you here. <a href="shop.html">Browse the collection</a></p>';
    }

    /* ---------- Quick view ---------- */
    function ensureModal() {
        if ($('#qv')) return;
        document.body.insertAdjacentHTML('beforeend',
            '<div class="wl-modal" id="qv" aria-hidden="true">' +
            '<div class="wl-modal-box" role="dialog" aria-modal="true" aria-label="Quick view">' +
            '<button type="button" class="wl-modal-close" data-action="close" aria-label="Close">×</button>' +
            '<div class="wl-modal-img"><img id="qvImg" alt=""></div>' +
            '<div class="wl-modal-panel">' +
            '<h2 id="qvName"></h2><p class="wl-rating" id="qvRate"></p>' +
            '<p class="wl-modal-desc" id="qvDesc"></p><p class="wl-modal-price" id="qvPrice"></p>' +
            '<button type="button" class="wl-btn wl-btn-primary" id="qvAdd" data-action="add">Add to Bag</button>' +
            '<a class="wl-btn wl-btn-ghost wl-modal-more" id="qvMore" href="#">View full details →</a>' +
            '</div></div></div>');
    }

    function openQuick(id) {
        var p = byId(id);
        if (!p) return;
        ensureModal();
        var img = $('#qvImg');
        img.style.display = '';
        img.onerror = function () { img.style.display = 'none'; };
        img.src = IMG_BASE + p.img;
        img.alt = p.name;
        $('#qvName').textContent = p.name;
        $('#qvRate').textContent = stars(p);
        $('#qvDesc').innerHTML = LINE[p.line] + ' · ' + p.colorName + '<br>' + p.short;
        $('#qvPrice').textContent = pesoD(p.price);
        $('#qvAdd').dataset.id = id;
        $('#qvMore').href = 'product.html?id=' + id;
        $('#qv').classList.add('open');
        $('#qv').setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeQuick() {
        var m = $('#qv');
        if (!m) return;
        m.classList.remove('open');
        m.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    /* ---------- Clicks ---------- */
    document.addEventListener('click', function (e) {
        if (e.target.id === 'qv') { closeQuick(); return; }
        var el = e.target.closest('[data-action]');
        if (!el) return;
        var a = el.dataset.action;
        var id = el.dataset.id;

        if (a === 'unwish') { removeFromWish(id); render(); toast('Removed from your wishlist'); }
        else if (a === 'add') { addToCart(id); }
        else if (a === 'quick') { openQuick(id); }
        else if (a === 'close') { closeQuick(); }
        else if (a === 'soon') { toast(el.dataset.msg || 'Coming soon'); }
    });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeQuick(); });

    /* ---------- Boot ---------- */
    render();
    badges();
})();