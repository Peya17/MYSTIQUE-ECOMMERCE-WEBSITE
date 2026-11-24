/* =========================================================
   MYSTIQUE — shared data layer (load on the storefront AND the admin)
   Collections (all stored as localStorage "mq_<name>"):
     orders, deliveries, returns, catalog, vlogs, stocklog, users
   Real time:
     - same browser / other tabs: BroadcastChannel + storage event (works out of the box)
     - other devices: set BEFORE loading this file
         window.MQ_SERVER = { ws: 'wss://yourhost/live', api: 'https://yourhost/api' };
       ws  -> server pushes {k:'orders', v:[...]} whenever a customer changes something
       api -> every write is also sent as PUT {api}/{collection} (JSON body)
   The server should assign order IDs and be the source of truth in production.
   ========================================================= */
(function () {
    'use strict';
    const CFG = window.MQ_SERVER || {};
    const subs = [];
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('mq-sync') : null;

    const get = (k, d) => { try { const v = localStorage.getItem('mq_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
    const emit = k => subs.forEach(f => f(k));

    function set(k, v, fromServer) {
        try { localStorage.setItem('mq_' + k, JSON.stringify(v)); }
        catch (e) { alert('Browser storage is full. Photos are too large to save.'); return false; }
        if (bc) bc.postMessage(k);
        if (CFG.api && !fromServer) {
            fetch(CFG.api + '/' + k, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) }).catch(() => {});
        }
        emit(k);
        return true;
    }

    window.addEventListener('storage', e => { if (e.key && e.key.indexOf('mq_') === 0) emit(e.key.slice(3)); });
    if (bc) bc.onmessage = e => emit(e.data);
    if (CFG.ws) {
        const connect = () => {
            const ws = new WebSocket(CFG.ws);
            ws.onmessage = e => { try { const m = JSON.parse(e.data); set(m.k, m.v, true); } catch (x) { /* ignore */ } };
            ws.onclose = () => setTimeout(connect, 3000);
        };
        connect();
    }

    const nextNum = (list, prefix, start) =>
        list.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0), start) + 1;

    // shrink a chosen photo so it fits in storage; resolves [{src, caption}]
    function readPhotos(files) {
        return Promise.all(Array.from(files || []).map(f => new Promise(res => {
            const r = new FileReader();
            r.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const s = Math.min(1, 900 / Math.max(img.width, img.height));
                    const c = document.createElement('canvas');
                    c.width = Math.round(img.width * s);
                    c.height = Math.round(img.height * s);
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    res({ src: c.toDataURL('image/jpeg', 0.7), caption: f.name });
                };
                img.src = r.result;
            };
            r.readAsDataURL(f);
        })));
    }

    window.MQSync = {
        get: get, set: set, readPhotos: readPhotos,
        subscribe: f => subs.push(f),

        /* ---- STOREFRONT CALLS ----
           order = { customer:{email,name,phone,address}, payment:'GCash', shipping:120, total:1619,
                     items:[{id,name,price,qty,shade}] }                                         */
        pushOrder(order) {
            const list = get('orders', []);
            const o = Object.assign({ id: 'MC-' + nextNum(list, 'MC', 1000), date: new Date().toISOString(), status: 'Pending' }, order);
            list.unshift(o);
            set('orders', list);
            return o;
        },
        // proof of delivery photos uploaded by the customer (photos from readPhotos)
        pushProof(orderId, photos) {
            const list = get('deliveries', []);
            list.unshift({ id: 'DC-' + nextNum(list, 'DC', 3000), order: orderId, uploaded: new Date().toISOString(), status: 'Pending', photos: photos });
            set('deliveries', list);
        },
        // { order, reason, comment, photos }
        pushReturn(r) {
            const list = get('returns', []);
            list.unshift(Object.assign({ id: 'RR-' + nextNum(list, 'RR', 2000), filed: new Date().toISOString(), status: 'Pending' }, r));
            set('returns', list);
        }
    };
})();