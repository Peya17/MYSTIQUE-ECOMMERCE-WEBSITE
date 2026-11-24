/* MystiqueCollections Admin: extension. Load AFTER the main inline script.
   All data comes from api/*.php and refreshes every 8 seconds. */
(() => {
  const call = (file, body) =>
    fetch("api/" + file, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
      .then((r) => { if (!r.ok) throw new Error(file + " " + r.status); return r.json(); });

  let proofs = [], moderators = [], settings = {}, offline = false;
  const lowAt = () => Number(settings.lowStock) || 10;
  const stamp = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
  const stockPill = (p) => p.stock <= 0 ? '<span class="pill rejected">Out of stock</span>' : p.stock <= lowAt() ? '<span class="pill pending">Low stock</span>' : '<span class="pill approved">In stock</span>';
  const STATUSES = ["Pending", "Paid", "Packed", "Shipped", "Delivered", "Cancelled"];
  const cName = (o) => (customerById(o.customer) || { name: "Unknown" }).name;

  /* ---------- sidebar and menus ---------- */
  Object.assign(screenNames, { products: "Products", inventory: "Inventory Management", orders: "Orders", proofs: "Payment Proofs" });
  const links = { "products.html": "products", "inventory.html": "inventory", "orders.html": "orders" };
  $$("a[href$='.html']").forEach((a) => {
    const r = links[a.getAttribute("href")];
    if (r) {
      a.setAttribute("href", "#/" + r);a
      if (a.classList.contains("nav")) a.dataset.route = r;
    }
  });

  $(".sidebar .nav[data-route='verification']").insertAdjacentHTML("afterend",
    '<a class="nav" href="#/proofs" data-route="proofs"><svg class="icon"><use href="#i-receipt"/></svg>Payment Proofs</a>');

  $(".small-panel").innerHTML =
    '<button type="button" class="row" data-open="settings"><svg class="icon-small"><use href="#i-settings"/></svg>Settings</button>' +
    '<button type="button" class="row" data-open="mods"><svg class="icon-small"><use href="#i-users"/></svg>Moderators</button>' +
    '<a class="row" href="logout.php"><svg class="icon-small"><use href="#i-logout"/></svg>Log out</a>';

  /* ---------- screens ---------- */
  const head = (t, sub, extra) => `<div class="page-head"><div><h1 class="welcome">${t}</h1><p class="subtext">${sub}</p></div>${extra || ""}</div>`;
  const table = (cols, id) => `<div class="box"><div class="table-wrap"><table class="stack"><thead><tr>${cols.map((c) => "<th>" + c + "</th>").join("")}</tr></thead><tbody id="${id}"></tbody></table></div></div>`;

  $("main").insertAdjacentHTML("beforeend", `
    <section class="view soft" id="products">${head("Products", "Everything in your catalog.", '<button type="button" class="btn" data-act="add-product">Add product</button>')}
      ${table(["Name", "Price", "Stock", "Status", "Action"], "prod-rows")}</section>
    <section class="view soft" id="inventory">${head("Inventory Management", "Update stock; customer orders deduct automatically.")}
      <div class="cards cards-four">
        <div class="card"><span class="card-label">Products</span><span class="card-number" id="inv-all"></span></div>
        <div class="card"><span class="card-label">In Stock</span><span class="card-number" id="inv-in"></span></div>
        <div class="card"><span class="card-label">Low Stock</span><span class="card-number" id="inv-low"></span></div>
        <div class="card"><span class="card-label">Out of Stock</span><span class="card-number" id="inv-out"></span></div></div>
      ${table(["Product", "Stock", "Status", "Set new stock"], "inv-rows")}</section>
    <section class="view soft" id="orders">${head("Orders", "Update status as each order moves along.")}
      ${table(["Order ID", "Customer", "Date", "Total", "Payment", "Status", "Action"], "ord-rows")}</section>
    <section class="view soft" id="proofs">${head("Payment Proofs", "Receipts uploaded by customers. Click one to preview.",
      '<select class="select" id="proof-filter" aria-label="Filter proofs"><option value="">All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>')}
      <div class="proof-grid" id="proof-grid"></div></section>`);

  /* ---------- dialogs ---------- */
  document.body.insertAdjacentHTML("beforeend", `
    <dialog id="product-dialog"><form class="dialog-box" id="product-form"><h2 id="pf-title"></h2>
      <input type="hidden" id="pf-id"><label for="pf-name">Name</label><input class="search" id="pf-name" required>
      <label for="pf-price">Price (₱)</label><input class="search" id="pf-price" type="number" min="0" step="0.01" required>
      <label for="pf-stock">Stock</label><input class="search" id="pf-stock" type="number" min="0" step="1" required>
      <div class="dialog-actions"><button type="button" class="clear" data-close>Cancel</button><button class="btn">Save</button></div></form></dialog>
    <dialog id="proof-dialog" class="photo-dialog"><div class="dialog-box">
      <div class="dialog-head"><h2 id="pv-title"></h2><button type="button" class="icon-btn" data-close aria-label="Close"><svg class="icon"><use href="#i-close"/></svg></button></div>
      <img class="photo-large" id="pv-img" alt="Payment proof"><p class="dialog-text" id="pv-meta"></p>
      <div class="dialog-actions" id="pv-actions"></div></div></dialog>
    <dialog id="settings-dialog"><form class="dialog-box" id="settings-form"><h2>Settings</h2><div id="settings-fields"></div>
      <div class="dialog-actions"><button type="button" class="clear" data-close>Cancel</button><button class="btn">Save changes</button></div></form></dialog>
    <dialog id="mods-dialog"><div class="dialog-box"><div class="dialog-head"><h2>Moderators</h2><button type="button" class="icon-btn" data-close aria-label="Close"><svg class="icon"><use href="#i-close"/></svg></button></div>
      <div id="mod-list"></div>
      <form id="mod-form" class="dialog-box" style="padding:0"><label for="mod-name">Full name</label><input class="search" id="mod-name" required>
        <label for="mod-email">Email</label><input class="search" id="mod-email" type="email" required>
        <label for="mod-pass">Temporary password</label><input class="search" id="mod-pass" type="password" minlength="8" required>
        <label for="mod-role">Role</label><select class="select" id="mod-role"><option>Moderator</option><option>Administrator</option></select>
        <div class="dialog-actions"><button class="btn">Add person</button></div></form></div></dialog>`);

  const FIELDS = [
    ["storeName", "Store display name", "text"],
    ["shippingRegion", "Default shipping region", "text"],
    ["lowStock", "Low-stock threshold (units)", "number"],
    ["emailNotif", "Email notifications", "checkbox"],
    ["gcashMaya", "GCash and Maya payments", "checkbox"],
    ["cardsBank", "Cards and bank transfers", "checkbox"],
    ["receiptRequired", "Receipt verification required", "checkbox"],
    ["autoDeduct", "Automatic stock deduction", "checkbox"],
    ["twoStep", "Two-step admin verification", "checkbox"]
  ];

  /* ---------- rendering ---------- */
  function renderExtra() {
    $("#prod-rows").innerHTML = products.map((p) => `<tr><td data-label="Name" class="bold">${esc(p.name)}</td><td data-label="Price">${peso(p.price)}</td><td data-label="Stock">${p.stock}</td><td data-label="Status">${stockPill(p)}</td>
      <td data-label="Action"><button type="button" class="link" data-act="edit-product" data-id="${p.id}">Edit</button> <button type="button" class="link" data-act="del-product" data-id="${p.id}">Delete</button></td></tr>`).join("") || '<tr><td class="empty" colspan="5">No products yet.</td></tr>';

    const st = (p) => (p.stock <= 0 ? "out" : p.stock <= lowAt() ? "low" : "in");
    $("#inv-all").textContent = products.length;
    ["in", "low", "out"].forEach((k) => ($("#inv-" + k).textContent = products.filter((p) => st(p) === k).length));
    $("#inv-rows").innerHTML = products.map((p) => `<tr><td data-label="Product" class="bold">${esc(p.name)}</td><td data-label="Stock">${p.stock}</td><td data-label="Status">${stockPill(p)}</td>
      <td data-label="Set stock"><input class="search" style="width:90px;height:36px" type="number" min="0" value="${p.stock}" id="stk-${p.id}" aria-label="New stock for ${esc(p.name)}"> <button type="button" class="link" data-act="save-stock" data-id="${p.id}">Save</button></td></tr>`).join("");

    $("#ord-rows").innerHTML = newestFirst(orders).map((o) => `<tr><td data-label="Order ID" class="bold">${o.id}</td><td data-label="Customer">${esc(cName(o))}</td><td data-label="Date">${niceDate(o.date, true)}</td><td data-label="Total">${peso(orderTotal(o))}</td><td data-label="Payment">${o.payment}</td>
      <td data-label="Status"><select class="select" data-act="order-status" data-id="${o.id}" aria-label="Status of ${o.id}">${STATUSES.map((s) => `<option${s === o.status ? " selected" : ""}>${s}</option>`).join("")}</select></td><td data-label="Action">${viewLink("order", o.id)}</td></tr>`).join("") || '<tr><td class="empty" colspan="7">No orders yet.</td></tr>';

    const f = $("#proof-filter").value;
    const list = proofs.filter((p) => !f || p.status === f).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
    $("#proof-grid").innerHTML = list.map((p) => {
      const o = orderById(p.order);
      return `<button type="button" class="proof-card" data-act="open-proof" data-id="${p.id}"><img src="${esc(p.image_url)}" alt="Proof for ${esc(p.order)}" loading="lazy">
        <b>${esc(p.order)}</b><span>${o ? esc(cName(o)) : ""}</span><span>${stamp(p.uploaded_at)}</span><span class="pill ${p.status.toLowerCase()}">${p.status}</span></button>`;
    }).join("") || '<p class="empty-note">No proofs uploaded yet.</p>';

    const pend = proofs.filter((p) => p.status === "Pending").length, low = products.filter((p) => p.stock <= lowAt());
    $(".badge").textContent = pend + low.length;
    $(".badge").hidden = !(pend + low.length);
    $(".dropdown .panel").innerHTML = "<h4>Notifications</h4>" +
      (pend ? `<div class="note"><svg class="icon-small"><use href="#i-bag"/></svg><div>${plural(pend, "payment proof")} waiting for review</div></div>` : "") +
      low.map((p) => `<div class="note"><svg class="icon-small"><use href="#i-layers"/></svg><div>${esc(p.name)} is ${p.stock ? "low on stock (" + p.stock + " left)" : "out of stock"}</div></div>`).join("") +
      (pend + low.length ? "" : '<div class="note"><div>You are all caught up.</div></div>');

    $("#mod-list").innerHTML = moderators.map((m) => `<div class="note"><div><b>${esc(m.name)}</b> · ${esc(m.role)}<small>${esc(m.email)}</small></div><button type="button" class="link" style="margin-left:auto" data-act="rm-mod" data-id="${m.id}">Remove</button></div>`).join("") || '<p class="empty-note">No other people yet.</p>';
  }

  async function sync() {
    try {
      const d = await call("sync.php");
      products = d.products;
      customers = d.customers;
      orders = d.orders;
      proofs = d.proofs || [];
      moderators = d.moderators || [];
      settings = d.settings || {};
      employees = d.employees || [];
      currentEmployee = d.me || currentEmployee;

      const fix = (r) => {
        if (r.decision) r.decision.at = new Date(r.decision.at);
        return r;
      };
      deliveries = (d.deliveries || []).map(fix);
      returnRequests = (d.returnRequests || []).map(fix);
      logs.length = 0;
      deliveries.forEach((r) => r.decision && logs.push(logFor("delivery", r)));
      returnRequests.forEach((r) => r.decision && logs.push(logFor("return", r)));
      logs.sort((a, b) => b.at - a.at);

      renderDashboard();
      renderSales();
      renderCustomerCards();
      renderCustomers();
      renderVerification();
      renderExtra();

      const [, kind, id] = location.hash.split("/");
      if (kind === "order" && id) showOrder(decodeURIComponent(id));
      else if (kind === "customer" && id) showCustomer(decodeURIComponent(id));

      offline = false;
    } catch (e) {
      if (!offline) showToast("Connection lost. Retrying…");
      offline = true;
    }
  }

  const act = (file, body) => call(file, body).then(sync).catch(() => showToast("That did not save. Please try again."));

  /* ---------- actions ---------- */
  let openProof = null;
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act],[data-open],[data-close]");
    if (!t) return;
    if (t.matches("[data-close]")) return t.closest("dialog").close();

    if (t.dataset.open === "settings") {
      $("#settings-fields").innerHTML = FIELDS.map(([k, label, type]) => type === "checkbox"
        ? `<label class="setting" style="display:flex;justify-content:space-between;padding:8px 0">${label}<input type="checkbox" data-k="${k}"${settings[k] ? " checked" : ""}></label>`
        : `<label for="s-${k}">${label}</label><input class="search" id="s-${k}" type="${type}" data-k="${k}" value="${esc(settings[k] ?? "")}">`).join("");
      closeDropdowns();
      return $("#settings-dialog").showModal();
    }

    if (t.dataset.open === "mods") {
      closeDropdowns();
      return $("#mods-dialog").showModal();
    }

    const id = t.dataset.id, p = products.find((x) => x.id === id);
    if (t.dataset.act === "add-product" || t.dataset.act === "edit-product") {
      $("#pf-title").textContent = p ? "Edit product" : "Add product";
      $("#pf-id").value = id || "";
      $("#pf-name").value = p ? p.name : "";
      $("#pf-price").value = p ? p.price : "";
      $("#pf-stock").value = p ? p.stock : 0;
      $("#product-dialog").showModal();
    } else if (t.dataset.act === "del-product" && confirm("Delete " + p.name + "?")) act("products.php", { action: "delete", id });
    else if (t.dataset.act === "save-stock") act("products.php", { action: "stock", id, stock: Number($("#stk-" + id).value) });
    else if (t.dataset.act === "rm-mod" && confirm("Remove this person?")) act("moderators.php", { action: "remove", id });
    else if (t.dataset.act === "open-proof") {
      openProof = proofs.find((x) => x.id === id);
      $("#pv-title").textContent = "Order " + openProof.order;
      $("#pv-img").src = openProof.image_url;
      $("#pv-meta").textContent = "Uploaded " + stamp(openProof.uploaded_at) + " · " + openProof.status;
      $("#pv-actions").innerHTML = openProof.status === "Pending" ? '<button type="button" class="btn-reject" data-act="proof-no">Reject</button><button type="button" class="btn" data-act="proof-ok">Approve payment</button>' : "";
      $("#proof-dialog").showModal();
    } else if (t.dataset.act === "proof-ok" || t.dataset.act === "proof-no") {
      act("proofs.php", { id: openProof.id, status: t.dataset.act === "proof-ok" ? "Approved" : "Rejected" });
      $("#proof-dialog").close();
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.dataset.act === "order-status") act("orders.php", { id: e.target.dataset.id, status: e.target.value });
    if (e.target.id === "proof-filter") renderExtra();
  });

  $("#product-form").addEventListener("submit", (e) => {
    e.preventDefault();
    act("products.php", { action: "save", id: $("#pf-id").value || null, name: $("#pf-name").value.trim(), price: Number($("#pf-price").value), stock: Number($("#pf-stock").value) });
    $("#product-dialog").close();
  });

  $("#settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const s = {};
    $$("#settings-fields [data-k]").forEach((i) => (s[i.dataset.k] = i.type === "checkbox" ? i.checked : i.value));
    act("settings.php", s);
    $("#settings-dialog").close();
  });

  $("#mod-form").addEventListener("submit", (e) => {
    e.preventDefault();
    act("moderators.php", { action: "add", name: $("#mod-name").value.trim(), email: $("#mod-email").value.trim(), password: $("#mod-pass").value, role: $("#mod-role").value });
    e.target.reset();
  });

  // send the existing approve/reject decisions to the server too
  $("#decision-form").addEventListener("submit", () => {
    if (decision.rec && decision.rec.status !== "Pending")
      act("verification.php", { type: decision.type, id: decision.rec.id, status: decision.rec.status, remarks: decision.rec.decision.remarks });
  });

  ["#product-dialog", "#proof-dialog", "#settings-dialog", "#mods-dialog"].forEach((s) => $(s).addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  }));

  sync();
  setInterval(sync, 8000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
  route(true);
})();