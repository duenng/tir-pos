const state = {
  products: [],
  orders: [],
  cart: [],
  activeCategory: "Coffee",
  sidebarOpen: true,
  menuPage: 0,
  pageSize: 30,
  takeaway: false,
  modifierProduct: null,
  modifierSelection: {
    temperature: "Hot",
    milk: "",
  },
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

async function loadProducts() {
  const response = await fetch("/api/products");
  state.products = await response.json();
  renderProducts();
}

async function loadOrders() {
  const response = await fetch("/api/orders?limit=20");
  state.orders = await response.json();
  renderOrders();
}

function addToCart(product) {
  if (needsDrinkModifier(product)) {
    openModifier(product);
    return;
  }
  addResolvedProductToCart(product);
}

function addResolvedProductToCart(product) {
  const found = state.cart.find(
    (item) => item.sku === product.sku && item.name === product.name && item.price === Number(product.price || 0)
  );
  if (found) {
    found.quantity += 1;
  } else {
    state.cart.push({
      id: uid("cart"),
      sku: product.sku || "",
      name: product.name,
      category: product.category || "",
      base_name: product.base_name || product.name,
      price: Number(product.price || 0),
      quantity: 1,
    });
  }
  renderCart();
}

function needsDrinkModifier(product) {
  return ["Coffee", "Non-Coffee"].includes(product.category || "");
}

function openModifier(product) {
  state.modifierProduct = product;
  state.modifierSelection = {
    temperature: "Hot",
    milk: "",
  };
  document.getElementById("modifierTitle").textContent = product.name;
  document.getElementById("modifierModal").classList.remove("hidden");
  document.body.classList.add("sidebar-open");
  renderModifier();
}

function closeModifier() {
  state.modifierProduct = null;
  document.getElementById("modifierModal").classList.add("hidden");
  document.body.classList.toggle("sidebar-open", state.sidebarOpen);
}

function modifierExtra() {
  let extra = 0;
  if (state.modifierSelection.temperature === "Iced") {
    extra += 2;
  }
  if (["Oat milk", "Soymilk", "Coconutmilk"].includes(state.modifierSelection.milk)) {
    extra += 4;
  }
  return extra;
}

function renderModifier() {
  if (!state.modifierProduct) return;
  document.getElementById("modifierPrice").textContent = money(Number(state.modifierProduct.price || 0) + modifierExtra());
  Array.from(document.querySelectorAll("[data-modifier-group]")).forEach((button) => {
    const group = button.dataset.modifierGroup;
    const value = button.dataset.modifierValue;
    button.classList.toggle("active", state.modifierSelection[group] === value);
  });
}

function addModifierDrinkToCart() {
  if (!state.modifierProduct) return;
  const extra = modifierExtra();
  const finalPrice = Number(state.modifierProduct.price || 0) + extra;
  const parts = [state.modifierProduct.name, state.modifierSelection.temperature];
  if (state.modifierSelection.milk) {
    parts.push(state.modifierSelection.milk);
  }
  const resolved = {
    sku: state.modifierProduct.sku,
    base_name: state.modifierProduct.name,
    name: parts.join(" / "),
    category: state.modifierProduct.category,
    price: finalPrice,
  };
  addResolvedProductToCart(resolved);
  closeModifier();
}

function changeQuantity(id, delta) {
  const item = state.cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  renderCart();
}

function removeCartItem(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  renderCart();
}

function clearCart() {
  state.cart = [];
  renderCart();
  showMessage("Order cleared.", "success");
}

function setSidebar(open) {
  state.sidebarOpen = open;
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  sidebar.classList.toggle("open", open);
  backdrop.classList.toggle("visible", open);
  document.body.classList.toggle("sidebar-open", open);
}

function renderProducts() {
  const container = document.getElementById("productsGrid");
  const pager = document.getElementById("menuPager");
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  renderCategoryBar();
  const filtered = state.products.filter((product) => {
    const haystack = `${product.name} ${product.sku || ""}`.toLowerCase();
    const matchCategory = (product.category || "Other") === state.activeCategory;
    return matchCategory && haystack.includes(query);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (state.menuPage > totalPages - 1) {
    state.menuPage = totalPages - 1;
  }
  const start = state.menuPage * state.pageSize;
  const visible = filtered.slice(start, start + state.pageSize);

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">No matching items.</div>`;
    pager.innerHTML = "";
    return;
  }

  container.innerHTML = visible
    .map(
      (product, index) => `
        <button class="product-card" type="button" data-index="${index}">
          <span class="product-name">${product.name}</span>
        </button>
      `
    )
    .join("");

  Array.from(container.querySelectorAll(".product-card")).forEach((button) => {
    button.addEventListener("click", () => {
      const product = visible[Number(button.dataset.index)];
      if (product) addToCart(product);
    });
  });

  renderMenuPager(totalPages);
}

function categories() {
  return ["Coffee", "Non-Coffee", "Dessert", "Lunch"];
}

function renderCategoryBar() {
  const container = document.getElementById("categoryBar");
  container.innerHTML = categories()
    .map(
      (category) => `
        <button
          class="category-chip ${state.activeCategory === category ? "active" : ""}"
          type="button"
          data-category="${category}"
        >
          ${category}
        </button>
      `
    )
    .join("");

  Array.from(container.querySelectorAll("[data-category]")).forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      state.menuPage = 0;
      renderProducts();
    });
  });
}

function renderMenuPager(totalPages) {
  const pager = document.getElementById("menuPager");
  if (totalPages <= 1) {
    pager.innerHTML = "";
    return;
  }

  pager.innerHTML = `
    <button class="ghost-button pager-button" type="button" data-page-action="prev" ${state.menuPage === 0 ? "disabled" : ""}>
      Prev
    </button>
    <span class="pager-status">Page ${state.menuPage + 1} / ${totalPages}</span>
    <button class="ghost-button pager-button" type="button" data-page-action="next" ${state.menuPage >= totalPages - 1 ? "disabled" : ""}>
      Next
    </button>
  `;

  const prev = pager.querySelector("[data-page-action='prev']");
  const next = pager.querySelector("[data-page-action='next']");
  if (prev) {
    prev.addEventListener("click", () => {
      state.menuPage = Math.max(0, state.menuPage - 1);
      renderProducts();
    });
  }
  if (next) {
    next.addEventListener("click", () => {
      state.menuPage += 1;
      renderProducts();
    });
  }
}

function renderCart() {
  const container = document.getElementById("cartItems");
  const count = state.cart.reduce((sum, item) => sum + Number(item.quantity), 0);
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.getElementById("cartCount").textContent = `${count} items`;
  document.getElementById("subtotalValue").textContent = money(subtotal);
  document.getElementById("headerSubtotalValue").textContent = money(subtotal);
  document.getElementById("dineInButton").classList.toggle("active", !state.takeaway);
  document.getElementById("takeawayButton").classList.toggle("active", state.takeaway);

  if (!state.cart.length) {
    container.classList.add("empty-state");
    container.textContent = "Tap a menu item to start a new order.";
    return;
  }

  container.classList.remove("empty-state");
  container.innerHTML = state.cart
    .map(
      (item) => `
        <div class="cart-row">
          <div class="cart-main">
            <strong>${item.name}</strong>
            <div class="muted">${item.sku || "NO-SKU"}</div>
            <div class="cart-line-price">${money(item.price)} each</div>
          </div>
          <div class="cart-qty">
            <button class="qty-button" type="button" data-action="decrease" data-id="${item.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-button" type="button" data-action="increase" data-id="${item.id}">+</button>
          </div>
          <div class="cart-side">
            <strong>${money(item.price * item.quantity)}</strong>
            <button class="ghost-button remove-button" type="button" data-action="remove" data-id="${item.id}">
              Remove
            </button>
          </div>
        </div>
      `
    )
    .join("");

  Array.from(container.querySelectorAll("[data-action='decrease']")).forEach((button) => {
    button.addEventListener("click", () => changeQuantity(button.dataset.id, -1));
  });

  Array.from(container.querySelectorAll("[data-action='increase']")).forEach((button) => {
    button.addEventListener("click", () => changeQuantity(button.dataset.id, 1));
  });

  Array.from(container.querySelectorAll("[data-action='remove']")).forEach((button) => {
    button.addEventListener("click", () => removeCartItem(button.dataset.id));
  });
}

function renderOrders() {
  const container = document.getElementById("ordersList");
  if (!state.orders.length) {
    container.classList.add("empty-state");
    container.textContent = "No orders yet.";
    return;
  }

  container.classList.remove("empty-state");
  container.innerHTML = state.orders
    .map(
      (order) => `
        <article class="order-card">
          <div class="order-head">
            <div>
              <strong>${order.order_number}</strong>
              <div class="muted">${order.created_at.replace("T", " ")}</div>
            </div>
            <strong>${money(order.total)}</strong>
          </div>
          <div class="muted">Cashier: ${order.cashier || "-"}</div>
          <div class="muted">Note: ${order.note || "-"}</div>
          <div class="order-items">
            ${order.items
              .map((item) => `<span>${item.name} x${item.quantity} (${money(item.line_total)})</span>`)
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

async function checkout() {
  if (!state.cart.length) {
    showMessage("Cart is empty.", "error");
    return;
  }

  const payload = {
    cashier: document.getElementById("cashierInput").value.trim(),
    note: buildOrderNote(),
    items: state.cart.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: item.quantity,
    })),
  };

  const button = document.getElementById("checkoutButton");
  button.disabled = true;

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Unable to save order.");
    }

    state.cart = [];
    renderCart();
    showMessage(
      `Sent ${result.order.order_number}. ${
        result.print_results.length
          ? result.print_results.map((item) => `${item.printer_name}: ${item.status}`).join(" | ")
          : "Printed automatically."
      }`,
      "success"
    );
    await loadOrders();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function buildOrderNote() {
  const rawNote = document.getElementById("noteInput").value.trim();
  if (state.takeaway) {
    return rawNote ? `TAKEAWAY | ${rawNote}` : "TAKEAWAY";
  }
  return rawNote;
}

async function testPrinter(printerId) {
  try {
    const response = await fetch("/api/print-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printer_id: printerId, copies: 1 }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Printer test failed.");
    }
    showMessage(`Printer test sent to ${result.printer_name}.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function showMessage(message, tone = "success") {
  const box = document.getElementById("messageBox");
  box.textContent = message;
  box.className = `message-box ${tone}`;
}

function bindEvents() {
  document.getElementById("searchInput").addEventListener("input", renderProducts);
  document.getElementById("checkoutButton").addEventListener("click", checkout);
  document.getElementById("clearCartButton").addEventListener("click", clearCart);
  document.getElementById("dineInButton").addEventListener("click", () => {
    state.takeaway = false;
    renderCart();
  });
  document.getElementById("takeawayButton").addEventListener("click", () => {
    state.takeaway = true;
    renderCart();
  });
  document.getElementById("sidebarCloseButton").addEventListener("click", () => setSidebar(false));
  document.getElementById("sidebarOpenButton").addEventListener("click", () => setSidebar(true));
  document.getElementById("sidebarBackdrop").addEventListener("click", () => setSidebar(false));
  document.getElementById("refreshButton").addEventListener("click", async () => {
    await Promise.all([loadProducts(), loadOrders()]);
    showMessage("Data refreshed.", "success");
  });
  document.getElementById("modifierCloseButton").addEventListener("click", closeModifier);
  document.getElementById("modifierAddButton").addEventListener("click", addModifierDrinkToCart);
  Array.from(document.querySelectorAll("[data-modifier-group]")).forEach((button) => {
    button.addEventListener("click", () => {
      state.modifierSelection[button.dataset.modifierGroup] = button.dataset.modifierValue;
      renderModifier();
    });
  });
  document.getElementById("searchInput").addEventListener("input", () => {
    state.menuPage = 0;
    renderProducts();
  });
  document.getElementById("reloadOrdersButton").addEventListener("click", loadOrders);
}

async function init() {
  bindEvents();
  setSidebar(false);
  await Promise.all([loadProducts(), loadOrders()]);
  renderCart();
}

init().catch((error) => showMessage(error.message, "error"));
