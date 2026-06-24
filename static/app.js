const state = {
  products: [],
  orders: [],
  cart: [],
  activeCategory: "Coffee",
  sidebarOpen: true,
  menuPage: 0,
  pageSize: 20,
  takeaway: false,
  paymentMethod: "E-payment",
  modifierProduct: null,
  modifierSelection: {
    temperature: "Hot",
    milk: "",
    sugar: "",
    iceLevel: "",
    topping: "",
    caramelCrust: "",
    dessertOption: "",
    iceCreamFlavor: "Vanilla",
    callerNumber: "",
    discountAmount: "20",
  },
};

const AUTO_REFRESH_MS = 15000;
const DEMO_MODE =
  window.location.protocol === "file:" ||
  window.location.hostname.endsWith(".github.io") ||
  new URLSearchParams(window.location.search).get("demo") === "1";

const DEMO_PRODUCTS = [
  { sku: "AMERICANO", name: "Americano", category: "Coffee", price: 26, hot_price: 26, iced_price: 28 },
  { sku: "LATTE", name: "Latte", category: "Coffee", price: 33, hot_price: 33, iced_price: 35 },
  { sku: "CAPPUCCINO", name: "Cappuccino", category: "Coffee", price: 33, hot_price: 33, iced_price: 35 },
  { sku: "FLAT-WHITE", name: "Flat White", category: "Coffee", price: 36, hot_price: 36 },
  { sku: "MOCHA", name: "Mocha", category: "Coffee", price: 36, hot_price: 36, iced_price: 38 },
  { sku: "CARAMEL-MACCHIATO", name: "Caramel Macchiato", category: "Coffee", price: 36, hot_price: 36, iced_price: 38 },
  { sku: "HAZELNUT-LATTE", name: "Hazelnut Latte", category: "Coffee", price: 36, hot_price: 36, iced_price: 38 },
  { sku: "VANILLA-LATTE", name: "Vanilla Latte", category: "Coffee", price: 36, hot_price: 36, iced_price: 38 },
  { sku: "CREME-BRULEE", name: "Creme Brulee", category: "Coffee", price: 39, hot_price: 39 },
  { sku: "ESPRESSO", name: "Espresso", category: "Coffee", price: 24 },
  { sku: "ESPRESSO-TONIC", name: "Espresso Tonic", category: "Coffee", price: 37, iced_price: 37 },
  { sku: "COCONUT-AMERICANO", name: "Coconut Americano", category: "Coffee", price: 37, iced_price: 37 },
  { sku: "COCONUT-LATTE", name: "Coconut Latte", category: "Coffee", price: 39, iced_price: 39 },
  { sku: "AFFOGATO", name: "Affogato", category: "Coffee", price: 34, iced_price: 34 },
  { sku: "COLD-BREW", name: "Cold Brew", category: "Coffee", price: 35, iced_price: 35 },
  { sku: "ORANGE-MILK-FOAM", name: "Mont Blanc", category: "Coffee", price: 40, iced_price: 40 },
  { sku: "SICILY-COFFEE", name: "Cold Brew Romano", category: "Coffee", price: 40, iced_price: 40 },
  { sku: "OSMANTHUS-OOLONG", name: "Osmanthus Oolong", category: "Non-Coffee", price: 26, hot_price: 26, iced_price: 26 },
  { sku: "JASMINE-GREEN-TEA", name: "Green Tea", category: "Non-Coffee", price: 26, iced_price: 26 },
  { sku: "CITRUS-GREEN-TEA", name: "Orange Green Tea", category: "Non-Coffee", price: 29, iced_price: 29 },
  { sku: "MATCHA-FRESH-MILK-UJI", name: "Matcha Latte", category: "Non-Coffee", price: 31, hot_price: 31, iced_price: 33 },
  { sku: "MATCHA-RED-BEAN-MILK-UJI", name: "Matcha Latte with Red Beans", category: "Non-Coffee", price: 33, hot_price: 33, iced_price: 35 },
  { sku: "BROWN-RICE-TEA-MILK", name: "Genmaicha Latte", category: "Non-Coffee", price: 31, hot_price: 31, iced_price: 33 },
  { sku: "HOJICHA-MILK", name: "Hojicha Latte", category: "Non-Coffee", price: 31, hot_price: 31, iced_price: 33 },
  { sku: "MATCHAGO", name: "Matchagato", category: "Non-Coffee", price: 34, iced_price: 34 },
  { sku: "BROWN-SUGAR-BOBA-MILK", name: "Brown Sugar Boba", category: "Non-Coffee", price: 32, iced_price: 32 },
  { sku: "CHOCOLATE-FRAPPE", name: "Frothy Chololate", category: "Non-Coffee", price: 29, hot_price: 29, iced_price: 31 },
  { sku: "EARL-GREY-MILK-TEA", name: "London Fog Latte", category: "Non-Coffee", price: 36, hot_price: 36, iced_price: 38 },
  { sku: "HONEY-LEMON-SODA", name: "Honey Lemon Soda", category: "Non-Coffee", price: 33, iced_price: 33 },
  { sku: "ICE-CREAM-SHAKE", name: "Cream Soda", category: "Non-Coffee", price: 38, iced_price: 38 },
  { sku: "EGG-WAFFLE", name: "雞蛋仔", category: "Dessert", price: 0 },
  { sku: "WAFFLE", name: "窩夫", category: "Dessert", price: 0 },
  { sku: "BASQUE-CHEESECAKE", name: "巴斯克蛋糕", category: "Dessert", price: 30 },
  { sku: "PISTACHIO-BASQUE-CHEESECAKE", name: "開心果巴斯克蛋糕", category: "Dessert", price: 38 },
  { sku: "BOLOGNESE-LASAGNA", name: "肉醬千層麵", category: "Lunch", price: 62, stock: 44 },
  { sku: "BEEF-TRUFFLE-EGGWHITE-RICE", name: "肥牛黑松露炒蛋白飯", category: "Lunch", price: 58, stock: 19 },
  { sku: "BEEF-TRUFFLE-SCRAMBLED-UDON", name: "肥牛黑松露炒蛋烏冬", category: "Lunch", price: 58, stock: 20 },
  { sku: "YAM-CHICKEN-RICE", name: "山承咖哩雞飯", category: "Lunch", price: 52, stock: 20 },
  { sku: "YAM-CHICKEN-UDON", name: "山承咖哩雞讚岐烏冬", category: "Lunch", price: 52, stock: 20 },
  { sku: "PORK-CARTILAGE-BRAISED-EGG-RICE", name: "豬軟骨滷蛋飯", category: "Lunch", price: 58, stock: 20 },
  { sku: "PORK-CARTILAGE-BRAISED-EGG-UDON", name: "豬軟骨滷蛋讚岐烏冬", category: "Lunch", price: 58, stock: 20 },
  { sku: "FILTER-CUP", name: "Filter Cup", category: "Others", price: 100 },
  { sku: "DISCOUNT", name: "Discount", category: "Others", price: 0 },
];

const DEMO_ORDERS = [
  {
    id: 1,
    order_number: "20260624-0001",
    cashier: "Demo Staff",
    note: "PAYMENT CASH",
    subtotal: 62,
    total: 62,
    created_at: "2026-06-24T12:30:00",
    items: [{ sku: "BOLOGNESE-LASAGNA", name: "肉醬千層麵", price: 62, quantity: 1, line_total: 62 }],
  },
];

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

function takeawaySurchargeForProduct(product) {
  if (!state.takeaway) {
    return 0;
  }
  if ((product.category || "") === "Lunch") {
    return 2;
  }
  if ((product.category || "") === "Dessert" && ["WAFFLE", "BASQUE-CHEESECAKE", "PISTACHIO-BASQUE-CHEESECAKE"].includes(product.sku || "")) {
    return 2;
  }
  return 0;
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
  if (DEMO_MODE) {
    state.products = DEMO_PRODUCTS.map((item) => ({ ...item }));
    renderProducts();
    return;
  }
  const response = await fetch("/api/products");
  state.products = await readJsonResponse(response);
  renderProducts();
}

async function loadOrders() {
  if (DEMO_MODE) {
    state.orders = DEMO_ORDERS.map((order) => ({ ...order, items: order.items.map((item) => ({ ...item })) }));
    renderOrders();
    return;
  }
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
  const basePrice = Number(product.price || 0);
  const found = state.cart.find(
    (item) => item.sku === product.sku && item.name === product.name && Number(item.base_price || 0) === basePrice
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
      base_price: basePrice,
      quantity: 1,
    });
  }
  renderCart();
}

function cartItemUnitPrice(item) {
  return Number(item.base_price || 0) + takeawaySurchargeForProduct(item);
}

function isLunch(product) {
  return (product.category || "") === "Lunch";
}

function hasNoLunchStock(product) {
  return isLunch(product) && Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0;
}

function needsItemModifier(product) {
  return isDiscountProduct(product) || needsDrinkModifier(product) || needsDessertModifier(product) || needsCallerModifier(product);
}

function isDiscountProduct(product) {
  return (product?.sku || "") === "DISCOUNT";
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
  if (isDiscountProduct(product)) {
    return false;
  }
  return ["Dessert", "Lunch"].includes(product.category || "");
}

function modifierMode(product) {
  if (isDiscountProduct(product)) {
    return "discount";
  }
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

function eggWaffleIceCreamOptional(product) {
  return product.sku === "EGG-WAFFLE";
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
    sugar: "",
    iceLevel: "",
    topping: "",
    caramelCrust: "",
    dessertOption: dessertOptions(product)[0]?.code || "",
    iceCreamFlavor: eggWaffleIceCreamOptional(product) ? "" : "Vanilla",
    callerNumber: "",
    discountAmount: "20",
  };
  const mode = modifierMode(product);
  document.getElementById("modifierEyebrow").textContent = {
    dessert: "Dessert Modifier",
    caller: "Caller Modifier",
    discount: "Discount Modifier",
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
  if (isDiscountProduct(product)) {
    return -Math.abs(Number(state.modifierSelection.discountAmount || 0));
  }
  const takeawayExtra = takeawaySurchargeForProduct(product);
  if (modifierMode(product) === "dessert") {
    return Number(selectedDessertOption(product)?.price || product.price || 0) + modifierExtra() + takeawayExtra;
  }
  return selectedDrinkPrice(product, state.modifierSelection.temperature) + modifierExtra() + takeawayExtra;
}

function renderModifier() {
  if (!state.modifierProduct) return;
  const mode = modifierMode(state.modifierProduct);
  const stockLockedLunch = hasNoLunchStock(state.modifierProduct);
  const dessertOptionList = mode === "dessert" ? dessertOptions(state.modifierProduct) : [];
  const showDessertOptions = mode === "dessert" && dessertOptionList.length > 1;
  const isDiscount = isDiscountProduct(state.modifierProduct);
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
  document.getElementById("dessertOptionSection").classList.toggle("hidden-section", !showDessertOptions);
  document.getElementById("iceCreamSection").classList.toggle(
    "hidden-section",
    mode !== "dessert" || !needsDessertIceCream(state.modifierProduct)
  );
  document.getElementById("callerSection").classList.toggle(
    "hidden-section",
    !["dessert", "caller"].includes(mode) || stockLockedLunch
  );
  document.getElementById("lunchStockSection").classList.toggle("hidden-section", !isLunch(state.modifierProduct));
  document.getElementById("discountSection").classList.toggle("hidden-section", !isDiscount);
  document.getElementById("modifierAddButton").disabled = stockLockedLunch;
  document.getElementById("modifierAddButton").classList.toggle("hidden-option", stockLockedLunch);
  if (isLunch(state.modifierProduct)) {
    document.getElementById("lunchStockInput").value =
      Number.isFinite(Number(state.modifierProduct.stock)) ? Number(state.modifierProduct.stock) : "";
  }
  if (isDiscount) {
    document.getElementById("discountAmountInput").value = state.modifierSelection.discountAmount || "20";
  }
  if (mode === "dessert") {
    const title = "Options";
    document.getElementById("dessertOptionTitle").textContent = title;
    const optionsContainer = document.getElementById("dessertOptionButtons");
    optionsContainer.innerHTML = dessertOptionList
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
  if (isDiscountProduct(state.modifierProduct)) {
    parts = [state.modifierProduct.name];
  } else if (mode === "dessert") {
    const selectedOption = selectedDessertOption(state.modifierProduct);
    parts = [selectedOption?.label || state.modifierProduct.name];
    if (state.modifierSelection.caramelCrust) {
      parts.push(state.modifierSelection.caramelCrust);
    }
    if (needsDessertIceCream(state.modifierProduct) && state.modifierSelection.iceCreamFlavor) {
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
  if (DEMO_MODE) {
    const nextStock = rawValue === "" ? null : Number(rawValue);
    state.products = state.products.map((product) =>
      product.sku === state.modifierProduct.sku ? { ...product, stock: nextStock } : product
    );
    state.modifierProduct = state.products.find((product) => product.sku === state.modifierProduct.sku);
    showMessage(`Saved stock for ${state.modifierProduct.name}.`, "success");
    renderProducts();
    renderModifier();
    return;
  }
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
  container.classList.toggle("products-grid-compact", visible.length <= 4);

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
  return ["Coffee", "Non-Coffee", "Dessert", "Lunch", "Others"];
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
  const subtotal = state.cart.reduce((sum, item) => sum + cartItemUnitPrice(item) * item.quantity, 0);
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
            <div class="cart-line-price">${money(cartItemUnitPrice(item))} each</div>
          </div>
          <div class="cart-qty">
            <button class="qty-button" type="button" data-action="decrease" data-id="${item.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-button" type="button" data-action="increase" data-id="${item.id}">+</button>
          </div>
          <div class="cart-side">
            <strong>${money(cartItemUnitPrice(item) * item.quantity)}</strong>
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

function resetOrderDefaults() {
  state.takeaway = false;
  state.paymentMethod = "E-payment";
}

async function checkout() {
  if (!state.cart.length) {
    showMessage("Cart is empty.", "error");
    return;
  }

  const payload = {
    cashier: document.getElementById("cashierInput").value.trim(),
    note: buildOrderNote(),
    total: Math.max(0, state.cart.reduce((sum, item) => sum + cartItemUnitPrice(item) * item.quantity, 0) - comboDiscountFromItems(state.cart)),
    items: state.cart.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      price: cartItemUnitPrice(item),
      quantity: item.quantity,
    })),
  };

  const button = document.getElementById("checkoutButton");
  button.disabled = true;

  if (DEMO_MODE) {
    const subtotal = state.cart.reduce((sum, item) => sum + cartItemUnitPrice(item) * item.quantity, 0);
    const total = Math.max(0, subtotal - comboDiscountFromItems(state.cart));
    state.orders.unshift({
      id: Date.now(),
      order_number: `DEMO-${String(state.orders.length + 1).padStart(4, "0")}`,
      cashier: payload.cashier || "Demo Staff",
      note: payload.note,
      subtotal,
      total,
      created_at: new Date().toISOString().slice(0, 19),
      items: payload.items.map((item) => ({
        ...item,
        line_total: Number(item.price) * Number(item.quantity),
      })),
    });
    state.cart = [];
    resetOrderDefaults();
    renderCart();
    renderOrders();
    showMessage("Demo order saved locally.", "success");
    button.disabled = false;
    return;
  }

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
    resetOrderDefaults();
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
  if (DEMO_MODE) {
    showMessage(`Demo mode: printer test for ${printerId} skipped.`, "success");
    return;
  }
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

function fitPosStage() {
  const shell = document.getElementById("contentShell");
  if (!shell) return;
  const stagePadding = window.innerWidth <= 1100 ? 24 : 36;
  const availableWidth = Math.max(320, window.innerWidth - stagePadding);
  const availableHeight = Math.max(320, window.innerHeight - stagePadding);
  const scale = Math.min(availableWidth / 1024, availableHeight / 768, 1);
  shell.style.transform = `scale(${scale})`;
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
  document.getElementById("discountAmountInput").addEventListener("input", (event) => {
    const raw = String(event.target.value || "").trim();
    state.modifierSelection.discountAmount = raw || "0";
    if (state.modifierProduct) {
      document.getElementById("modifierPrice").textContent = money(selectedModifierPrice(state.modifierProduct));
    }
  });
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
  fitPosStage();
  window.addEventListener("resize", fitPosStage);
  window.addEventListener("orientationchange", fitPosStage);
  await Promise.all([loadProducts(), loadOrders()]);
  renderCart();
  if (DEMO_MODE) {
    showMessage("Static demo mode active.", "success");
    return;
  }
  window.setInterval(() => {
    Promise.all([loadProducts(), loadOrders()]).catch((error) => showMessage(error.message, "error"));
  }, AUTO_REFRESH_MS);
}

init().catch((error) => showMessage(error.message, "error"));
