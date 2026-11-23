/* MYSTIQUE — product details (load after general.js) */
(function () {
    'use strict';
    const MQ = window.MQ;
    const $ = MQ.$, $$ = MQ.$$;

    MQ.page('product', function () {
        const root = $('#productRoot');
        const p = MQ.byId(new URLSearchParams(location.search).get('id')) || MQ.PRODUCTS[0];
        const on = MQ.state.wish.indexOf(p.id) > -1;
        document.title = p.name + ' | mystique';

        const shadeBlock = '<p class="label">Color / ' + p.colorName + '</p><div class="swatches">' +
            MQ.PRODUCTS.filter(x => x.line === p.line).map(x =>
                '<a class="swatch' + (x.id === p.id ? ' active' : '') + '" href="product.html?id=' + x.id + '" style="background:' + x.color + '" aria-label="' + x.colorName + '"></a>'
            ).join('') + '</div>';

        root.innerHTML =
            '<p class="crumbs"><a href="shop.html">Shop</a> / ' + MQ.LINE[p.line] + ' / ' + p.name + '</p>' +
            '<div class="pd"><div>' +
            '<div class="img-slot pd-photo"><img id="pdMain" src="images/' + p.img + '" alt="' + p.name + '" onerror="this.style.display=\'none\'"></div>' +
            '<div class="thumbs">' + Array.from({ length: p.photos }, (_, i) => i + 1).map(n =>
                '<button type="button" class="thumb' + (n === 1 ? ' active' : '') + '" data-action="thumb" data-id="' + p.id + '" data-n="' + n + '" data-last="' + (n === p.photos ? 1 : 0) + '" aria-label="Show photo ' + n + '">' +
                '<img src="images/' + p.id + '-' + n + '.jpg" alt="" onerror="this.style.display=\'none\'"></button>').join('') + '</div>' +
            '<p class="pd-tagline">The Mystique Edit · a touch of everyday luxury</p>' +
            '<div class="pd-details"><h3>Details &amp; care</h3><p>' + p.how + '</p></div></div>' +
            '<div class="panel pd-panel"><h1>' + p.name + '</h1>' +
            '<p class="rating">' + MQ.stars(p).replace(' (', ' · ').replace(')', ' reviews') + '</p>' +
            '<p class="pd-price">' + MQ.pesoD(p.price) + '</p><p class="pd-desc">' + p.desc + '</p>' +
            shadeBlock +
            '<p class="label">Quantity</p><div class="qty"><button type="button" data-action="qty" data-d="-1" aria-label="Decrease quantity">−</button><span id="qtyVal">1</span><button type="button" data-action="qty" data-d="1" aria-label="Increase quantity">+</button></div>' +
            '<div class="pd-actions"><button type="button" class="btn btn-primary" data-action="addqty" data-id="' + p.id + '">Add to Bag →</button>' +
            '<button type="button" class="btn btn-ghost wish-square' + (on ? ' on' : '') + '" data-action="wish" data-id="' + p.id + '" aria-pressed="' + on + '" aria-label="Save to wishlist">' + MQ.heartSvg(22) + '</button></div>' +
            '<p class="perks">Vegan leather · Scratchproof · Concealed hardware</p></div></div>';
    });

            // ---------- Filterable collection (price + color) ----------
        root.insertAdjacentHTML('beforeend', filterSectionHtml());
        renderGrid();

    MQ.action('addqty', function (el) {
        MQ.addToCart(el.dataset.id, '', parseInt($('#qtyVal').textContent, 10) || 1);
    });

    MQ.action('qty', function (el) {
        const q = $('#qtyVal');
        q.textContent = Math.max(1, (parseInt(q.textContent, 10) || 1) + parseInt(el.dataset.d, 10));
    });

    MQ.action('thumb', function (el) {
        const m = $('#pdMain');
        m.style.display = '';
        m.src = 'images/' + el.dataset.id + '-' + el.dataset.n + '.jpg';
        m.classList.toggle('contain', el.dataset.last === '1');
        $$('.thumb').forEach(t => t.classList.toggle('active', t === el));
    });

        /* ---------- Collection filters ---------- */
    const PRICE_RANGES = [
        ['500-1000',  '₱500 – ₱1,000'],
        ['1500-2000', '₱1,500 – ₱2,000'],
        ['2500-3000', '₱2,500 – ₱3,000']
    ];
    const picked = { price: [], color: [] };

    function colorOptions() {
        const seen = {};
        MQ.PRODUCTS.forEach(x => { seen[x.colorName] = x.color; });
        return Object.keys(seen).map(name => ({ name: name, hex: seen[name] }));
    }

    function filterSectionHtml() {
        return '<section class="collection">' +
            '<div class="collection-head"><h2>The Collection</h2>' +
            '<button type="button" class="btn btn-ghost" id="filterBtn" data-action="togglefilters" aria-expanded="false">Filter</button></div>' +
            '<div class="slide" id="filterSlide" inert><div>' +
            '<div class="panel filter-panel">' +
            '<fieldset><legend>Price</legend><div class="chips">' +
            PRICE_RANGES.map(r =>
                '<button type="button" class="chip" data-action="chip" data-group="price" data-v="' + r[0] + '">' + r[1] + '</button>'
            ).join('') + '</div></fieldset>' +
            '<fieldset><legend>Color</legend><div class="chips">' +
            colorOptions().map(c =>
                '<button type="button" class="chip" data-action="chip" data-group="color" data-v="' + c.name + '">' +
                '<i class="dot" style="background:' + c.hex + '"></i>' + c.name + '</button>'
            ).join('') + '</div></fieldset>' +
            '<button type="button" class="clear" data-action="clearfilters">Clear all</button>' +
            '</div></div></div>' +
            '<div class="fgrid" id="filterGrid"></div></section>';
    }

    function matches(x) {
        const priceOk = picked.price.length === 0 || picked.price.some(function (range) {
            const mm = range.split('-').map(Number);
            return x.price >= mm[0] && x.price <= mm[1];
        });
        const colorOk = picked.color.length === 0 || picked.color.indexOf(x.colorName) > -1;
        return priceOk && colorOk;
    }

    function renderGrid() {
        const grid = $('#filterGrid');
        if (!grid) return;
        const items = MQ.PRODUCTS.filter(matches);
        grid.innerHTML = items.length ? items.map(function (x) {
            return '<a class="fcard" href="product.html?id=' + x.id + '">' +
                '<div class="fcard-img"><img src="images/' + x.img + '" alt="' + x.name + '" onerror="this.style.display=\'none\'"></div>' +
                '<div class="fcard-meta"><span class="fcard-name">' + x.name + '</span>' +
                '<span class="fcard-price">' + MQ.pesoD(x.price) + ' · ' + x.colorName + '</span></div></a>';
        }).join('') : '<div class="fempty">Nothing matches these filters yet.</div>';
    }

    MQ.action('togglefilters', function (el) {
        const slide = $('#filterSlide');
        const open = slide.classList.toggle('open');
        slide.inert = !open;
        el.classList.toggle('on', open);
        el.setAttribute('aria-expanded', open);
    });

    MQ.action('chip', function (el) {
        const list = picked[el.dataset.group], v = el.dataset.v;
        const i = list.indexOf(v);
        if (i > -1) list.splice(i, 1); else list.push(v);
        el.classList.toggle('on');
        renderGrid();
    });

    MQ.action('clearfilters', function () {
        picked.price = [];
        picked.color = [];
        $$('.chip').forEach(function (c) { c.classList.remove('on'); });
        renderGrid();
    });
})();

