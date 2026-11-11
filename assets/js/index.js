(function () {
    var $ = function (s, r) {
        return (r || document).querySelector(s);
    };

    var $$ = function (s, r) {
        return Array.prototype.slice.call(
            (r || document).querySelectorAll(s)
        );
    };

    var shippingFee = 120;

    var items = [
        {
            name: 'Velvet Lip Color',
            variation: 'Shade: Rosewood',
            price: 650,
            qty: 1,
            photo: 'photo-lipstick'
        },
        {
            name: 'Second Skin Tint',
            variation: 'Shade: 04 Warm Sand · 30 ml',
            price: 890,
            qty: 1,
            photo: 'photo-tint'
        },
        {
            name: 'Moonlit Eye Palette',
            variation: 'Shade: Dusk',
            price: 1190,
            qty: 1,
            photo: 'photo-palette'
        }
    ];

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

    var peso = function (n) {
        return '₱' + n.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    var subtotal = function () {
        return items.reduce(function (s, i) {
            return s + i.price * i.qty;
        }, 0);
    };

    var total = function () {
        return subtotal() + shippingFee;
    };


    //display order
    function drawItems() {
        $('#order-items').innerHTML = items.map(function (it, i) {
            return `
                <div class="order-item">
                    <div class="product-photo ${it.photo}"></div>

                    <div>
                        <div class="item-name">${it.name}</div>
                        <div class="item-variation">${it.variation}</div>

                        <div class="quantity-control">
                            <button type="button"
                                data-change="-1"
                                data-index="${i}"
                                aria-label="Decrease quantity of ${it.name}">
                                −
                            </button>

                            <span aria-live="polite">${it.qty}</span>

                            <button type="button"
                                data-change="1"
                                data-index="${i}"
                                aria-label="Increase quantity of ${it.name}">
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

        $('#subtotal').textContent = peso(subtotal());
        $('#shipping-fee').textContent = peso(shippingFee);
        $('#total').textContent = peso(total());
        $('#amount-due').textContent = peso(total());
        $('#cod-amount').textContent = peso(total());
    }


    //item quantity
    $('#order-items').addEventListener('click', function (e) {
        var b = e.target.closest('[data-change]');

        if (!b) return;

        var it = items[+b.dataset.index];

        it.qty = Math.min(
            10,
            Math.max(1, it.qty + +b.dataset.change)
        );

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
            ['Amount', peso(total())]
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
                        ['Pay on delivery', peso(total())]
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

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';

        var order = {
            number: 'ORD-2026-' +
                String(Math.floor(Math.random() * 900) + 100),

            placedAt: new Date().toISOString(),

            customer: {
                name: $('#full-name').value.trim(),
                email: $('#email-address').value.trim(),
                phone: $('#contact-number').value.trim(),
                address: addressText(),
                notes: $('#delivery-notes').value.trim()
            },

            items: items.map(function (i) {
                return {
                    name: i.name,
                    variation: i.variation,
                    price: i.price,
                    qty: i.qty
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
            subtotal: subtotal(),
            shippingFee: shippingFee,
            total: total()
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
                ])
            );
            goTo('confirmation');
        }, 1000);
    });

    //print order
    $('#print-order').addEventListener('click', function () {
        window.print();
    });

})();