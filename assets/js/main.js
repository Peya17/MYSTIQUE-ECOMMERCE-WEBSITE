(function () {
    'use strict';

    var M = window.Mystique;

    var SEE_MORE_URL = 'product.html',
        WISH_KEY = 'mystique_wish_v1';

    var PRODUCTS = M.PRODUCTS,
        byId = M.byId,
        ph = M.ph,
        th = M.th,
        peso = M.peso;

    var PRODUCT_IMAGES = [
        'download.jpg',
        'download(1).jpg',
        'download(5).jpg',
        'download(6).jpg',
        'download(7).jpg',
        'download(8).jpg'
];

// give each product an image, in the order they appear in PRODUCTS
PRODUCTS.forEach(function (p, i) {
    p.image = PRODUCT_IMAGES[i % PRODUCT_IMAGES.length];
});

    var CATS = [ //category info
        ['Lips', 'Velvet and satin finishes', 'lips'],
        ['Eyes', 'Palettes and liners', 'eyes'],
        ['Face', 'Tints, blush and glow', 'face'],
        ['Skincare', 'Gentle daily rituals', 'skincare']
    ];

    var TINT = { //category shades
        Lips: [''],
        Eyes:[''],
        Face: [''],
        Skincare: [''],
    };

    var $ = function (s, r) { //chooses first matching elements
        return (r || document).querySelector(s);
    };

    var $$ = function (s, r) { //shooses all matching elements
        return Array.prototype.slice.call(
            (r || document).querySelectorAll(s)
        );
    };

    $('#cats').innerHTML = CATS.map(function (c) {
        return '<button class="cat" data-cat="' + c[0] + '">' +
            ph(c[2] + '.jpg', TINT[c[0]], c[0]) +
            '<div class="cat-cap"><div><b>' + c[0] +
            '</b><small>' + c[1] +
            '</small></div><span></span></div></button>';
    }).join('');

    var heroImg = $('#heroImg');

    (function () {
        var i = new Image();

        i.src = M.IMAGE_DIR + '/assets/images/download.jpg';
        i.alt = '';

        i.onload = function () {
            i.style.cssText =
                'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';

            heroImg.insertBefore(i, heroImg.firstChild);
        };
    })();

    function stars(p) { //product ratings
        var f = Math.round(p.rating);

        return '<s>' + '★'.repeat(f) +
            '☆'.repeat(5 - f) +
            '</s> ' + p.rating.toFixed(1) +
            ' (' + p.reviews + ')';
    }

    $('#grid').innerHTML = PRODUCTS.map(function (p) {
        return '<article class="card" id="c-' + p.id +
            '" data-id="' + p.id + '">' +

            ph(p.image, p.tint, p.name, '', 'data-zoom="' + p.id + '"')
                .replace(
                    '</div>',
                    '<span class="tag">' + p.badge +
                    '</span><button class="heart" aria-label="Save to wishlist">' +
                    '<svg width="14" height="13" viewBox="0 0 24 22">' +
                    '<path d="M12 21C6 16 2 12.5 2 8.500A5.500 5.500 0 0112 5a5.500 5.500 0 0110 3.500C22 12.500 18 16 12 21z"/>' +
                    '</svg></button></div>'
                ) +

            '<div class="cinfo"><div class="stars">' +
            stars(p) +
            '</div>' +

            '<div class="crow"><h3>' + p.name +
            '</h3><span>' + peso(p.price) +
            '</span></div>' +

            '<div class="sw">' +
            p.colors.map(function (c) {
                return '<i style="background:' + c[1] +
                    '" title="' + c[0] + '"></i>';
            }).join('') +
            '</div>' +

            '<div class="acts">' +
            '<button class="b1" data-prev="' + p.id +
            '">Preview Product</button>' +
            '<button class="b2" data-add="' + p.id +
            '">Add to Bag</button>' +
            '</div></div></article>';
    }).join('');

    var modal = $('#modal'),
        lb = $('#lb');

    M.layers.push(modal, lb);

    lb.addEventListener('click', function (e) {
        if (!e.target.closest('.th')) {
            M.closeAll();
        }
    });

    function goto(id) { //directly navigate to a specific section
        var el = document.getElementById(id);

        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /*account*/
    //wishlist
    function wishKey() {
        var s = M.getSession(); //detects loggedin session

        return s ? WISH_KEY + ':' + s.email : WISH_KEY;
    }

    function paintWish() {
        var w = [];

        try {
            w = JSON.parse(localStorage.getItem(wishKey())) || [];
        } catch (e) {}

        $$('.card').forEach(function (c) {
            $('.heart', c).classList.toggle('on', w.indexOf(c.dataset.id) > -1);
        });
    }

    function saveWish() {
        var w = $$('.card').filter(function (c) {
            return $('.heart', c).classList.contains('on');
        }).map(function (c) {
            return c.dataset.id;
        });

        try {
            localStorage.setItem(wishKey(), JSON.stringify(w));
        } catch (e) {}
    }

    var eyebrow = $('.hero-l .eyebrow'),
        eyebrowDef = eyebrow.textContent;

    function personalize() { //changes if logged in or not
        var s = M.getSession();

        eyebrow.textContent = s ? 'Welcome back, ' + s.name : eyebrowDef;
        paintWish(); //retrieve n save wishlist of the user
    }

    document.addEventListener('mystique:authchange', personalize);

    personalize();

    /*image popup*/
    function preview(p) {
        var st = p.stock <= 0 //determine the stock
            ? ['out', 'Out of stock']
            : p.stock <= 5
                ? ['low', 'Low stock: ' + p.stock + ' left']
                : ['', 'In stock: ' + p.stock + ' available'];

        modal.innerHTML =
            '<button class="ibtn mx" data-close aria-label="Close preview">✕</button>' +
            th(p) +
            '<div class="mi"><span class="eyebrow">' + p.cat +
            '</span><h3>' + p.name +
            '</h3><p class="mp">' + peso(p.price) +
            '</p>' +
            '<div class="lbl">Stock</div><div class="stock ' +
            st[0] + '"><i></i><span>' + st[1] +
            '</span></div>' +
            '<div class="lbl">Available colors</div><div class="cols">' +
            p.colors.map(function (c) {
                return '<div class="col"><i style="background:' +
                    c[1] + '"></i>' + c[0] + '</div>';
            }).join('') +
            '</div>' +
            '<a class="btn-s" href="' + SEE_MORE_URL +
            '?item=' + p.id + '">Click to see more</a></div>';

        M.openL(modal); //product preview
    }

    function zoom(p) { //zooms in and out the img
        lb.innerHTML =
            '<button class="ibtn" data-close aria-label="Close image" style="color:#fff;font-size:18px">✕</button>' +
            th(p) +
            '<p>' + p.name + '</p>';

        M.openL(lb);
    }

    document.addEventListener('click', function (e) {
        var t;

        if ((t = e.target.closest('[data-add]'))) {
            M.add(t.dataset.add);
        } else if ((t = e.target.closest('[data-prev]'))) {
            preview(byId[t.dataset.prev]);
        } else if ((t = e.target.closest('[data-zoom]')) && !e.target.closest('.heart')) {
            zoom(byId[t.dataset.zoom]);
        } else if ((t = e.target.closest('.heart'))) {
            t.classList.toggle('on');
            saveWish(); //save users wishlist
        } else if ((t = e.target.closest('[data-goto]'))) {
            goto(t.dataset.goto);
        } else if ((t = e.target.closest('[data-cat]'))) {
            var f = PRODUCTS.filter(function (p) {
                return p.cat === t.dataset.cat;
            });

            if (f.length) {
                M.goProduct(f[0].id);
            } else {
                goto('products');
                M.toast('No ' + t.dataset.cat + ' products yet.');
            }
        }
    });

    $('#seeAll').addEventListener('click', function () {
        M.openSearch();
    });

    var shades = ['Midnight Mauve', 'Rosewood', 'Plum Velvet'],
        si = 0;

    $('#shadeBtn').addEventListener('click', function () {
        si = (si + 1) % shades.length;

        $('#shadeName').textContent = shades[si];
        $('.hero-note').textContent = 'Shade shown: ' + shades[si];
    });

    //arriving from a search made on another page (e.g. Our world)
    if (location.hash.indexOf('#c-') === 0) {
        setTimeout(function () {
            M.goProduct(location.hash.slice(3));
        }, 300);
    }
})();