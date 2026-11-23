/* MYSTIQUE — checkout (load AFTER general.js, which holds the shared bag)
   The order summary now reads the same saved bag as the cart page (MQ.state.cart),
   uses the same totals and promo code, and empties the bag when the order is placed. */
(function () {
    'use strict';

    var MQ = window.MQ;
    if (!MQ) {
        console.error('checkout.js needs general.js to load first.');
        return;
    }

    var $ = function (s, r) {
        return (r || document).querySelector(s);
    };

    var $$ = function (s, r) {
        return Array.prototype.slice.call(
            (r || document).querySelectorAll(s)
        );
    };

    var state = MQ.state;

    // drop anything in the bag that is no longer a real product (same rule as cart.js)
    state.cart = state.cart.filter(function (l) {
        return MQ.byId(l.id);
    });

    /* ---------- Empty bag: nothing to check out ---------- */
    if (!state.cart.length) {
        var layout = $('#checkout-layout');
        layout.classList.add('full');
        layout.innerHTML =
            '<section class="co-card">' +
            '<h1>Your bag is empty</h1>' +
            '<p class="subheading">Add something you love before checking out.</p>' +
            '<a class="main-button" href="shop.html" style="text-decoration:none">Find your little luxuries</a>' +
            '</section>';
        $('.steps').hidden = true;
        return;
    }

    var methods = {
        gcash: {
            title: 'GCash payment details',
            numberLabel: 'GCash number',
            number: '09XX XXX XXXX',
            copy: 'Copy GCash number',
            label: 'GCash',
            manual: true
        },
        maya: {
            title: 'Maya payment details',
            numberLabel: 'Maya number',
            number: '09XX XXX XXXX',
            copy: 'Copy Maya number',
            label: 'Maya',
            manual: true
        },
        bank: {
            title: 'Bank transfer details',
            numberLabel: 'Account number',
            number: 'XXXX XXXX XXXX',
            copy: 'Copy account number',
            label: 'Bank Transfer',
            manual: true
        },
        card: {
            label: 'Credit / Debit Card',
            manual: false
        },
        cod: {
            label: 'Cash on Delivery',
            manual: false
        }
    };

    var peso = MQ.pesoD;

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // one line of the bag, shaped for display
    function describe(l) {
        var p = MQ.byId(l.id);

        return {
            name: p.name,
            variation: l.shade ? 'Shade: ' + l.shade : MQ.lineSub(l, p),
            price: p.price,
            qty: l.qty
        };
    }

    var totals = function () {
        return MQ.cartTotals();
    };


    //display order
    function drawItems() {
        $('#order-items').innerHTML = state.cart.map(function (l, i) {
            var p = MQ.byId(l.id);
            var it = describe(l);

            return `
                <div class="order-item">
                    <div class="product-photo photo-img photo-tint">${MQ.imgSlot(p)}</div>

                    <div>
                        <div class="item-name">${esc(it.name)}</div>
                        <div class="item-variation">${esc(it.variation)}</div>

                        <div class="quantity-control">
                            <button type="button"
                                data-change="-1"
                                data-index="${i}"
                                aria-label="Decrease quantity of ${esc(it.name)}">
                                −
                            </button>

                            <span aria-live="polite">${it.qty}</span>

                            <button type="button"
                                data-change="1"
                                data-index="${i}"
                                aria-label="Increase quantity of ${esc(it.name)}">
                                +
                            </button>
                        </div>
                    </div>

                    <div class="item-price">
                        ${peso(it.price * it.qty)}
                    </div>
                </div>
            `;
        }).join('');

        var t = totals();

        $('#subtotal').textContent = peso(t.sub);
        $('#shipping-fee').textContent = peso(t.ship);
        $('#discount-row').hidden = !t.disc;
        $('#discount').textContent = '−' + peso(t.disc);
        $('#total').textContent = peso(t.total);
        $('#amount-due').textContent = peso(t.total);
        $('#cod-amount').textContent = peso(t.total);
    }


    //item quantity (saved back to the shared bag, so the cart page matches)
    $('#order-items').addEventListener('click', function (e) {
        var b = e.target.closest('[data-change]');

        if (!b) return;

        var l = state.cart[+b.dataset.index];

        l.qty = Math.min(
            99,
            Math.max(1, l.qty + +b.dataset.change)
        );

        MQ.saveCart();
        drawItems();

        var f = $(
            '[data-index="' + b.dataset.index +
            '"][data-change="' + b.dataset.change + '"]'
        );

        if (f) f.focus();
    });

    drawItems();


    //checkout tracker
    var stepOrder = [
        'delivery',
        'payment',
        'review',
        'confirmation'
    ];

    function goTo(step) {
        stepOrder.forEach(function (n) {
            $('#' + n + '-step').hidden = n !== step;
        });

        var idx = stepOrder.indexOf(step);

        stepOrder.forEach(function (n, i) {
            var li = $('#progress-' + n);
            var done = i < idx || idx === 3;

            li.classList.toggle(
                'current',
                i === idx && idx < 3
            );

            li.classList.toggle('done', done);

            $('.dot', li).textContent = done
                ? '✓'
                : String(i + 2);
        });

        $('#checkout-layout').classList.toggle(
            'full',
            step === 'confirmation'
        );

        $('#order-summary').hidden = step === 'confirmation';

        var h = $('h1', $('#' + step + '-step'));

        h.focus({ preventScroll: true });

        window.scrollTo(0, 0);
    }


    //validation
    function mark(el, bad) {
        var f = el.closest('.field');

        f.classList.toggle('bad', bad);

        el.setAttribute('aria-invalid', bad);
    }

    $$('.field input, .field textarea').forEach(function (i) {
        i.addEventListener('input', function () {
            if (i.closest('.field').classList.contains('bad')) {
                mark(i, false);
            }
        });
    });


    //delivery form
    $('#delivery-form').addEventListener('submit', function (e) {
        e.preventDefault();

        var first = null;
        var bad = false;

        function check(id, ok) {
            var el = $('#' + id);

            mark(el, !ok);

            if (!ok) {
                bad = true;
                first = first || el;
            }
        }

        check(
            'full-name',
            $('#full-name').value.trim().length > 1
        );

        check(
            'email-address',
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
                $('#email-address').value.trim()
            )
        );

        check(
            'contact-number',
            $('#contact-number').value.replace(/\D/g, '').length >= 10
        );

        check(
            'street-address',
            $('#street-address').value.trim().length > 4
        );

        check(
            'city',
            $('#city').value.trim() !== ''
        );

        check(
            'province',
            $('#province').value.trim() !== ''
        );

        check(
            'zip-code',
            /^\d{4}$/.test($('#zip-code').value.trim())
        );

        if (bad) {
            first.focus();
            return;
        }

        goTo('payment');
    });


    //payment method
    function chosenMethod() {
        return $('input[name="payment-method"]:checked').value;
    }

    function showMethod() {
        var key = chosenMethod();
        var m = methods[key];

        $('#verification-panel').hidden = !m.manual;
        $('#card-panel').hidden = key !== 'card';
        $('#cod-panel').hidden = key !== 'cod';

        if (m.manual) {
            $('#method-title').textContent = m.title;
            $('#number-label').textContent = m.numberLabel;
            $('#account-number').textContent = m.number;
            $('#copy-button').textContent = m.copy;
        }
    }

    $$('input[name="payment-method"]').forEach(function (r) {
        r.addEventListener('change', showMethod);
    });

    showMethod();


    //back to delivery
    $('#back-to-delivery').addEventListener('click', function () {
        goTo('delivery');
    });


    //copy payment num
    $('#copy-button').addEventListener('click', function () {
        var b = this;
        var t = b.textContent;
        var n = $('#account-number').textContent;

        function done() {
            b.textContent = 'Copied ✓';

            setTimeout(function () {
                b.textContent = t;
            }, 1600);
        }

        try {
            navigator.clipboard.writeText(n).then(done, done);
        } catch (e) {
            done();
        }
    });


    //upload receipt
    var fileInput = $('#receipt-file');
    var box = $('#upload-box');
    var chosen = null;

    function setFile(file) {
        var okType = /\.(png|jpe?g|pdf)$/i.test(file.name);
        var okSize = file.size <= 5 * 1024 * 1024;

        if (!okType || !okSize) {
            chosen = null;
            box.classList.add('bad');
            $('#file-chosen').hidden = true;
            fileInput.value = '';
            return;
        }

        chosen = file;

        box.classList.remove('bad');

        $('#file-name').textContent =
            file.name + ' (' +
            (
                file.size / 1024 < 1024
                    ? Math.round(file.size / 1024) + ' KB'
                    : (file.size / 1048576).toFixed(1) + ' MB'
            ) +
            ')';

        $('#file-chosen').hidden = false;
    }

    fileInput.addEventListener('change', function () {
        if (fileInput.files[0]) {
            setFile(fileInput.files[0]);
        }
    });

    $('#remove-file').addEventListener('click', function () {
        chosen = null;
        fileInput.value = '';
        $('#file-chosen').hidden = true;
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
        box.addEventListener(ev, function (e) {
            e.preventDefault();
            box.classList.add('dragging');
        });
    });

    ['dragleave', 'drop'].forEach(function (ev) {
        box.addEventListener(ev, function (e) {
            e.preventDefault();
            box.classList.remove('dragging');
        });
    });

    box.addEventListener('drop', function (e) {
        if (e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    });


    //review
    function rows(target, list) {
        target.textContent = '';

        list.forEach(function (r) {
            if (!r[1]) return;

            var row = document.createElement('div');
            var l = document.createElement('span');
            var v = document.createElement('strong');

            row.className = 'detail-row';

            l.textContent = r[0];
            v.textContent = r[1];

            row.appendChild(l);
            row.appendChild(v);

            target.appendChild(row);
        });
    }

    function addressText() {
        return [
            $('#street-address').value.trim(),
            $('#city').value.trim(),
            $('#province').value.trim(),
            $('#zip-code').value.trim()
        ].join(', ');
    }


    //payment submission
    $('#payment-form').addEventListener('submit', function (e) {
        e.preventDefault();

        var key = chosenMethod();
        var m = methods[key];
        var t = totals();

        var bad = false;
        var first = null;

        if (m.manual) {
            if (!chosen) {
                box.classList.add('bad');
                bad = true;
                first = first || fileInput;
            }

            var ref = $('#reference-number');
            var date = $('#payment-date');

            mark(ref, ref.value.trim().length < 4);

            if (ref.value.trim().length < 4) {
                bad = true;
                first = first || ref;
            }

            mark(date, !date.value);

            if (!date.value) {
                bad = true;
                first = first || date;
            }
        }

        if (bad) {
            first.focus();
            return;
        }

        rows($('#review-delivery'), [
            ['Name', $('#full-name').value.trim()],
            ['Email', $('#email-address').value.trim()],
            ['Contact number', $('#contact-number').value.trim()],
            ['Address', addressText()],
            ['Instructions', $('#delivery-notes').value.trim()]
        ]);

        rows($('#review-payment'), [
            ['Method', m.label],
            ['Amount', peso(t.total)]
        ].concat(
            m.manual
                ? [
                    ['Receipt', chosen.name],
                    ['Reference number', $('#reference-number').value.trim()],
                    ['Date of payment', $('#payment-date').value]
                ]
                : key === 'card'
                    ? [
                        ['Next step', 'Secure card payment after you submit']
                    ]
                    : [
                        ['Pay on delivery', peso(t.total)]
                    ]
        ));

        goTo('review');
    });


    //edit details
    $$('[data-edit]').forEach(function (b) {
        b.addEventListener('click', function () {
            goTo(b.dataset.edit);
        });
    });

    $('#back-to-payment').addEventListener('click', function () {
        goTo('payment');
    });

    $('#order-terms').addEventListener('change', function () {
        $('#terms-error').classList.remove('show');
    });


    // SUBMIT ORDER
    $('#submit-order').addEventListener('click', function () {
        if (!$('#order-terms').checked) {
            $('#terms-error').classList.add('show');
            $('#order-terms').focus();
            return;
        }

        var btn = this;
        var label = btn.textContent;
        var key = chosenMethod();
        var m = methods[key];
        var t = totals();

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';

        var order = {
            number: 'MC-2026-' + String(Math.floor(Math.random() * 9000) + 1000),

            placedAt: new Date().toISOString(),

            customer: {
                name: $('#full-name').value.trim(),
                email: $('#email-address').value.trim(),
                phone: $('#contact-number').value.trim(),
                address: addressText(),
                notes: $('#delivery-notes').value.trim()
            },

            items: state.cart.map(function (l) {
                var d = describe(l);

                return {
                    id: l.id,
                    name: d.name,
                    variation: d.variation,
                    price: d.price,
                    qty: d.qty
                };
            }),

            payment: {
                method: key,
                reference: m.manual
                    ? $('#reference-number').value.trim()
                    : null,
                paidOn: m.manual
                    ? $('#payment-date').value
                    : null,
                receiptFile: m.manual && chosen
                    ? chosen.name
                    : null
            },
            promo: t.disc ? state.promo : null,
            subtotal: t.sub,
            shippingFee: t.ship,
            discount: t.disc,
            total: t.total
        };

        window.lastOrder = order;

        setTimeout(function () {
            btn.disabled = false;
            btn.textContent = label;

            $('#order-number').textContent = order.number;
            $('#confirm-method').textContent = m.label;
            $('#confirm-total').textContent = peso(order.total);
            $('#confirm-address').textContent = order.customer.address;
            $('#confirm-email').textContent = order.customer.email;

            $('#confirm-status').textContent = m.manual
                ? 'Under verification'
                : key === 'cod'
                    ? 'Pay on delivery'
                    : 'Paid';
            $('#confirm-message').textContent = m.manual
                ? 'We will notify you once your payment has been verified.'
                : key === 'cod'
                    ? 'Our courier will collect your payment when your order arrives.'
                    : 'Your payment was confirmed automatically. A receipt is on its way to your inbox.';

            rows(
                $('#confirm-items'),
                order.items.map(function (i) {
                    return [
                        i.qty + ' × ' + i.name + ' (' + i.variation + ')',
                        peso(i.price * i.qty)
                    ];
                }).concat([
                    ['Shipping fee', peso(order.shippingFee)]
                ]).concat(
                    order.discount
                        ? [['Promo ' + order.promo, '−' + peso(order.discount)]]
                        : []
                )
            );

            // the order is placed: keep a copy, then empty the shared bag
            var past = MQ.store.get('mq_orders', []);
            past.unshift(order);
            MQ.store.set('mq_orders', past);

            state.cart = [];
            state.promo = '';
            MQ.store.set('mq_promo', '');
            MQ.saveCart();

            goTo('confirmation');
        }, 1000);
    });

    //print order
    $('#print-order').addEventListener('click', function () {
        window.print();
    });

    $('#checkout-layout').classList.toggle('full', step === 'confirmation');
    $('#order-summary').hidden = step === 'confirmation';

})();