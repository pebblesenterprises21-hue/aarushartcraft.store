/* =====================================================================
   PEBBLES ENTERPRISES — APP LOGIC
   Cart & Wishlist in localStorage, WhatsApp ordering, UPI checkout
   ===================================================================== */

const STORAGE = {
  CART: "pebbles_cart",
  WISH: "pebbles_wish",
};

/* ---------- UTILS ---------- */
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const fmt = n => "₹" + Number(n).toLocaleString("en-IN");
const findProduct = id => SHOP_PRODUCTS.find(p => p.id === Number(id));
const getQuery = k => new URLSearchParams(window.location.search).get(k);

/* ---------- STATE ---------- */
const getCart = () => JSON.parse(localStorage.getItem(STORAGE.CART) || "[]");
const setCart = c => { localStorage.setItem(STORAGE.CART, JSON.stringify(c)); updateBadges(); };
const getWish = () => JSON.parse(localStorage.getItem(STORAGE.WISH) || "[]");
const setWish = w => { localStorage.setItem(STORAGE.WISH, JSON.stringify(w)); updateBadges(); };

function updateBadges() {
  const cart = getCart();
  const wish = getWish();
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  $$("[data-cart-count]").forEach(el => {
    el.textContent = cartCount;
    el.style.display = cartCount ? "inline-flex" : "none";
  });
  $$("[data-wish-count]").forEach(el => {
    el.textContent = wish.length;
    el.style.display = wish.length ? "inline-flex" : "none";
  });
}

/* ---------- TOAST ---------- */
function toast(msg, icon = "fa-circle-check") {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
  t.classList.add("show");
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- CART ACTIONS ---------- */
function addToCart(id, qty = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty += qty;
  else cart.push({ id, qty });
  setCart(cart);
  const p = findProduct(id);
  toast(`${p.name} added to cart`);
}

function updateQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  setCart(cart);
  renderCart();
}

function removeFromCart(id) {
  setCart(getCart().filter(i => i.id !== id));
  renderCart();
  toast("Removed from cart", "fa-trash");
}

/* ---------- WISH ACTIONS ---------- */
function toggleWish(id) {
  let wish = getWish();
  if (wish.includes(id)) {
    wish = wish.filter(i => i !== id);
    toast("Removed from wishlist", "fa-heart-crack");
  } else {
    wish.push(id);
    toast("Saved to wishlist", "fa-heart");
  }
  setWish(wish);
  document.querySelectorAll(`[data-wish-id="${id}"]`).forEach(b => {
    b.classList.toggle("active", wish.includes(id));
  });
}

/* ---------- RENDER: PRODUCT CARD ---------- */
function productCardHTML(p) {
  const wished = getWish().includes(p.id);
  const stockClass = p.stock === "Made to Order" ? "made" : (p.stock === "Sold Out" ? "out" : "");
  const cat = CATEGORIES.find(c => c.id === p.category);
  return `
    <article class="product-card" data-testid="product-card-${p.id}">
      <div class="product-img-wrap" onclick="window.location.href='product.html?id=${p.id}'">
        <span class="stock-tag ${stockClass}">${p.stock}</span>
        <button class="wish-btn ${wished ? "active" : ""}" data-wish-id="${p.id}"
                onclick="event.stopPropagation(); toggleWish(${p.id})"
                data-testid="wish-toggle-${p.id}" aria-label="Wishlist">
          <i class="fa-${wished ? "solid" : "regular"} fa-heart"></i>
        </button>
        <img src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-body">
        <div class="product-cat">${cat ? cat.name : p.category}</div>
        <a href="product.html?id=${p.id}"><h3 class="product-name">${p.name}</h3></a>
        <p class="product-desc">${p.description}</p>
        <div class="product-foot">
          <div class="product-price">${fmt(p.price)} <small>incl. taxes</small></div>
          <button class="add-btn" onclick="addToCart(${p.id})"
                  data-testid="add-cart-${p.id}">
            <i class="fa-solid fa-bag-shopping"></i> Add
          </button>
        </div>
      </div>
    </article>`;
}

/* ---------- RENDER: CATEGORIES ---------- */
function renderCategories(container) {
  const el = $(container);
  if (!el) return;

  el.innerHTML = CATEGORIES.map(c => `
    <a class="cat-card" href="products.html?cat=${c.id}#products-grid" data-testid="cat-${c.id}">
      <div class="cat-icon">
        <i class="fa-solid ${c.icon}"></i>
      </div>
      <h3>${c.name}</h3>
    </a>
  `).join("");
}

/* ---------- RENDER: HOME FEATURED ---------- */
function renderFeatured() {
  const el = $("#featured-grid");
  if (!el) return;
  const items = SHOP_PRODUCTS.filter(p => p.featured).slice(0, 4);
  el.innerHTML = items.map(productCardHTML).join("");
}

/* ---------- RENDER: PRODUCTS PAGE ---------- */
let currentCat = "all";
let currentQuery = "";

function renderProducts() {
  const el = $("#products-grid");
  if (!el) return;
  let items = SHOP_PRODUCTS.slice();
  if (currentCat !== "all") items = items.filter(p => p.category === currentCat);
  if (currentQuery) {
    const q = currentQuery.toLowerCase();
    items = items.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }
  $("#result-count").textContent = `${items.length} item${items.length !== 1 ? "s" : ""}`;
  if (items.length === 0) {
    el.innerHTML = `<div class="list-empty" style="grid-column:1/-1">
      <i class="fa-solid fa-magnifying-glass"></i>
      <h3>No matches found</h3>
      <p>Try a different category or search term.</p>
    </div>`;
    return;
  }
  el.innerHTML = items.map(productCardHTML).join("");
}

function initProductsPage() {


  const cat = getQuery("cat");
  const q = getQuery("q");

  if (cat) currentCat = cat;
  if (q) {
    currentQuery = q;
    const search = $("#search-input");
    if (search) search.value = q;
  }

  const chipBar = $("#filter-bar");

  chipBar.innerHTML = `
    <button class="chip ${currentCat === "all" ? "active" : ""}" data-cat="all">
      All
    </button>

    ${CATEGORIES.map(c => `
      <button class="chip ${currentCat === c.id ? "active" : ""}" data-cat="${c.id}">
        ${c.name}
      </button>
    `).join("")}
  `;

  chipBar.addEventListener("click", e => {

    const btn = e.target.closest(".chip");
    if (!btn) return;

    currentCat = btn.dataset.cat;

    $$(".chip").forEach(chip => chip.classList.remove("active"));

    btn.classList.add("active");

    renderProducts();

  });

  $("#search-input").addEventListener("input", e => {

    currentQuery = e.target.value.trim();

    renderProducts();

  });

  renderProducts();

  if (window.location.hash === "#products-grid") {

      document.getElementById("products-grid").scrollIntoView({

          behavior: "smooth"

      });

  }

}

/* ---------- RENDER: PRODUCT DETAIL ---------- */
function initProductDetail() {
  const id = Number(getQuery("id"));
  const p = findProduct(id);
  const wrap = $("#detail-wrap");
  if (!p) {
    wrap.innerHTML = `<div class="list-empty">
      <i class="fa-solid fa-circle-question"></i>
      <h3>Product not found</h3>
      <p>The product you're looking for doesn't exist.</p>
      <a href="products.html" class="btn btn-primary">Browse all products</a>
    </div>`;
    return;
  }
  const cat = CATEGORIES.find(c => c.id === p.category);
  const wished = getWish().includes(p.id);
  document.title = `${p.name} — ${SHOP_CONFIG.brand}`;
  $("#bc-product").textContent = p.name;

  wrap.innerHTML = `
    <div class="detail-grid">
      <div class="detail-img"><img src="${p.image}" alt="${p.name}"></div>
      <div class="detail-info">
        <div class="product-cat">${cat ? cat.name : p.category}</div>
        <h1>${p.name}</h1>
        <p class="detail-price">${fmt(p.price)}</p>
        <small style="color:var(--ink-soft)">Inclusive of all taxes · Free shipping above ₹999</small>
        <p class="desc">${p.details}</p>

        <div class="detail-meta">
          <div><span>Availability</span><strong>${p.stock}</strong></div>
          <div><span>Category</span><strong>${cat ? cat.name : p.category}</strong></div>
          <div><span>Handcrafted in</span><strong>Chennai, India</strong></div>
        </div>

        <div class="detail-actions">
          <button class="btn btn-primary" onclick="addToCart(${p.id})" data-testid="detail-add-cart">
            <i class="fa-solid fa-bag-shopping"></i> Add to cart
          </button>
          <button class="btn btn-outline" onclick="toggleWish(${p.id}); this.querySelector('i').className = getWish().includes(${p.id}) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'" data-testid="detail-wish">
            <i class="fa-${wished ? "solid" : "regular"} fa-heart"></i> Wishlist
          </button>
          <a class="btn btn-whatsapp" href="${waLinkSingle(p)}" target="_blank" rel="noopener" data-testid="detail-whatsapp">
            <i class="fa-brands fa-whatsapp"></i> Order on WhatsApp
          </a>
        </div>
        <p style="font-size:0.82rem;color:var(--ink-soft);line-height:1.6">
          Need a custom size or colour? Message us on WhatsApp — we love bespoke orders.
        </p>
      </div>
    </div>

    <section style="padding:80px 0 0">
      <div class="section-head">
        <div><h2>You may also like</h2><p class="subtitle">Hand-picked favourites from our studio</p></div>
      </div>
      <div class="product-grid">
        ${SHOP_PRODUCTS.filter(x => x.id !== p.id && x.category === p.category).slice(0, 4).map(productCardHTML).join("") ||
          SHOP_PRODUCTS.filter(x => x.id !== p.id).slice(0, 4).map(productCardHTML).join("")}
      </div>
    </section>
  `;
}

/* ---------- RENDER: CART ---------- */
function renderCart() {
  const wrap = $("#cart-wrap");
  if (!wrap) return;
  const cart = getCart();
  if (cart.length === 0) {
    wrap.innerHTML = `<div class="list-empty" data-testid="cart-empty">
      <i class="fa-solid fa-bag-shopping"></i>
      <h3>Your cart is empty</h3>
      <p>Looks like you haven't picked anything yet.</p>
      <a href="products.html" class="btn btn-primary">Start shopping</a>
    </div>`;
    return;
  }
  const items = cart.map(c => ({ ...findProduct(c.id), qty: c.qty })).filter(p => p.id);
  const subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const shipping = subtotal >= 999 ? 0 : 49;
  const total = subtotal + shipping;

  wrap.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items">
        ${items.map(p => {
          const cat = CATEGORIES.find(c => c.id === p.category);
          return `
            <div class="cart-item" data-testid="cart-item-${p.id}">
              <img src="${p.image}" alt="${p.name}">
              <div>
                <div class="cat">${cat ? cat.name : ""}</div>
                <h4>${p.name}</h4>
                <div class="qty-control" data-testid="qty-control-${p.id}">
                  <button onclick="updateQty(${p.id}, -1)" aria-label="Decrease">−</button>
                  <span>${p.qty}</span>
                  <button onclick="updateQty(${p.id}, 1)" aria-label="Increase">+</button>
                </div>
              </div>
              <div class="cart-item-right">
                <div class="cart-item-price">${fmt(p.price * p.qty)}</div>
                <button class="remove-btn" onclick="removeFromCart(${p.id})" data-testid="remove-${p.id}">Remove</button>
              </div>
            </div>`;
        }).join("")}
      </div>

      <aside class="cart-summary" data-testid="cart-summary">
        <h3>Order Summary</h3>
        <div class="sum-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
        <div class="sum-row"><span>Shipping</span><span>${shipping === 0 ? "Free" : fmt(shipping)}</span></div>
        <div class="sum-row total"><span>Total</span><span>${fmt(total)}</span></div>

        <div class="checkout-actions">
          <a class="btn btn-whatsapp" href="${waLinkCart(items, total)}" target="_blank" rel="noopener" data-testid="checkout-whatsapp">
            <i class="fa-brands fa-whatsapp"></i> Order on WhatsApp
          </a>
          <button class="btn btn-upi" onclick="openUPI(${total})" data-testid="checkout-upi">
            <i class="fa-solid fa-indian-rupee-sign"></i> Pay ${fmt(total)} via UPI
          </button>
        </div>
        <p class="payment-note">After UPI payment, please share the screenshot on WhatsApp to confirm your order.</p>
      </aside>
    </div>
  `;
}

/* ---------- RENDER: WISHLIST ---------- */
function renderWishlist() {
  const wrap = $("#wish-wrap");
  if (!wrap) return;
  const ids = getWish();
  if (ids.length === 0) {
    wrap.innerHTML = `<div class="list-empty" data-testid="wish-empty">
      <i class="fa-regular fa-heart"></i>
      <h3>No favourites yet</h3>
      <p>Tap the heart on any product to save it for later.</p>
      <a href="products.html" class="btn btn-primary">Browse products</a>
    </div>`;
    return;
  }
  const items = ids.map(findProduct).filter(Boolean);
  wrap.innerHTML = `<div class="product-grid">${items.map(productCardHTML).join("")}</div>`;
}

/* ---------- WHATSAPP LINKS ---------- */function waLinkSingle(p) {
    const msg =
`Hi Aarush Art & Craft!

I would like to order:

${p.name}

Price : ${fmt(p.price)}

Please confirm availability.`;

    return `https://wa.me/${SHOP_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
}
function waLinkCart(items, total) {

    const products = items.map((p, i) =>
        `${i + 1}. ${p.name}
Qty : ${p.qty}
Price : ${fmt(p.price)}
Subtotal : ${fmt(p.price * p.qty)}`
    ).join("\n\n");

    const msg =
`Hi Aarush Art & Craft!

I would like to place an order.

${products}

------------------------
Grand Total : ${fmt(total)}

Customer Name :
Phone Number :
Delivery Address :

Please confirm my order.`;

    return `https://wa.me/${SHOP_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
}
 

/* ---------- UPI MODAL ---------- */
function openUPI(amount) {
  let modal = $("#upi-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal-bg";
    modal.id = "upi-modal";
    document.body.appendChild(modal);
  }
  const upiUrl = `upi://pay?pa=${SHOP_CONFIG.upiId}&pn=${encodeURIComponent(SHOP_CONFIG.payeeName)}&am=${amount}&cu=INR&tn=Order`;
  const qrSrc  = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`;
  modal.innerHTML = `
    <div class="modal" data-testid="upi-modal">
      <button class="modal-close" onclick="closeUPI()" data-testid="upi-close">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <h3>Pay via UPI</h3>
      <p>Scan the QR with any UPI app or use the ID below</p>
      <div class="qr-box"><img src="${qrSrc}" alt="UPI QR Code"></div>
      <div class="upi-id-box">
        <span id="upi-id-text">${SHOP_CONFIG.upiId}</span>
        <button class="copy-btn" onclick="copyUPI()" data-testid="upi-copy">Copy</button>
      </div>
      <a class="btn btn-primary" href="${upiUrl}" style="width:100%;justify-content:center" data-testid="upi-open-app">
        Open UPI App · Pay ${fmt(amount)}
      </a>
      <p style="font-size:0.8rem;color:var(--ink-soft);margin-top:18px;margin-bottom:0">
        After paying, send the screenshot to <strong>${SHOP_CONFIG.phone}</strong> on WhatsApp to confirm.
      </p>
    </div>`;
  modal.classList.add("show");
}
function closeUPI() { $("#upi-modal")?.classList.remove("show"); }
function copyUPI() {
  navigator.clipboard.writeText(SHOP_CONFIG.upiId);
  toast("UPI ID copied");
}

/* ---------- WHATSAPP FLOAT + FOOTER ---------- */
function injectGlobals() {
  // WhatsApp float
  if (!$(".wa-float")) {
    const wa = document.createElement("a");
    wa.className = "wa-float";
    wa.href = `https://wa.me/${SHOP_CONFIG.whatsapp}?text=Hi%20${encodeURIComponent(SHOP_CONFIG.brand)}!%20I%20have%20a%20question.`;
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.setAttribute("data-testid", "wa-float");
    wa.innerHTML = `<i class="fa-brands fa-whatsapp"></i>`;
    document.body.appendChild(wa);
  }

  // Footer
  const foot = $("#footer-slot");
  if (foot) {
    foot.innerHTML = `
      <footer>
        <div class="container">
          <div class="foot-grid">
            <div>
              <div class="foot-brand">Aarush <span>Art & Craft</span></div>
              <p>${SHOP_CONFIG.tagline}<br>Crafted, painted and packed by hand.</p>
              <div class="foot-socials">
                <a href="${SHOP_CONFIG.instagram}" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
                <a href="${SHOP_CONFIG.facebook}" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
                <a href="https://wa.me/${SHOP_CONFIG.whatsapp}" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
              </div>
            </div>
            <div>
              <h4>Shop</h4>
              <a href="products.html">All products</a>
              ${CATEGORIES.slice(0, 4).map(c => `<a href="products.html?cat=${c.id}">${c.name}</a>`).join("")}
            </div>
            <div>
              <h4>Help</h4>
              <a href="contact.html">Contact</a>
              <a href="cart.html">Your cart</a>
              <a href="wishlist.html">Wishlist</a>
            </div>
            <div>
              <h4>Reach us</h4>
              <p>${SHOP_CONFIG.phone}<br>${SHOP_CONFIG.email}<br>${SHOP_CONFIG.address}</p>
            </div>
          </div>
          <div class="foot-bottom">© ${new Date().getFullYear()} ${SHOP_CONFIG.brand}. All rights reserved.</div>
        </div>
      </footer>`;
  }

  // Mobile menu toggle
  const toggle = $(".menu-toggle");
  const links = $(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  injectGlobals();
  updateBadges();

  // Home
  renderCategories("#cat-grid-home");
  renderFeatured();

  // Products page
  if ($("#products-grid")) initProductsPage();
  renderCategories("#cat-grid-products");

  // Product detail
  if ($("#detail-wrap")) initProductDetail();

  // Cart
  renderCart();

  // Wishlist
  renderWishlist();

  // Contact form
  const form = $("#contact-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const data = new FormData(form);
      const msg = `Hi ${SHOP_CONFIG.brand}!%0A%0AName: ${encodeURIComponent(data.get("name"))}%0AEmail: ${encodeURIComponent(data.get("email"))}%0A%0A${encodeURIComponent(data.get("message"))}`;
      window.open(`https://wa.me/${SHOP_CONFIG.whatsapp}?text=${msg}`, "_blank");
      toast("Opening WhatsApp…");
      form.reset();
    });
  }

  // Close modal on backdrop click
  document.addEventListener("click", e => {
    if (e.target.id === "upi-modal") closeUPI();
  });
});
