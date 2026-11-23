/* MYSTIQUE — main page (load after general.js)
   general.js already draws the bestseller cards on this page (pages.home),
   so hearts, "View →" quick view and "Add to Bag" work without extra code here.
   This file only adds the hero behavior. */
(function () {
    'use strict';
    const MQ = window.MQ;
    const $ = MQ.$;
    const FEATURED = 'velvet-lip-color';

    // Hero: the glass label cycles through the shades of the featured product.
    // Clicking the hero image opens the quick view with that shade; its
    // "View full details" link goes to product.html with the shade pre-selected.
    function initHero() {
        const p = MQ.byId(FEATURED);
        const visual = $('.hero-visual');
        const button = $('#shadeBtn');
        const name = $('#shadeName');
        if (!p || !p.shades.length || !visual || !button || !name) return;

        let index = 0;
        const show = function () { name.textContent = p.shades[index].n; };
        show();

        button.addEventListener('click', function () {
            index = (index + 1) % p.shades.length;
            show();
        });

        visual.style.cursor = 'pointer';
        visual.addEventListener('click', function (e) {
            if (e.target.closest('#shadeBtn')) return;
            MQ.openQuick(FEATURED, p.shades[index].n);
        });
    }

    // runs when <body data-page="home">
    MQ.page('home', initHero);
})();