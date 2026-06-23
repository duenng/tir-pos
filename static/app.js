const state = {
  products: [],
  orders: [],
  cart: [],
  activeCategory: "Coffee",
  sidebarOpen: true,
  menuPage: 0,
  pageSize: 30,
  takeaway: false,
  paymentMethod: "Cash",
  modifierProduct: null,
  modifierSelection: {
    temperature: "Hot",
    milk: "",
    sugar: "No sugar",
    iceLevel: "No ice",
    topping: "",
    caramelCrust: "",
    dessertOption: "",
    iceCreamFlavor: "Vanilla",
    callerNumber: "",
  },
};

const AUTO_REFRESH_MS = 15000;

const dessertOptionMap = {
  WAFFLE: [
    { code: "A", label: "A. 黑糖珍珠芝士奶蓋窩夫", price: 58 },
    { code: "B", label: "B. 焦糖花生朱古力窩夫", price: 48 },
    { code: "C", label: "C. 宇治抹茶紅豆窩夫", price: 50 },
  ],
  "EGG-WAFFLE": [
    { code: "D", label: "D. 原味雞蛋仔", price: 20 },
    { code: "E", label: "E. 朱古力雞蛋仔", price: 28 },
  ],
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function comboDiscountFromItems(items) {
  const lunchCount = items
    .filter((item) => (item.category || "") === "Lunch")
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const drinkCount = items
    .filter((item) => ["Coffee", "Non-Coffee"].includes(item.category || ""))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  return Math.min(lunchCount, drinkCount) * 8;
}

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.trim().slice(0, 120) || "Empty response";
    throw new Error(`Server returned non-JSON response: ${preview}`);
  }
  return response.json();
}

async function loadProducts() {
  const response = await fetch("/api/products");
  state.products = await readJsonResponse(response);
  renderProducts();
}

async function loadOrders() {
  const response = await fetch("/api/orders?limit=20");
  state.orders = await readJsonResponse(response);
  renderOrders();
}

function addToCart(product) {
  if (needsItemModifier(product)) {
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

function isLunch(product) {
  return (product.category || "") === "Lunch";
}

function hasNoLunchStock(product) {
  return isLunch(product) && Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0;
}

function needsItemModifier(product) {
  return needsDrinkModifier(product) || needsDessertModifier(product) || needsCallerModifier(product);
}

function needsDrinkModifier(product) {
  return ["Coffee", "Non-Coffee"].includes(product.category || "");
}

function needsDessertModifier(product) {
  return Object.prototype.hasOwnProperty.call(dessertOptionMap, product.sku) || needsCakeCaramelCrust(product);
}

function needsCakeCaramelCrust(product) {
  return ["BASQUE-CHEESECAKE", "PISTACHIO-BASQUE-CHEESECAKE"].includes(product.sku);
}

function needsCallerModifier(product) {
  return ["Dessert", "Lunch"].includes(product.category || "");
}

function modifierMode(product) {
  if (needsDessertModifier(product)) {
    return "dessert";
  }
  if (needsCallerModifier(product)) {
    return "caller";
  }
  return "drink";
}

function dessertOptions(product) {
  return dessertOptionMap[product.sku] || [{ code: product.sku, label: product.name, price: Number(product.price || 0) }];
}

function needsDessertIceCream(product) {
  return ["WAFFLE", "EGG-WAFFLE"].includes(product.sku);
}

function availableTemperatures(product) {
  const options = [];
  if (Number.isFinite(Number(product.hot_price))) {
    options.push("Hot");
  }
  if (Number.isFinite(Number(product.iced_price))) {
    options.push("Iced");
  }
  if (!options.length) {
    options.push("Hot", "Iced");
  }
  return options;
}

function selectedDrinkPrice(product, temperature) {
  if (temperature === "Iced" && Number.isFinite(Number(product.iced_price))) {
    return Number(product.iced_price);
  }
  if (temperature === "Hot" && Number.isFinite(Number(product.hot_price))) {
    return Number(product.hot_price);
  }
  return Number(product.price || 0);
}

function openModifier(product) {
  const temperatures = availableTemperatures(product);
  state.modifierProduct = product;
  state.modifierSelection = {
    temperature: temperatures[0],
    milk: "",
    sugar: "No sugar",
    iceLevel: "No ice",
    topping: "",
    caramelCrust: "",
    dessertOption: dessertOptions(product)[0]?.code || "",
    iceCreamFlavor: "Vanilla",
    callerNumber: "",
  };
  const mode = modifierMode(product);
  document.getElementById("modifierEyebrow").textContent = {
    dessert: "Dessert Modifier",
    caller: "Caller Modifier",
    drink: "Drink Modifier",
  }[mode];
  const stockSuffix = isLunch(product) && Number.isFinite(Number(product.stock)) ? ` (${product.stock} left)` : "";
  document.getElementById("modifierTitle").textContent = `${product.name}${stockSuffix}`;
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
  if (!state.modifierProduct) return 0;
  if (modifierMode(state.modifierProduct) === "dessert") {
    let extra = 0;
    if (state.modifierSelection.caramelCrust === "Caramel crust") {
      extra += 4;
    }
    if (state.modifierProduct.sku === "EGG-WAFFLE" && state.modifierSelection.iceCreamFlavor) {
      extra += 10;
    }
    return extra;
  }
  let extra = 0;
  if (
    state.modifierSelection.temperature === "Iced" &&
    !Number.isFinite(Number(state.modifierProduct?.iced_price))
  ) {
    extra += 2;
  }
  if (["Oat milk", "Soymilk", "Coconutmilk"].includes(state.modifierSelection.milk)) {
    extra += 4;
  }
  if (["Bubble", "Cheese Foam"].includes(state.modifierSelection.topping)) {
    extra += 4;
  }
  return extra;
}

function selectedDessertOption(product) {
  return dessertOptions(product).find((option) => option.code === state.modifierSelection.dessertOption) || null;
}

function selectedModifierPrice(product) {
  if (modifierMode(product) === "dessert") {
    return Number(selectedDessertOption(product)?.price || product.price || 0) + modifierExtra();
  }
  return selectedDrinkPrice(product, state.modifierSelection.temperature) + modifierExtra();
}

function renderModifier() {
  if (!state.modifierProduct) return;
  const mode = modifierMode(state.modifierProduct);
  const stockLockedLunch = hasNoLunchStock(state.modifierProduct);
  document.getElementById("temperatureSection").classList.toggle("hidden-section", mode !== "drink");
  document.getElementById("milkSection").classList.toggle("hidden-section", mode !== "drink");
  document.getElementById("sugarSection").classList.toggle("hidden-section", mode !== "drink");
  document.getElementById("iceLevelSection").classList.toggle(
    "hidden-section",
    mode !== "drink" || state.modifierSelection.temperature !== "Iced"
  );
  document.getElementById("toppingSection").classList.toggle("hidden-section", mode !== "drink");
  document.getElementById("caramelCrustSection").classList.toggle(
    "hidden-section",
    mode !== "dessert" || !needsCakeCaramelCrust(state.modifierProduct)
  );
  document.getElementById("dessertOptionSection").classList.toggle("hidden-section", mode !== "dessert");
  document.getElementById("iceCreamSection").classList.toggle(
    "hidden-section",
    mode !== "dessert" || !needsDessertIceCream(state.modifierProduct)
  );
  document.getElementById("callerSection").classList.toggle(
    "hidden-section",
    !["dessert", "caller"].includes(mode) || stockLockedLunch
  );
  document.getElementById("lunchStockSection").classList.toggle("hidden-section", !isLunch(state.modifierProduct));
  document.getElementById("modifierAddButton").disabled = stockLockedLunch;
  document.getElementById("modifierAddButton").classList.toggle("hidden-option", stockLockedLunch);
  if (isLunch(state.modifierProduct)) {
    document.getElementById("lunchStockInput").value =
      Number.isFinite(Number(state.modifierProduct.stock)) ? Number(state.modifierProduct.stock) : "";
  }
  if (mode === "dessert") {
    const title = "Options";
    document.getElementById("dessertOptionTitle").textContent = title;
    const optionsContainer = document.getElementById("dessertOptionButtons");
    optionsContainer.innerHTML = dessertOptions(state.modifierProduct)
      .map(
        (option) => `
          <button
            class="modifier-option ${state.modifierSelection.dessertOption === option.code ? "active" : ""}"
            type="button"
            data-modifier-group="dessertOption"
            data-modifier-value="${option.code}"
          >
            ${option.label}
          </button>
        `
      )
      .join("");
  }
  if (["dessert", "caller"].includes(mode)) {
    const callerContainer = document.getElementById("callerButtons");
    callerContainer.innerHTML = Array.from({ length: 16 }, (_, index) => {
      const caller = String(index + 1);
      return `
        <button
          class="modifier-option ${state.modifierSelection.callerNumber === caller ? "active" : ""}"
          type="button"
          data-modifier-group="callerNumber"
          data-modifier-value="${caller}"
        >
          ${caller}
        </button>
      `;
    }).join("");
  }
  const temperatureButtons = Array.from(document.querySelectorAll("[data-modifier-group='temperature']"));
  const temperatures = availableTemperatures(state.modifierProduct);
  temperatureButtons.forEach((button) => {
    button.disabled = !temperatures.includes(button.dataset.modifierValue);
    button.classList.toggle("hidden-option", button.disabled);
  });
  document.getElementById("modifierPrice").textContent = money(selectedModifierPrice(state.modifierProduct));
  Array.from(document.querySelectorAll("[data-modifier-group]")).forEach((button) => {
    const group = button.dataset.modifierGroup;
    const value = button.dataset.modifierValue;
    button.classList.toggle("active", state.modifierSelection[group] === value);
  });
}

function addModifierItemToCart() {
  if (!state.modifierProduct) return;
  const mode = modifierMode(state.modifierProduct);
  const finalPrice = selectedModifierPrice(state.modifierProduct);
  let parts = [state.modifierProduct.name];
  if (mode === "dessert") {
    const selectedOption = selectedDessertOption(state.modifierProduct);
    parts = [selectedOption?.label || state.modifierProduct.name];
    if (state.modifierSelection.caramelCrust) {
      parts.push(state.modifierSelection.caramelCrust);
    }
    if (needsDessertIceCream(state.modifierProduct)) {
      parts.push(state.modifierSelection.iceCreamFlavor);
    }
    if (state.modifierSelection.callerNumber) {
      parts.push(`CALLER ${state.modifierSelection.callerNumber}`);
    }
  } else if (mode === "caller") {
    parts = [state.modifierProduct.name];
    if (state.modifierSelection.callerNumber) {
      parts.push(`CALLER ${state.modifierSelection.callerNumber}`);
    }
  } else {
    parts = [state.modifierProduct.name, state.modifierSelection.temperature];
    if (state.modifierSelection.sugar) {
      parts.push(state.modifierSelection.sugar);
    }
    if (state.modifierSelection.temperature === "Iced" && state.modifierSelection.iceLevel) {
      parts.push(state.modifierSelection.iceLevel);
    }
    if (state.modifierSelection.milk) {
      parts.push(state.modifierSelection.milk);
    }
    if (state.modifierSelection.topping) {
      parts.push(state.modifierSelection.topping);
    }
  }
  const resolved = {
    sku: state.modifierProduct.sku,
    base_name:
      (mode === "dessert" ? selectedDessertOption(state.modifierProduct)?.label : state.modifierProduct.name) ||
      state.modifierProduct.name,
    name: parts.join(" / "),
    category: state.modifierProduct.category,
    price: finalPrice,
  };
  addResolvedProductToCart(resolved);
  closeModifier();
}

async function saveLunchStock() {
  if (!state.modifierProduct || !isLunch(state.modifierProduct)) return;
  const input = document.getElementById("lunchStockInput");
  const rawValue = input.value.trim();
  try {
    const response = await fetch("/api/products/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: state.modifierProduct.sku,
        stock: rawValue === "" ? null : Number(rawValue),
      }),
    });
    const result = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(result.error || "Unable to save stock.");
    }
    state.products = state.products.map((product) =>
      product.sku === result.sku ? result : product
    );
    state.modifierProduct = result;
    showMessage(`Saved stock for ${result.name}.`, "success");
    renderProducts();
    renderModifier();
  } catch (error) {
    showMessage(error.message, "error");
  }
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

  container.dataset.category = state.activeCategory;

  container.innerHTML = visible
    .map(
      (product, index) => `
        <button class="product-card" type="button" data-index="${index}" data-sku="${product.sku || ""}">
          <span class="product-name">${product.name}</span>
          ${
            isLunch(product) && Number.isFinite(Number(product.stock))
              ? `<span class="product-stock">${product.stock} left</span>`
              : ""
          }
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
  const comboDiscount = comboDiscountFromItems(state.cart);
  const total = Math.max(0, subtotal - comboDiscount);
  document.getElementById("cartCount").textContent = `${count} items`;
  document.getElementById("subtotalValue").textContent = money(total);
  document.getElementById("headerSubtotalValue").textContent = money(total);
  document.getElementById("dineInButton").classList.toggle("active", !state.takeaway);
  document.getElementById("takeawayButton").classList.toggle("active", state.takeaway);
  document.getElementById("cashPaymentButton").classList.toggle("active", state.paymentMethod === "Cash");
  document.getElementById("epaymentButton").classList.toggle("active", state.paymentMethod === "E-payment");

  if (!state.cart.length) {
    container.classList.add("empty-state");
    container.textContent = "Tap a menu item to start a new order.";
    return;
  }

  container.classList.remove("empty-state");
  const rows = state.cart
    .map(
      (item) => `
        <div class="cart-row">
          <div class="cart-main">
            <strong>${item.name}</strong>
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
  const discountRow = comboDiscount
    ? `
      <div class="cart-row discount-row">
        <div class="cart-main">
          <strong>Lunch + Drink Offer</strong>
          <div class="cart-line-price">$8 each pair</div>
        </div>
        <div class="cart-side">
          <strong>-${money(comboDiscount).replace("$", "")}</strong>
        </div>
      </div>
    `
    : "";
  container.innerHTML = rows + discountRow;

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
    total: Math.max(0, state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0) - comboDiscountFromItems(state.cart)),
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
    const result = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(result.error || "Unable to save order.");
    }

    state.cart = [];
    renderCart();
    await loadProducts();
    showMessage(
      `Sent ${result.order.order_number}. ${
        result.print_results.length
          ? result.print_results.map((item) => `${item.printer_name}: ${item.status}`).join(" | ")
          : "Saved without printing."
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
  const noteParts = [];
  if (state.takeaway) {
    noteParts.push("TAKEAWAY");
  }
  if (state.paymentMethod) {
    noteParts.push(`PAYMENT ${state.paymentMethod.toUpperCase()}`);
  }
  if (rawNote) {
    noteParts.push(rawNote);
  }
  return noteParts.join(" | ");
}

async function testPrinter(printerId) {
  try {
    const response = await fetch("/api/print-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printer_id: printerId, copies: 1 }),
    });
    const result = await readJsonResponse(response);
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
  document.getElementById("cashPaymentButton").addEventListener("click", () => {
    state.paymentMethod = "Cash";
    renderCart();
  });
  document.getElementById("epaymentButton").addEventListener("click", () => {
    state.paymentMethod = "E-payment";
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
  document.getElementById("modifierAddButton").addEventListener("click", addModifierItemToCart);
  document.getElementById("saveLunchStockButton").addEventListener("click", saveLunchStock);
  document.getElementById("modifierModal").addEventListener("click", (event) => {
    const button = event.target.closest("[data-modifier-group]");
    if (!button) return;
    state.modifierSelection[button.dataset.modifierGroup] = button.dataset.modifierValue;
    renderModifier();
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
  window.setInterval(() => {
    Promise.all([loadProducts(), loadOrders()]).catch((error) => showMessage(error.message, "error"));
  }, AUTO_REFRESH_MS);
}

init().catch((error) => showMessage(error.message, "error"));
