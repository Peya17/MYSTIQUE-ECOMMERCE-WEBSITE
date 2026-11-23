/* =========================================================
   MYSTIQUE — shop filter
   Loads AFTER general.js. It does not change general.js: it reads the
   product cards that general.js already drew and hides the ones that
   do not match. When the tabs redraw the grid, the filter re-applies.
   ========================================================= */
(function () {
    'use strict';

    /* ---------- Edit these two lists ---------- */
    // price ranges (min and max are inclusive). Prices in general.js are 1499 and 1599.
    var PRICE_RANGES = [
        { label: 'Under ₱1,500', min: 0, max: 1499 },
        { label: '₱1,500 and up', min: 1500, max: Infinity }
    ];
    // swatch color for each color name (same hex values as general.js)
    var COLORS = {
        beige: '#D8C3A5', blue: '#6F8FB5', grey: '#9A9A9F',
        yellow: '#E3C65B', black: '#2A2226', green: '#4F6F58'
    };

    /* ---------- Elements ---------- */
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    var grids = [
        { grid: $('#newGrid'), empty: $('#newEmpty') },
        { grid: $('#bestGrid'), empty: $('#bestEmpty') }
    ].filter(function (g) { return g.grid; });
    if (!grids.length) return;

    var btn = $('#filterBtn');
    var slide = $('#filterSlide');
    var countEl = $('#filterCount');
    var priceBox = $('#priceChips');
    var colorBox = $('#colorChips');

    var state = { price: [], color: [] };   // price holds indexes into PRICE_RANGES

    /* ---------- Read a card ---------- */
    // color comes from the product id ("emy-beige" -> "beige"), price from the card text
    function info(card) {
        var el = card.querySelector('[data-id]');
        var id = el ? el.dataset.id : '';
        var dash = id.indexOf('-');
        var m = (card.querySelector('.card-meta') || { textContent: '' }).textContent.match(/₱([\d,]+)/);
        return {
            color: dash > -1 ? id.slice(dash + 1) : '',
            price: m ? parseInt(m[1].replace(/,/g, ''), 10) : null
        };
    }

    function matches(i) {
        var priceOk = !state.price.length || state.price.some(function (idx) {
            var r = PRICE_RANGES[idx];
            return i.price !== null && i.price >= r.min && i.price <= r.max;
        });
        var colorOk = !state.color.length || state.color.indexOf(i.color) > -1;
        return priceOk && colorOk;
    }

    /* ---------- Apply the filter ---------- */
    function apply() {
        grids.forEach(function (g) {
            var cards = $$('.card', g.grid);
            var shown = 0;
            cards.forEach(function (c) {
                var ok = matches(info(c));
                c.classList.toggle('is-filtered', !ok);
                if (ok) shown++;
            });
            if (g.empty) g.empty.hidden = !(cards.length > 0 && shown === 0);
        });

        var n = state.price.length + state.color.length;
        countEl.textContent = n;
        countEl.hidden = n === 0;
    }

    /* ---------- Chips ---------- */
    function chip(label, on, dot) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (on ? ' on' : '');
        b.setAttribute('aria-pressed', on);
        b.innerHTML = (dot ? '<i class="chip-dot" style="background:' + dot + '"></i>' : '') + label;
        return b;
    }

    function toggle(list, v, b) {
        var i = list.indexOf(v);
        if (i > -1) list.splice(i, 1); else list.push(v);
        b.classList.toggle('on', i === -1);
        b.setAttribute('aria-pressed', i === -1);
        apply();
    }

    function buildPriceChips() {
        priceBox.innerHTML = '';
        PRICE_RANGES.forEach(function (r, idx) {
            var b = chip(r.label, state.price.indexOf(idx) > -1);
            b.addEventListener('click', function () { toggle(state.price, idx, b); });
            priceBox.appendChild(b);
        });
    }

    // only offer colors that the bags on the page actually come in
    function buildColorChips() {
        var found = {};
        grids.forEach(function (g) {
            $$('.card', g.grid).forEach(function (c) { found[info(c).color] = true; });
        });
        state.color = state.color.filter(function (c) { return found[c]; });

        colorBox.innerHTML = '';
        Object.keys(COLORS).forEach(function (name) {
            if (!found[name]) return;
            var label = name.charAt(0).toUpperCase() + name.slice(1);
            var b = chip(label, state.color.indexOf(name) > -1, COLORS[name]);
            b.addEventListener('click', function () { toggle(state.color, name, b); });
            colorBox.appendChild(b);
        });
    }

    /* ---------- Open / close, clear ---------- */
    btn.addEventListener('click', function () {
        var open = slide.classList.toggle('open');
        slide.inert = !open;
        btn.setAttribute('aria-expanded', open);
    });

    $('#filterClear').addEventListener('click', function () {
        state.price = [];
        state.color = [];
        buildPriceChips();
        buildColorChips();
        apply();
    });

    /* ---------- Re-apply whenever general.js redraws a grid (tabs) ---------- */
    var obs = new MutationObserver(function () { buildColorChips(); apply(); });
    grids.forEach(function (g) { obs.observe(g.grid, { childList: true }); });

    /* ---------- Start ---------- */
    buildPriceChips();
    buildColorChips();
    apply();
})();