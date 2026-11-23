/* MYSTIQUE — cart (load after general.js) */
(function () {
    'use strict';
    const MQ = window.MQ;
    const $ = MQ.$;
    const state = MQ.state;

    function render() {
        state.cart = state.cart.filter(l => MQ.byId(l.id));

        $('#cartList').innerHTML = state.cart.length ? state.cart.map((l, i) => {
            const p = MQ.byId(l.id);
            return '<div class="cart-item">' + MQ.imgSlot(p) + '<div>' +
                '<h3>' + p.name + '</h3><p class="sub">' + MQ.lineSub(l, p) + '</p><p class="price">' + MQ.pesoD(p.price) + '</p>' +
                '<div class="cart-item-foot"><div class="qty">' +
                '<button type="button" data-action="line" data-i="' + i + '" data-d="-1" aria-label="Decrease quantity">−</button><span>' + l.qty + '</span>' +
                '<button type="button" data-action="line" data-i="' + i + '" data-d="1" aria-label="Increase quantity">+</button></div>' +
                '<button type="button" class="remove-btn" data-action="remove" data-i="' + i + '">Remove</button></div></div></div>';
        }).join('') : '<p class="empty">Your bag is empty. <a href="shop.html">Find your little luxuries</a></p>';

        $('#sumItems').innerHTML = state.cart.map(l => {
            const p = MQ.byId(l.id);
            return '<div class="sum-item">' + MQ.imgSlot(p) + '<div><h4>' + p.name + '</h4><small>' + MQ.lineSub(l, p) + '</small>' +
                '<div class="sum-row"><span>Qty: ' + l.qty + '</span><span>' + MQ.pesoD(p.price * l.qty) + '</span></div></div></div>';
        }).join('');

        const t = MQ.cartTotals();
        $('#tSub').textContent = MQ.pesoD(t.sub).replace('₱', '₱ ');
        $('#tShip').textContent = MQ.pesoD(t.ship);
        $('#tDisc').textContent = '−₱ ' + t.disc.toLocaleString('en-PH', { minimumFractionDigits: 2 });
        $('#tTotal').textContent = MQ.pesoD(t.total);
        $('#toDelivery').disabled = !state.cart.length;
        $('#promoInput').value = state.promo;
        MQ.saveCart();
    }

    MQ.page('cart', render);

    MQ.action('line', function (el) {
        const l = state.cart[el.dataset.i];
        l.qty = Math.max(1, l.qty + parseInt(el.dataset.d, 10));
        render();
    });

    MQ.action('remove', function (el) {
        state.cart.splice(el.dataset.i, 1);
        render();
    });

    MQ.action('promo', function () {
        const code = $('#promoInput').value.trim().toUpperCase();
        if (code === MQ.PROMO.code) {
            state.promo = code;
            MQ.store.set('mq_promo', code);
            MQ.toast('Promo code applied');
        } else {
            state.promo = '';
            MQ.store.set('mq_promo', '');
            MQ.toast(code ? 'That code is not valid' : 'Enter a promo code');
        }
        render();
    });
})();