document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Menú móvil ---------- */
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Configuración editable ---------- */
  const BUSINESS_NAME = "Manos del Llano";
  const WHATSAPP_NUMBER = "573123310532"; // https://wa.me/573123310532
  const STORAGE_KEY = "manosdelllano_carrito_v1"; // solo guarda { idProducto: cantidad }
  const MAX_QTY = 99;

  const money = n => "$" + n.toLocaleString("es-CO");
  const $ = id => document.getElementById(id);

  /* ---------- Catálogo (leído de las tarjetas: data-id, data-name, data-price) ---------- */
  const catalog = {};
  document.querySelectorAll(".product-card[data-id]").forEach(card => {
    const price = Number(card.dataset.price);
    if (Number.isFinite(price) && price > 0) {
      catalog[card.dataset.id] = { id: card.dataset.id, name: card.dataset.name, price };
    }
  });

  /* ---------- Estado ---------- */
  let cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    Object.keys(saved).forEach(id => {
      const q = saved[id];
      if (catalog[id] && Number.isInteger(q) && q > 0) cart[id] = Math.min(q, MAX_QTY);
    });
  } catch (e) { cart = {}; }

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
  };
  const lines = () => Object.keys(cart).map(id => ({ ...catalog[id], qty: cart[id], sub: catalog[id].price * cart[id] }));
  const totals = () => lines().reduce((t, l) => ({ units: t.units + l.qty, total: t.total + l.sub }), { units: 0, total: 0 });

  /* ---------- Acciones ---------- */
  const setQty = (id, q) => {
    if (!catalog[id]) return;
    if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, MAX_QTY);
    save(); render();
  };
  const add = id => setQty(id, (cart[id] || 0) + 1);
  const clear = () => { cart = {}; save(); render(); };

  /* ---------- Render ---------- */
  const list = $("cart-items");
  function render() {
    const { units, total } = totals();
    $("cart-count").textContent = units;
    $("cart-units").textContent = units;
    $("cart-total").textContent = money(total);
    $("cart-empty").hidden = units > 0;
    $("cart-whatsapp").disabled = units === 0;
    $("cart-clear").disabled = units === 0;
    list.textContent = "";
    lines().forEach(l => {
      const li = document.createElement("li");
      li.className = "cart-item";
      const top = document.createElement("div");
      top.className = "cart-item-top";
      const nm = document.createElement("span"); nm.textContent = l.name;
      const sb = document.createElement("span"); sb.textContent = money(l.sub);
      top.append(nm, sb);
      const unit = document.createElement("p");
      unit.className = "cart-item-unit";
      unit.textContent = money(l.price) + " c/u";
      const row = document.createElement("div");
      row.className = "cart-item-row";
      const qty = document.createElement("div");
      qty.className = "qty";
      const minus = document.createElement("button");
      minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", "Disminuir cantidad de " + l.name);
      minus.addEventListener("click", () => setQty(l.id, l.qty - 1));
      const num = document.createElement("span"); num.textContent = l.qty;
      const plus = document.createElement("button");
      plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", "Aumentar cantidad de " + l.name);
      plus.addEventListener("click", () => setQty(l.id, l.qty + 1));
      qty.append(minus, num, plus);
      const rm = document.createElement("button");
      rm.type = "button"; rm.className = "cart-remove"; rm.textContent = "Eliminar";
      rm.setAttribute("aria-label", "Eliminar " + l.name);
      rm.addEventListener("click", () => setQty(l.id, 0));
      row.append(qty, rm);
      li.append(top, unit, row);
      list.append(li);
    });
  }

  /* ---------- Panel lateral ---------- */
  const drawer = $("cart-drawer"), overlay = $("cart-overlay");
  function openCart() {
    $("cart-msg").textContent = "";
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    $("cart-close").focus();
  }
  function closeCart() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
    $("cart-toggle").focus();
  }
  $("cart-toggle").addEventListener("click", openCart);
  $("open-cart-cta").addEventListener("click", openCart);
  $("cart-close").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && drawer.classList.contains("open")) closeCart(); });
  $("cart-clear").addEventListener("click", clear);

  document.querySelectorAll(".product-card[data-id] .btn-add").forEach(btn => {
    btn.addEventListener("click", () => {
      add(btn.closest(".product-card").dataset.id);
      const old = btn.textContent;
      btn.textContent = "Agregado ✓";
      setTimeout(() => { btn.textContent = old; }, 900);
    });
  });

  /* ---------- WhatsApp ---------- */
  const waLink = text => "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);

  function buildMessage() {
    const { units, total } = totals();
    const out = [
      "Hola, quiero hacer un pedido en " + BUSINESS_NAME + ":",
      ""
    ];
    lines().forEach(l => {
      out.push("• " + l.qty + " x " + l.name + " — " + money(l.price) + " c/u = " + money(l.sub));
    });
    out.push("", "Unidades: " + units, "TOTAL: " + money(total), "",
      "Mi nombre: ",
      "Dirección o modalidad de entrega (domicilio / recoger): ",
      "Observaciones (opcional): ");
    return out.join("\n");
  }

  $("cart-whatsapp").addEventListener("click", () => {
    const msg = $("cart-msg");
    if (totals().units === 0) { msg.textContent = "Agrega al menos un producto antes de pedir."; return; }
    msg.textContent = "Se abrió WhatsApp con tu pedido escrito. Complétalo y envíalo desde allí.";
    window.open(waLink(buildMessage()), "_blank", "noopener");
  });

  const promo = $("promo-whatsapp");
  if (promo) promo.href = waLink("Hola, quisiera consultar las promociones de " + BUSINESS_NAME + ".");

  render();
});
