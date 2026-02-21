document.addEventListener("DOMContentLoaded", function () {
  const tableKey = (
    window.location.pathname.split("/").filter(Boolean)[0] || ""
  ).trim();
  const rootContainer = document.querySelector(".main-container");
  const tableId = Number(rootContainer?.dataset.tableId) || null;
  const root = document.documentElement;

  function syncReportFrameThemes(theme) {
    const reportFrames = document.querySelectorAll(".report-frame");
    reportFrames.forEach((frame) => {
      try {
        const frameRoot = frame.contentDocument?.documentElement;
        if (frameRoot) frameRoot.setAttribute("data-theme", theme);
      } catch (err) {
        // Ignore cross-document access errors.
      }
    });
  }

  function resizeReportFrame(frame) {
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const bodyHeight = doc.body ? doc.body.scrollHeight : 0;
      const rootHeight = doc.documentElement ? doc.documentElement.scrollHeight : 0;
      const nextHeight = Math.max(bodyHeight, rootHeight, 420);
      frame.style.height = `${nextHeight}px`;
    } catch (err) {
      // Ignore cross-document access errors.
    }
  }

  function resizeReportFrames() {
    document.querySelectorAll(".report-frame").forEach((frame) => {
      resizeReportFrame(frame);
    });
  }

  function applyTheme(theme, options = {}) {
    const shouldSyncFrames = options.syncFrames !== false;
    const nextTheme = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", nextTheme);

    if (shouldSyncFrames) {
      syncReportFrameThemes(nextTheme);
    }
  }

  applyTheme(root.getAttribute("data-theme"), { syncFrames: true });

  document.querySelectorAll(".report-frame").forEach((frame) => {
    frame.addEventListener("load", () => {
      applyTheme(root.getAttribute("data-theme"), { syncFrames: true });
      resizeReportFrame(frame);
    });
  });

  window.addEventListener("resize", resizeReportFrames);

  document.addEventListener("foodflow:theme-change", (event) => {
    applyTheme(event?.detail?.theme, { syncFrames: true });
  });

  // Navbar profile hydrate
  const profileNameEl = document.getElementById("navbarName");
  const profileRoleEl = document.getElementById("navbarRole");
  const profileAvatarEl = document.getElementById("navbarAvatar");
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutModal = document.getElementById("logoutModal");
  const logoutConfirm = document.getElementById("logoutConfirm");
  const logoutCancel = document.getElementById("logoutCancel");
  const logoutClose = document.getElementById("logoutClose");

  function renderProfile() {
    const isMember = localStorage.getItem("ff_member_isMember") === "true";
    const name = (localStorage.getItem("ff_member_name") || "").trim();
    const displayName = name || "Guest";
    if (profileNameEl) profileNameEl.textContent = displayName;
    if (profileRoleEl)
      profileRoleEl.textContent = isMember ? "Member" : "Not a member";
    if (profileAvatarEl) {
      profileAvatarEl.innerHTML = "";
      if (isMember && displayName) {
        const letter = document.createElement("span");
        letter.textContent = displayName.charAt(0).toUpperCase();
        profileAvatarEl.appendChild(letter);
      } else {
        profileAvatarEl.innerHTML =
          '<svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z"/></svg>';
      }
    }
  }

  renderProfile();

  function openLogoutModal() {
    if (!logoutModal) return;
    logoutModal.classList.add("open");
    logoutModal.setAttribute("aria-hidden", "false");
    if (document.body) document.body.classList.add("no-scroll");
  }

  function closeLogoutModal() {
    if (!logoutModal) return;
    logoutModal.classList.remove("open");
    logoutModal.setAttribute("aria-hidden", "true");
    if (document.body) document.body.classList.remove("no-scroll");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openLogoutModal();
    });
  }

  if (logoutCancel) logoutCancel.addEventListener("click", closeLogoutModal);
  if (logoutClose) logoutClose.addEventListener("click", closeLogoutModal);
  if (logoutModal) {
    logoutModal.addEventListener("click", (e) => {
      if (e.target === logoutModal.querySelector(".logout-modal__backdrop")) {
        closeLogoutModal();
      }
    });
  }

  const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = csrfTokenMeta ? csrfTokenMeta.getAttribute("content") : "";

  if (logoutConfirm) {
    logoutConfirm.addEventListener("click", () => {
      // Invalidate session on server-side, then redirect
      fetch('/logout', {
        method: 'POST',
        headers: csrfToken ? { 'CSRF-Token': csrfToken } : {},
      })
        .then(() => {
          window.location.href = '/admin-login';
        })
        .catch((err) => {
          console.error('Logout failed', err);
          alert('Logout failed. Please try again.');
        });
    });
  }

  // Tab functionality
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  const ordersPanel = document.getElementById("orders");
  function switchTab(tabId) {
    // Remove active class from all buttons and panels
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabPanels.forEach((panel) => panel.classList.remove("active"));
    // Add active class to clicked button and corresponding panel
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    const activePanel = document.getElementById(tabId);
    if (activeButton && activePanel) {
      activeButton.classList.add("active");
      activePanel.classList.add("active");
    }
  }
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (this.id === "logoutBtn") return; // handled by modal
      const tabId = this.getAttribute("data-tab");
      switchTab(tabId);
    });
    // Keyboard accessibility
    button.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const tabId = this.getAttribute("data-tab");
        switchTab(tabId);
      }
    });
  });
  // Toggle switch functionality
  const toggleSwitches = document.querySelectorAll(".toggle-switch");
  toggleSwitches.forEach((toggle) => {
    if (toggle.id === "toggleTheme") {
      return;
    }
    toggle.addEventListener("click", function () {
      this.classList.toggle("active");

      // Optional: Add some visual feedback
      const toggleName = this.getAttribute("data-toggle");
      const isActive = this.classList.contains("active");
      console.log(`${toggleName}: ${isActive ? "Enabled" : "Disabled"}`);
    });
    // Keyboard accessibility for toggles
    toggle.setAttribute("tabindex", "0");
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-checked", toggle.classList.contains("active"));
    toggle.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
        this.setAttribute("aria-checked", this.classList.contains("active"));
      }
    });
  });
  // Animate progress bars on panel switch
  function animateProgressBars(panel) {
    const progressBars = panel.querySelectorAll(".progress-fill");
    progressBars.forEach((bar) => {
      const width = bar.style.width;
      bar.style.width = "0%";
      setTimeout(() => {
        bar.style.width = width;
      }, 100);
    });
  }
  // Animate stats on panel switch
  function animateStats(panel) {
    const statValues = panel.querySelectorAll(".stat-value");
    statValues.forEach((stat, index) => {
      stat.style.opacity = "0";
      stat.style.transform = "translateY(20px)";
      setTimeout(() => {
        stat.style.transition = "all 0.5s ease";
        stat.style.opacity = "1";
        stat.style.transform = "translateY(0)";
      }, index * 100);
    });
  }
  // Observer for panel changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        const panel = mutation.target;
        if (panel.classList.contains("active")) {
          animateProgressBars(panel);
          animateStats(panel);
        }
      }
    });
  });
  tabPanels.forEach((panel) => {
    observer.observe(panel, { attributes: true });
  });
  // Initial animation for the first active panel
  const initialPanel = document.querySelector(".tab-panel.active");
  if (initialPanel) {
    animateProgressBars(initialPanel);
    animateStats(initialPanel);
  }
  // Add hover effect sound simulation (visual feedback)
  tabButtons.forEach((btn) => {
    btn.addEventListener("mouseenter", function () {
      this.style.transform = "translateX(4px)";
    });
    btn.addEventListener("mouseleave", function () {
      this.style.transform = "translateX(0)";
    });
  });

  // Menu fetch & render
  const menuGrid = document.getElementById("menuGrid");
  const menuStatus = document.getElementById("menuStatus");
  const MENU_API = "/api/menus";
  let menuItemsCache = [];
  const menuPanel = document.getElementById("menu");
  const menuTableBody = document.getElementById("menuTableBody");
  const menuTableStatus = document.getElementById("menuTableStatus");
  const menuSearchInput = document.getElementById("menuSearchInput");
  const menuRefreshBtn = document.getElementById("menuRefreshBtn");
  const menuAddBtn = document.getElementById("menuAddBtn");
  const menuFormCard = document.getElementById("menuFormCard");
  const menuForm = document.getElementById("menuForm");
  const menuFormTitle = document.getElementById("menuFormTitle");
  const menuCancelBtn = document.getElementById("menuCancelBtn");
  const menuSaveBtn = document.getElementById("menuSaveBtn");
  const menuId = document.getElementById("menuId");
  const menuName = document.getElementById("menuName");
  const menuCategory = document.getElementById("menuCategory");
  const menuPrice = document.getElementById("menuPrice");
  const menuStatusInput = document.getElementById("menuStatusInput");
  const menuImage = document.getElementById("menuImage");
  const menuCurrentImagePath = document.getElementById("menuCurrentImagePath");
  const menuImagePreviewWrap = document.getElementById("menuImagePreviewWrap");
  const menuImagePreview = document.getElementById("menuImagePreview");

  // Orders / cart DOM refs
  const cartList = document.getElementById("cartList");
  const cartCount = document.getElementById("cartCount");
  const cartEmpty = document.getElementById("cartEmpty");
  const cartSearch = document.getElementById("cartSearch");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartDiscount = document.getElementById("cartDiscount");
  const cartTotal = document.getElementById("cartTotal");
  const membershipInput = document.getElementById("membershipInput");
  const membershipStatus = document.getElementById("membershipStatus");
  const cartSeeAll = document.getElementById("cartSeeAll");
  const completeOrderBtn = document.getElementById("completeOrderBtn");
  const customersPanel = document.getElementById("customers");
  const customerTableBody = document.getElementById("customerTableBody");
  const customerTableStatus = document.getElementById("customerTableStatus");
  const customerSearchInput = document.getElementById("customerSearchInput");
  const customerRefreshBtn = document.getElementById("customerRefreshBtn");
  const customerAddBtn = document.getElementById("customerAddBtn");
  const customerFormCard = document.getElementById("customerFormCard");
  const customerForm = document.getElementById("customerForm");
  const customerFormTitle = document.getElementById("customerFormTitle");
  const customerCancelBtn = document.getElementById("customerCancelBtn");
  const customerMembershipId = document.getElementById("customerMembershipId");
  const customerFirstName = document.getElementById("customerFirstName");
  const customerLastName = document.getElementById("customerLastName");
  const customerPhone = document.getElementById("customerPhone");
  const customerEmail = document.getElementById("customerEmail");
  const customerPassword = document.getElementById("customerPassword");
  const customerTier = document.getElementById("customerTier");
  const customerPoints = document.getElementById("customerPoints");
  const customerActive = document.getElementById("customerActive");
  const customerTotalCount = document.getElementById("customerTotalCount");
  const customerActiveCount = document.getElementById("customerActiveCount");
  const customerInactiveCount = document.getElementById("customerInactiveCount");
  const orderTableBody = document.getElementById("orderTableBody");
  const orderTableStatus = document.getElementById("orderTableStatus");
  const orderSearchInput = document.getElementById("orderSearchInput");
  const orderRefreshBtn = document.getElementById("orderRefreshBtn");
  const orderAddBtn = document.getElementById("orderAddBtn");
  const orderFormCard = document.getElementById("orderFormCard");
  const orderForm = document.getElementById("orderForm");
  const orderFormTitle = document.getElementById("orderFormTitle");
  const orderCancelBtn = document.getElementById("orderCancelBtn");
  const orderSaveBtn = document.getElementById("orderSaveBtn");
  const orderId = document.getElementById("orderId");
  const orderMembershipId = document.getElementById("orderMembershipId");
  const orderTableId = document.getElementById("orderTableId");
  const orderDate = document.getElementById("orderDate");
  const orderStatusInput = document.getElementById("orderStatusInput");
  const orderPaymentStatusInput = document.getElementById("orderPaymentStatusInput");
  const orderMenuField = document.getElementById("orderMenuField");
  const orderQtyField = document.getElementById("orderQtyField");
  const orderMenuId = document.getElementById("orderMenuId");
  const orderMenuQty = document.getElementById("orderMenuQty");
  const orderSelectedItemsField = document.getElementById("orderSelectedItemsField");
  const orderAddMenuItemBtn = document.getElementById("orderAddMenuItemBtn");
  const orderSelectedItemsList = document.getElementById("orderSelectedItemsList");
  const orderDetailsText = document.getElementById("orderDetailsText");
  const kitchenQueueBody = document.getElementById("kitchenQueueBody");
  const kitchenQueueStatus = document.getElementById("kitchenQueueStatus");

  // Cart state
  const CART_KEY = "ff_cart_items";
  const MEMBERSHIP_CODE = "AZ253GNX";
  const MEMBERSHIP_RATE = 0.2;
  const MEMBERSHIP_API = "/api/memberships";
  const ORDERS_API = "/api/orders";
  const KITCHEN_QUEUE_API = "/api/orders/kitchen/queue";
  let cartItems = [];
  let membershipApplied = false;
  let customerRows = [];
  let menuRows = [];
  let orderRows = [];
  let orderMembershipRows = [];
  let orderMenuRows = [];
  let orderDiningTableRows = [];
  let orderCreateItems = [];

  function formatPrice(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return "N/A";
    return `฿ ${parsed.toFixed(2)}`;
  }

  function createPlaceholderLetter(name) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  function buildImageSrc(name) {
    const normalizedName = String(name || "item")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/\.+$/g, "") || "item";
    const filename = `${normalizedName}.png`;
    return `/assets/images/${encodeURIComponent(filename)}`;
  }

  function resolveMenuImageUrl(item) {
    const imagePath = (item?.image_path || "").trim();
    if (!imagePath) return buildImageSrc(item?.menu_name);
    return imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  }

  function renderMenuItems(items) {
    if (!menuGrid) return;
    menuGrid.innerHTML = "";

    if (!Array.isArray(items) || items.length === 0) {
      if (menuStatus) {
        menuStatus.textContent = "No menu items found.";
        menuStatus.style.display = "block";
      }
      return;
    }

    if (menuStatus) {
      menuStatus.style.display = "none";
    }

    // Create menu cards
    items.forEach((item) => {
      const available = (item.status || "").toLowerCase() === "available";

      const card = document.createElement("article");
      card.className =
        "menu-card" + (available ? "" : " menu-card--unavailable");
      card.style.setProperty("--menu-accent", "var(--idx-accent)");

      const image = document.createElement("div");
      image.className = "menu-card__image";

      const img = document.createElement("img");
      img.src = resolveMenuImageUrl(item);
      img.alt = item.menu_name || "Menu item";
      img.loading = "lazy";
      img.onerror = () => {
        img.remove();
        image.classList.add("menu-card__image--placeholder");
        image.textContent = createPlaceholderLetter(item.menu_name);
      };
      image.appendChild(img);

      const badge = document.createElement("span");
      badge.className = "menu-card__badge";
      badge.textContent = available ? item.category_name || "" : "Unavailable";
      image.appendChild(badge);

      const body = document.createElement("div");
      body.className = "menu-card__body";

      const heading = document.createElement("div");
      heading.className = "menu-card__heading";

      const nameEl = document.createElement("h3");
      nameEl.className = "menu-card__name";
      nameEl.textContent = item.menu_name || "Untitled";

      const priceEl = document.createElement("span");
      priceEl.className = "menu-card__price";
      priceEl.textContent = formatPrice(item.price);

      heading.appendChild(nameEl);
      heading.appendChild(priceEl);

      body.appendChild(heading);

      const footer = document.createElement("div");
      footer.className = "menu-card__footer";

      const qtyInCart = getCartQty(item.menu_id);

      if (available && qtyInCart > 0) {
        const stepper = document.createElement("div");
        stepper.className = "qty-stepper";

        const minus = document.createElement("button");
        minus.type = "button";
        minus.className = "qty-btn";
        minus.textContent = "−";
        minus.addEventListener("click", () => updateQuantity(item.menu_id, -1));

        const qty = document.createElement("span");
        qty.className = "qty-value";
        qty.textContent = formatQty(qtyInCart);

        const plus = document.createElement("button");
        plus.type = "button";
        plus.className = "qty-btn";
        plus.textContent = "+";
        plus.addEventListener("click", () => updateQuantity(item.menu_id, 1));

        stepper.appendChild(minus);
        stepper.appendChild(qty);
        stepper.appendChild(plus);
        footer.appendChild(stepper);
      } else {
        const cta = document.createElement("button");
        cta.className = "menu-card__cta";
        cta.textContent = available ? "Add to order" : "Out of stock";
        cta.disabled = !available;
        cta.addEventListener("click", () => addToCart(item));
        footer.appendChild(cta);
      }

      card.appendChild(image);
      card.appendChild(body);
      card.appendChild(footer);

      menuGrid.appendChild(card);
    });
  }

  async function loadMenus() {
    if (menuStatus) {
      menuStatus.textContent = "Loading menu items...";
      menuStatus.style.display = "block";
    }
    if (menuTableStatus) {
      menuTableStatus.textContent = "Loading menus...";
      menuTableStatus.classList.remove("hidden");
    }
    try {
      const res = await fetch(MENU_API);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      menuItemsCache = Array.isArray(data) ? data : [];
      menuRows = [...menuItemsCache].sort((a, b) => Number(b.menu_id) - Number(a.menu_id));
      buildMenuTableRows(menuRows);
      renderMenuItems(menuItemsCache);
      if (menuTableStatus) {
        menuTableStatus.textContent = menuRows.length ? "" : "No menus found.";
        if (menuRows.length) menuTableStatus.classList.add("hidden");
        else menuTableStatus.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Menu fetch error", err);
      if (menuStatus) {
        menuStatus.textContent = "Could not load menu items. Please try again.";
        menuStatus.style.display = "block";
      }
      if (menuGrid) menuGrid.innerHTML = "";
      menuRows = [];
      buildMenuTableRows(menuRows);
      if (menuTableStatus) {
        menuTableStatus.textContent = "Could not load menus.";
        menuTableStatus.classList.remove("hidden");
      }
    }
  }

  loadMenus();


  function renderMenuPreview(imageUrl) {
    if (!menuImagePreviewWrap || !menuImagePreview) return;
    const normalized = (imageUrl || "").trim();
    if (!normalized) {
      menuImagePreviewWrap.classList.add("hidden");
      menuImagePreview.removeAttribute("src");
      return;
    }
    menuImagePreview.src = normalized;
    menuImagePreviewWrap.classList.remove("hidden");
  }

  function openMenuForm(mode, row) {
    if (!menuFormCard || !menuForm) return;
    menuFormCard.classList.remove("hidden");
    menuForm.dataset.mode = mode;
    if (menuFormTitle) {
      menuFormTitle.textContent = mode === "edit" ? "Edit Menu" : mode === "view" ? "View Menu" : "Add Menu";
    }

    const isReadOnly = mode === "view";
    const inputs = menuForm.querySelectorAll("input, select");
    inputs.forEach((input) => {
      if (input.id === "menuId" || input.id === "menuCurrentImagePath") return;
      input.disabled = isReadOnly;
    });
    if (menuSaveBtn) menuSaveBtn.classList.toggle("hidden", isReadOnly);

    if (row) {
      menuId.value = row.menu_id || "";
      menuName.value = row.menu_name || "";
      menuCategory.value = row.category_name || "";
      menuPrice.value = Number(row.price) || 0;
      menuStatusInput.value = (row.status || "available").toLowerCase();
      menuCurrentImagePath.value = row.image_path || "";
      renderMenuPreview(resolveMenuImageUrl(row));
    } else {
      menuId.value = "";
      menuName.value = "";
      menuCategory.value = "";
      menuPrice.value = "";
      menuStatusInput.value = "available";
      menuCurrentImagePath.value = "";
      renderMenuPreview("");
    }
    if (menuImage) menuImage.value = "";
  }

  function closeMenuForm() {
    if (!menuFormCard || !menuForm) return;
    menuFormCard.classList.add("hidden");
    menuForm.reset();
    menuId.value = "";
    menuCurrentImagePath.value = "";
    renderMenuPreview("");
    const inputs = menuForm.querySelectorAll("input, select");
    inputs.forEach((input) => {
      if (input.id === "menuId" || input.id === "menuCurrentImagePath") return;
      input.disabled = false;
    });
    if (menuSaveBtn) menuSaveBtn.classList.remove("hidden");
  }

  function buildMenuTableRows(rows) {
    if (!menuTableBody) return;
    const sourceRows = Array.isArray(rows) ? rows : [];
    const keyword = (menuSearchInput?.value || "").trim().toLowerCase();
    const filtered = !keyword
      ? sourceRows
      : sourceRows.filter((row) => {
          return (
            String(row.menu_name || "").toLowerCase().includes(keyword) ||
            String(row.category_name || "").toLowerCase().includes(keyword)
          );
        });

    if (!filtered.length) {
      menuTableBody.innerHTML = '<tr class="customer-empty-row"><td colspan="7">No menus found</td></tr>';
      return;
    }

    const html = filtered
      .map((row) => {
        const img = resolveMenuImageUrl(row);
        return `
          <tr data-menu-id="${escapeHtml(row.menu_id)}">
            <td>${escapeHtml(row.menu_id)}</td>
            <td>${escapeHtml(row.menu_name || "-")}</td>
            <td>${escapeHtml(row.category_name || "-")}</td>
            <td>${escapeHtml(Number(row.price || 0).toFixed(2))}</td>
            <td>${escapeHtml(row.status || "-")}</td>
            <td><img class="menu-table-thumb" src="${escapeHtml(img)}" alt="${escapeHtml(row.menu_name || "menu")}" /></td>
            <td>
              <div class="customer-row-actions">
                <button type="button" class="customer-action-btn menu-view-btn" data-id="${escapeHtml(row.menu_id)}">View</button>
                <button type="button" class="customer-action-btn menu-edit-btn" data-id="${escapeHtml(row.menu_id)}">Edit</button>
                <button type="button" class="customer-action-btn customer-action-btn--delete menu-delete-btn" data-id="${escapeHtml(row.menu_id)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
    menuTableBody.innerHTML = html;
  }

  async function saveMenu(event) {
    event.preventDefault();
    if (!menuForm) return;
    const mode = menuForm.dataset.mode === "edit" ? "edit" : "add";
    const id = Number(menuId.value);

    const payload = {
      menu_name: (menuName?.value || "").trim(),
      category_name: (menuCategory?.value || "").trim(),
      price: (menuPrice?.value || "").trim(),
      status: (menuStatusInput?.value || "available").trim().toLowerCase(),
      image_path: (menuCurrentImagePath?.value || "").trim(),
    };

    if (!payload.menu_name || !payload.category_name || !payload.price) {
      alert("Menu name, category and price are required.");
      return;
    }

    const formData = new FormData();
    formData.append("menu_name", payload.menu_name);
    formData.append("category_name", payload.category_name);
    formData.append("price", payload.price);
    formData.append("status", payload.status);
    if (payload.image_path) formData.append("image_path", payload.image_path);
    if (menuImage?.files?.[0]) formData.append("menuImage", menuImage.files[0]);

    const endpoint = mode === "edit" && id ? `${MENU_API}/${id}` : MENU_API;
    const method = mode === "edit" && id ? "PUT" : "POST";
    const prevText = menuSaveBtn ? menuSaveBtn.textContent : "";
    if (menuSaveBtn) {
      menuSaveBtn.disabled = true;
      menuSaveBtn.textContent = "Saving...";
    }

    try {
      const res = await fetch(endpoint, { method, body: formData });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
      closeMenuForm();
      await loadMenus();
    } catch (err) {
      console.error("Save menu failed", err);
      alert("Could not save menu.");
    } finally {
      if (menuSaveBtn) {
        menuSaveBtn.disabled = false;
        menuSaveBtn.textContent = prevText || "Save";
      }
    }
  }

  async function deleteMenu(id) {
    if (!id) return;
    const sure = window.confirm("Delete this menu?");
    if (!sure) return;
    try {
      const res = await fetch(`${MENU_API}/${id}`, { method: "DELETE" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
      await loadMenus();
    } catch (err) {
      console.error("Delete menu failed", err);
      alert("Could not delete menu.");
    }
  }

  function initMenuManagement() {
    if (!menuPanel || !menuTableBody) return;

    if (menuSearchInput) {
      menuSearchInput.addEventListener("input", () => buildMenuTableRows(menuRows));
    }
    if (menuRefreshBtn) {
      menuRefreshBtn.addEventListener("click", () => loadMenus());
    }
    if (menuAddBtn) {
      menuAddBtn.addEventListener("click", () => openMenuForm("add"));
    }
    if (menuCancelBtn) {
      menuCancelBtn.addEventListener("click", closeMenuForm);
    }
    if (menuImage) {
      menuImage.addEventListener("change", () => {
        const file = menuImage.files && menuImage.files[0];
        if (!file) {
          const existing = (menuCurrentImagePath?.value || "").trim();
          renderMenuPreview(existing || "");
          return;
        }
        const objectUrl = URL.createObjectURL(file);
        renderMenuPreview(objectUrl);
      });
    }
    if (menuForm) {
      menuForm.addEventListener("submit", saveMenu);
    }

    menuTableBody.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      if (!target) return;
      const id = Number(target.dataset.id);
      if (!Number.isFinite(id)) return;
      const row = menuRows.find((item) => Number(item.menu_id) === id);
      if (!row) return;

      if (target.classList.contains("menu-view-btn")) {
        openMenuForm("view", row);
        if (menuFormCard) menuFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (target.classList.contains("menu-edit-btn")) {
        openMenuForm("edit", row);
        if (menuFormCard) menuFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (target.classList.contains("menu-delete-btn")) {
        deleteMenu(id);
      }
    });
  }

  // Customer management
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatOrderDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString().slice(0, 10);
  }

  function toDateInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function getOrderCustomerName(membershipId) {
    const id = Number(membershipId);
    if (!Number.isFinite(id) || id <= 0) return "Walk-in";
    const member = orderMembershipRows.find((row) => Number(row.membership_id) === id);
    if (!member) return `Member #${id}`;
    const fullName = `${member.member_name || ""} ${member.member_lastname || ""}`.trim();
    return fullName || member.email || `Member #${id}`;
  }

  function renderOrderDetails(order) {
    if (!orderDetailsText) return;
    const details = Array.isArray(order?.details) ? order.details : [];
    if (!details.length) {
      orderDetailsText.value = "No order details.";
      return;
    }
    orderDetailsText.value = details
      .map((item) => {
        const name = item.menu_name || `Menu #${item.menu_id || "-"}`;
        const qty = Number(item.quantity) || 0;
        const sub = Number(item.sub_total) || 0;
        return `${name} x ${qty} = ${sub.toFixed(2)}`;
      })
      .join("\n");
  }

  function getOrderMenuById(menuId) {
    const id = Number(menuId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return orderMenuRows.find((row) => Number(row.menu_id) === id) || null;
  }

  function buildCreateOrderDetailsPreview() {
    return orderCreateItems.map((item) => {
      const menu = getOrderMenuById(item.menu_id);
      const name = menu?.menu_name || `Menu #${item.menu_id}`;
      const unitPrice = Number(menu?.price || 0);
      const qty = Number(item.quantity) || 1;
      return {
        menu_id: item.menu_id,
        menu_name: name,
        quantity: qty,
        sub_total: unitPrice * qty,
      };
    });
  }

  function renderCreateOrderItems() {
    if (!orderSelectedItemsList) return;
    if (!orderCreateItems.length) {
      orderSelectedItemsList.innerHTML = '<p class="customer-table-status">No menu items selected.</p>';
      renderOrderDetails({ details: [] });
      return;
    }

    const rowsHtml = orderCreateItems
      .map((item, index) => {
        const menu = getOrderMenuById(item.menu_id);
        const name = menu?.menu_name || `Menu #${item.menu_id}`;
        const unitPrice = Number(menu?.price || 0);
        const qty = Number(item.quantity) || 1;
        const subtotal = unitPrice * qty;
        return `
          <tr>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(unitPrice.toFixed(2))}</td>
            <td>
              <input
                type="number"
                min="1"
                step="1"
                class="order-selected-qty"
                data-index="${index}"
                value="${escapeHtml(qty)}"
              />
            </td>
            <td>${escapeHtml(subtotal.toFixed(2))}</td>
            <td>
              <button
                type="button"
                class="customer-action-btn customer-action-btn--delete order-selected-remove"
                data-index="${index}"
              >
                Remove
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    orderSelectedItemsList.innerHTML = `
      <table class="customer-table">
        <thead>
          <tr>
            <th>Menu</th>
            <th>Unit Price</th>
            <th>Qty</th>
            <th>Subtotal</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
    renderOrderDetails({ details: buildCreateOrderDetailsPreview() });
  }

  function renderExistingOrderItems(order) {
    if (!orderSelectedItemsList) return;
    const details = Array.isArray(order?.details) ? order.details : [];
    if (!details.length) {
      orderSelectedItemsList.innerHTML = '<p class="customer-table-status">No menu items in this order.</p>';
      return;
    }

    const rowsHtml = details
      .map((item) => {
        const name = item.menu_name || `Menu #${item.menu_id || "-"}`;
        const qty = Number(item.quantity) || 0;
        const subTotal = Number(item.sub_total) || 0;
        const unitPrice = qty > 0 ? subTotal / qty : Number(item.price) || 0;
        return `
          <tr>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(unitPrice.toFixed(2))}</td>
            <td>${escapeHtml(qty)}</td>
            <td>${escapeHtml(subTotal.toFixed(2))}</td>
            <td>-</td>
          </tr>
        `;
      })
      .join("");

    orderSelectedItemsList.innerHTML = `
      <table class="customer-table">
        <thead>
          <tr>
            <th>Menu</th>
            <th>Unit Price</th>
            <th>Qty</th>
            <th>Subtotal</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
  }

  function addCreateOrderItem(menuId, quantity) {
    const safeMenuId = Number(menuId);
    const safeQty = Number(quantity);
    if (!Number.isFinite(safeMenuId) || safeMenuId <= 0) return false;
    if (!Number.isFinite(safeQty) || safeQty <= 0) return false;
    const existing = orderCreateItems.find((item) => Number(item.menu_id) === safeMenuId);
    if (existing) {
      existing.quantity += safeQty;
    } else {
      orderCreateItems.push({ menu_id: safeMenuId, quantity: safeQty });
    }
    renderCreateOrderItems();
    return true;
  }

  function updateCreateOrderItemQty(index, quantity) {
    if (!Number.isFinite(index) || index < 0 || index >= orderCreateItems.length) return;
    const safeQty = Number(quantity);
    if (!Number.isFinite(safeQty) || safeQty <= 0) return;
    orderCreateItems[index].quantity = safeQty;
    renderCreateOrderItems();
  }

  function removeCreateOrderItem(index) {
    if (!Number.isFinite(index) || index < 0 || index >= orderCreateItems.length) return;
    orderCreateItems.splice(index, 1);
    renderCreateOrderItems();
  }

  function resetCreateOrderItems() {
    orderCreateItems = [];
    renderCreateOrderItems();
  }

  function setCreateOrderItemsFromDetails(order) {
    const details = Array.isArray(order?.details) ? order.details : [];
    orderCreateItems = details
      .map((item) => ({
        menu_id: Number(item.menu_id),
        quantity: Number(item.quantity),
      }))
      .filter((item) => Number.isFinite(item.menu_id) && item.menu_id > 0 && Number.isFinite(item.quantity) && item.quantity > 0);
    renderCreateOrderItems();
  }

  function populateOrderFormOptions() {
    if (orderMembershipId) {
      const prevMember = orderMembershipId.value || "";
      orderMembershipId.innerHTML = '<option value="">Walk-in customer</option>';
      orderMembershipRows.forEach((member) => {
        const option = document.createElement("option");
        option.value = String(member.membership_id);
        const fullName = `${member.member_name || ""} ${member.member_lastname || ""}`.trim();
        option.textContent = fullName || member.email || `Member #${member.membership_id}`;
        orderMembershipId.appendChild(option);
      });
      orderMembershipId.value = prevMember;
    }

    if (orderTableId) {
      const prevTableId = orderTableId.value || "";
      orderTableId.innerHTML = '<option value="">Walk-in / No table</option>';
      orderDiningTableRows.forEach((table) => {
        const id = Number(table.table_id);
        if (!Number.isFinite(id) || id <= 0) return;
        const option = document.createElement("option");
        option.value = String(id);
        const name = table.table_name || `Table ${id}`;
        const status = String(table.status || "").trim().toLowerCase() || "open";
        option.textContent = `${id} - ${name} (${status})`;
        orderTableId.appendChild(option);
      });
      orderTableId.value = prevTableId;
    }

    if (orderMenuId) {
      const prevMenu = orderMenuId.value || "";
      orderMenuId.innerHTML = '<option value="">Select menu</option>';
      orderMenuRows.forEach((menu) => {
        const option = document.createElement("option");
        option.value = String(menu.menu_id);
        option.textContent = `${menu.menu_name || "Untitled"} (${Number(menu.price || 0).toFixed(2)})`;
        orderMenuId.appendChild(option);
      });
      orderMenuId.value = prevMenu;
    }

    const mode = orderForm?.dataset?.mode || "";
    if (mode === "add" || mode === "edit") {
      renderCreateOrderItems();
    }
  }

  async function loadOrderDependencies() {
    try {
      const [memberRes, menuRes, tableRes] = await Promise.all([
        fetch(MEMBERSHIP_API, { cache: "no-store" }),
        fetch(MENU_API, { cache: "no-store" }),
        fetch("/api/tables", { cache: "no-store" }),
      ]);

      if (memberRes.ok) {
        const memberData = await memberRes.json();
        orderMembershipRows = Array.isArray(memberData) ? memberData : [];
      }

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        orderMenuRows = Array.isArray(menuData) ? menuData : [];
      }

      if (tableRes.ok) {
        const tableData = await tableRes.json();
        orderDiningTableRows = Array.isArray(tableData)
          ? tableData.sort((a, b) => Number(a.table_id) - Number(b.table_id))
          : [];
      }
    } catch (err) {
      console.error("Order dependency load failed", err);
    }

    populateOrderFormOptions();
  }

  async function fetchOrderById(id) {
    const res = await fetch(`${ORDERS_API}/${id}`, { cache: "no-store" });
    const text = await res.text();
    if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
    try {
      return JSON.parse(text);
    } catch (_err) {
      return null;
    }
  }

  function setOrderFormMode(mode) {
    if (!orderForm) return;
    orderForm.dataset.mode = mode;
    const readOnly = mode === "view";
    const editableDetailMode = mode === "add" || mode === "edit";
    const inputs = orderForm.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (input.id === "orderId") return;
      if (input.id === "orderDetailsText") {
        input.disabled = true;
        return;
      }
      input.disabled = readOnly;
    });
    if (orderMenuField) orderMenuField.classList.toggle("hidden", !editableDetailMode);
    if (orderQtyField) orderQtyField.classList.toggle("hidden", !editableDetailMode);
    if (orderSelectedItemsField) orderSelectedItemsField.classList.remove("hidden");
    if (orderAddMenuItemBtn) orderAddMenuItemBtn.disabled = readOnly || !editableDetailMode;
    if (orderAddMenuItemBtn) orderAddMenuItemBtn.classList.toggle("hidden", !editableDetailMode);
    if (orderSaveBtn) orderSaveBtn.classList.toggle("hidden", readOnly);
  }

  function openOrderForm(mode, order, detailOrder) {
    if (!orderFormCard || !orderForm) return;
    orderFormCard.classList.remove("hidden");
    setOrderFormMode(mode);
    if (orderFormTitle) {
      orderFormTitle.textContent = mode === "edit" ? "Edit Order" : mode === "view" ? "View Order" : "Create Order";
    }

    if (order) {
      orderId.value = order.order_id || "";
      orderMembershipId.value = order.membership_id ? String(order.membership_id) : "";
      orderTableId.value = order.table_id || "";
      orderDate.value = toDateInputValue(order.order_date) || toDateInputValue(new Date().toISOString());
      orderStatusInput.value = (order.order_status || "pending").toLowerCase();
      if (orderPaymentStatusInput) {
        orderPaymentStatusInput.value = (order.payment_status || "unpaid").toLowerCase();
      }
      const orderWithDetails = detailOrder || order;
      renderOrderDetails(orderWithDetails);
      if (mode === "edit") {
        setCreateOrderItemsFromDetails(orderWithDetails);
      } else {
        resetCreateOrderItems();
        renderExistingOrderItems(orderWithDetails);
      }
    } else {
      orderId.value = "";
      orderMembershipId.value = "";
      orderTableId.value = "";
      orderDate.value = toDateInputValue(new Date().toISOString());
      orderStatusInput.value = "pending";
      if (orderPaymentStatusInput) orderPaymentStatusInput.value = "unpaid";
      orderMenuId.value = "";
      orderMenuQty.value = "1";
      resetCreateOrderItems();
    }
  }

  function closeOrderForm() {
    if (!orderFormCard || !orderForm) return;
    orderFormCard.classList.add("hidden");
    orderForm.reset();
    orderId.value = "";
    orderMenuQty.value = "1";
    if (orderPaymentStatusInput) orderPaymentStatusInput.value = "unpaid";
    resetCreateOrderItems();
    setOrderFormMode("add");
  }

  function buildOrderTableRows(rows) {
    if (!orderTableBody) return;
    const sourceRows = Array.isArray(rows) ? rows : [];
    const keyword = (orderSearchInput?.value || "").trim().toLowerCase();
    const filtered = !keyword
      ? sourceRows
      : sourceRows.filter((row) => {
          const customer = getOrderCustomerName(row.membership_id).toLowerCase();
          const dateText = formatOrderDate(row.order_date).toLowerCase();
          const status = String(row.order_status || "").toLowerCase();
          const idText = String(row.order_id || "").toLowerCase();
          return (
            idText.includes(keyword) ||
            customer.includes(keyword) ||
            dateText.includes(keyword) ||
            status.includes(keyword)
          );
        });

    if (!filtered.length) {
      orderTableBody.innerHTML = '<tr class="customer-empty-row"><td colspan="8">No orders found</td></tr>';
      return;
    }

    const html = filtered
      .map((row) => {
        return `
          <tr data-order-id="${escapeHtml(row.order_id)}">
            <td>${escapeHtml(row.order_id)}</td>
            <td>${escapeHtml(getOrderCustomerName(row.membership_id))}</td>
            <td>${escapeHtml(formatOrderDate(row.order_date))}</td>
            <td>${escapeHtml(Number(row.total_price || 0).toFixed(2))}</td>
            <td>${escapeHtml(row.order_status || "-")}</td>
            <td>${escapeHtml((row.payment_status || "unpaid").toLowerCase())}</td>
            <td>${escapeHtml(row.receipt_no || "-")}</td>
            <td>
              <div class="customer-row-actions">
                <button type="button" class="customer-action-btn order-view-btn" data-id="${escapeHtml(row.order_id)}">View</button>
                <button type="button" class="customer-action-btn order-edit-btn" data-id="${escapeHtml(row.order_id)}">Edit</button>
                ${String(row.payment_status || "unpaid").toLowerCase() !== "paid"
                  ? `<button type="button" class="customer-action-btn order-pay-btn" data-id="${escapeHtml(row.order_id)}">Mark Paid</button>`
                  : `<button type="button" class="customer-action-btn order-receipt-btn" data-id="${escapeHtml(row.order_id)}">Receipt</button>`}
                <button type="button" class="customer-action-btn customer-action-btn--delete order-delete-btn" data-id="${escapeHtml(row.order_id)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
    orderTableBody.innerHTML = html;
  }

  async function loadOrders() {
    if (!orderTableStatus) return;
    orderTableStatus.textContent = "Loading orders...";
    orderTableStatus.classList.remove("hidden");
    await loadOrderDependencies();
    try {
      const res = await fetch(ORDERS_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      orderRows = Array.isArray(data) ? data.sort((a, b) => Number(b.order_id) - Number(a.order_id)) : [];
      buildOrderTableRows(orderRows);
      loadKitchenQueue();
      orderTableStatus.textContent = orderRows.length ? "" : "No orders found.";
      if (orderRows.length) orderTableStatus.classList.add("hidden");
      else orderTableStatus.classList.remove("hidden");
    } catch (err) {
      console.error("Order fetch error", err);
      orderRows = [];
      buildOrderTableRows(orderRows);
      loadKitchenQueue();
      orderTableStatus.textContent = "Could not load orders.";
      orderTableStatus.classList.remove("hidden");
    }
  }

  async function saveOrder(event) {
    event.preventDefault();
    if (!orderForm) return;
    const mode = orderForm.dataset.mode === "edit" ? "edit" : "add";
    const id = Number(orderId.value);

    const payload = {
      table_id: Number.isFinite(Number(orderTableId?.value)) && Number(orderTableId?.value) > 0 ? Number(orderTableId.value) : null,
      membership_id:
        Number.isFinite(Number(orderMembershipId?.value)) && Number(orderMembershipId?.value) > 0
          ? Number(orderMembershipId.value)
          : null,
      order_date: orderDate?.value || toDateInputValue(new Date().toISOString()),
      order_status: (orderStatusInput?.value || "pending").trim().toLowerCase(),
      payment_status: (orderPaymentStatusInput?.value || "unpaid").trim().toLowerCase(),
    };

    if (mode === "add" || mode === "edit") {
      const detailItems = orderCreateItems
        .map((item) => ({
          menu_id: Number(item.menu_id),
          quantity: Number(item.quantity),
        }))
        .filter((item) => Number.isFinite(item.menu_id) && item.menu_id > 0 && Number.isFinite(item.quantity) && item.quantity > 0);

      if (!detailItems.length) {
        alert("Please add at least one menu item.");
        return;
      }
      payload.details = detailItems;
    }

    const endpoint = mode === "edit" && id ? `${ORDERS_API}/${id}` : ORDERS_API;
    const method = mode === "edit" && id ? "PUT" : "POST";
    const prevText = orderSaveBtn ? orderSaveBtn.textContent : "";
    if (orderSaveBtn) {
      orderSaveBtn.disabled = true;
      orderSaveBtn.textContent = "Saving...";
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
      closeOrderForm();
      await loadOrders();
    } catch (err) {
      console.error("Save order failed", err);
      const message = String(err?.message || "").trim();
      alert(`Could not save order.${message ? `\n${message}` : ""}`);
    } finally {
      if (orderSaveBtn) {
        orderSaveBtn.disabled = false;
        orderSaveBtn.textContent = prevText || "Save";
      }
    }
  }

  async function deleteOrder(id) {
    if (!id) return;
    const sure = window.confirm("Delete this order?");
    if (!sure) return;
    try {
      const res = await fetch(`${ORDERS_API}/${id}`, { method: "DELETE" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
      await loadOrders();
    } catch (err) {
      console.error("Delete order failed", err);
      alert("Could not delete order.");
    }
  }

  function buildKitchenQueueRows(rows) {
    if (!kitchenQueueBody) return;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      kitchenQueueBody.innerHTML = '<tr class="customer-empty-row"><td colspan="4">No active kitchen orders</td></tr>';
      return;
    }

    const html = list
      .map((row) => `
        <tr>
          <td>${escapeHtml(row.order_id)}</td>
          <td>${escapeHtml(row.table_id || "-")}</td>
          <td>${escapeHtml(row.order_status || "-")}</td>
          <td>${escapeHtml(formatOrderDate(row.order_date))}</td>
        </tr>
      `)
      .join("");
    kitchenQueueBody.innerHTML = html;
  }

  async function loadKitchenQueue() {
    if (!kitchenQueueStatus) return;
    kitchenQueueStatus.textContent = "Loading kitchen queue...";
    kitchenQueueStatus.classList.remove("hidden");
    try {
      const res = await fetch(KITCHEN_QUEUE_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      buildKitchenQueueRows(rows);
      kitchenQueueStatus.textContent = rows.length ? "" : "No active kitchen orders.";
      if (rows.length) kitchenQueueStatus.classList.add("hidden");
      else kitchenQueueStatus.classList.remove("hidden");
    } catch (err) {
      console.error("Kitchen queue fetch error", err);
      buildKitchenQueueRows([]);
      kitchenQueueStatus.textContent = "Could not load kitchen queue.";
      kitchenQueueStatus.classList.remove("hidden");
    }
  }

  async function payOrder(id) {
    if (!id) return;
    const sure = window.confirm("Mark this order as paid and generate a receipt?");
    if (!sure) return;
    try {
      const res = await fetch(`${ORDERS_API}/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_charge: 0, tax: 0 }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
      await loadOrders();
    } catch (err) {
      console.error("Mark paid failed", err);
      alert("Could not mark this order as paid.");
    }
  }

  async function showReceipt(id) {
    if (!id) return;
    try {
      const res = await fetch(`${ORDERS_API}/${id}/receipt`, { cache: "no-store" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
      const data = JSON.parse(text);
      const message = [
        `Receipt: ${data.receipt_no || "-"}`,
        `Order ID: ${data.order_id}`,
        `Table: ${data.table_id || "-"}`,
        `Subtotal: ${formatPrice(data.subtotal || 0)}`,
        `Service Charge: ${formatPrice(data.service_charge || 0)}`,
        `Tax: ${formatPrice(data.tax || 0)}`,
        `Grand Total: ${formatPrice(data.grand_total || 0)}`,
      ].join("\n");
      alert(message);
    } catch (err) {
      console.error("Receipt fetch failed", err);
      alert("Could not load receipt.");
    }
  }

  function connectOrderStream() {
    if (!window.EventSource) return;
    try {
      const source = new EventSource("/api/orders/stream");
      const refresh = () => {
        loadOrders();
      };
      ["order_created", "order_updated", "order_paid", "order_deleted", "table_status_changed", "table_deleted"].forEach((eventName) => {
        source.addEventListener(eventName, refresh);
      });
      source.onerror = () => {
        // Keep fallback polling active if stream disconnects.
      };
    } catch (err) {
      console.error("Order stream connect failed", err);
    }
  }

  function initOrdersManagement() {
    if (!ordersPanel || !orderTableBody) return;

    if (orderSearchInput) {
      orderSearchInput.addEventListener("input", () => buildOrderTableRows(orderRows));
    }

    if (orderRefreshBtn) {
      orderRefreshBtn.addEventListener("click", () => loadOrders());
    }

    if (orderAddBtn) {
      orderAddBtn.addEventListener("click", async () => {
        await loadOrderDependencies();
        openOrderForm("add");
      });
    }

    if (orderCancelBtn) {
      orderCancelBtn.addEventListener("click", closeOrderForm);
    }

    if (orderForm) {
      orderForm.addEventListener("submit", saveOrder);
    }

    if (orderAddMenuItemBtn) {
      orderAddMenuItemBtn.addEventListener("click", () => {
        const menuIdVal = Number(orderMenuId?.value);
        const qtyVal = Number(orderMenuQty?.value);
        if (!Number.isFinite(menuIdVal) || menuIdVal <= 0) {
          alert("Please select a menu item.");
          return;
        }
        if (!Number.isFinite(qtyVal) || qtyVal <= 0) {
          alert("Quantity must be at least 1.");
          return;
        }
        const added = addCreateOrderItem(menuIdVal, qtyVal);
        if (!added) return;
        if (orderMenuId) orderMenuId.value = "";
        if (orderMenuQty) orderMenuQty.value = "1";
      });
    }

    if (orderSelectedItemsList) {
      orderSelectedItemsList.addEventListener("change", (event) => {
        const qtyInput = event.target.closest(".order-selected-qty");
        if (!qtyInput) return;
        const index = Number(qtyInput.dataset.index);
        const quantity = Number(qtyInput.value);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          alert("Quantity must be at least 1.");
          qtyInput.value = "1";
          updateCreateOrderItemQty(index, 1);
          return;
        }
        updateCreateOrderItemQty(index, quantity);
      });

      orderSelectedItemsList.addEventListener("click", (event) => {
        const removeBtn = event.target.closest(".order-selected-remove");
        if (!removeBtn) return;
        const index = Number(removeBtn.dataset.index);
        removeCreateOrderItem(index);
      });
    }

    orderTableBody.addEventListener("click", async (event) => {
      const target = event.target.closest("button");
      if (!target) return;
      const id = Number(target.dataset.id);
      if (!Number.isFinite(id)) return;
      const row = orderRows.find((item) => Number(item.order_id) === id);
      if (!row) return;

      if (target.classList.contains("order-view-btn")) {
        try {
          const detailOrder = await fetchOrderById(id);
          openOrderForm("view", row, detailOrder);
          if (orderFormCard) orderFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          console.error("Order detail load failed", err);
          alert("Could not load order detail.");
        }
        return;
      }

      if (target.classList.contains("order-edit-btn")) {
        try {
          const detailOrder = await fetchOrderById(id);
          await loadOrderDependencies();
          openOrderForm("edit", row, detailOrder);
          if (orderFormCard) orderFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          console.error("Order edit load failed", err);
          alert("Could not load order data.");
        }
        return;
      }

      if (target.classList.contains("order-delete-btn")) {
        deleteOrder(id);
        return;
      }

      if (target.classList.contains("order-pay-btn")) {
        payOrder(id);
        return;
      }

      if (target.classList.contains("order-receipt-btn")) {
        showReceipt(id);
      }
    });

    loadOrders();
    connectOrderStream();
    setInterval(() => {
      loadOrders();
    }, 15000);
  }

  function updateCustomerSummary(items) {
    const list = Array.isArray(items) ? items : [];
    const total = list.length;
    const active = list.filter((item) => Number(item.active) === 1).length;
    const inactive = Math.max(0, total - active);
    if (customerTotalCount) customerTotalCount.textContent = total.toString();
    if (customerActiveCount) customerActiveCount.textContent = active.toString();
    if (customerInactiveCount) customerInactiveCount.textContent = inactive.toString();
  }

  function openCustomerForm(mode, row) {
    if (!customerFormCard || !customerForm) return;
    customerFormCard.classList.remove("hidden");
    customerForm.dataset.mode = mode;
    if (customerFormTitle) {
      customerFormTitle.textContent = mode === "edit" ? "Edit Customer" : "Add Customer";
    }

    if (mode === "edit" && row) {
      customerMembershipId.value = row.membership_id || "";
      customerFirstName.value = row.member_name || "";
      customerLastName.value = row.member_lastname || "";
      customerPhone.value = row.phone || "";
      customerEmail.value = row.email || "";
      customerPassword.value = "";
      customerTier.value = row.tier || "basic";
      customerPoints.value = Number(row.points) || 0;
      customerActive.value = Number(row.active) === 0 ? "0" : "1";
      customerPassword.placeholder = "Leave blank to keep current password";
    } else {
      customerMembershipId.value = "";
      customerFirstName.value = "";
      customerLastName.value = "";
      customerPhone.value = "";
      customerEmail.value = "";
      customerPassword.value = "";
      customerTier.value = "basic";
      customerPoints.value = "0";
      customerActive.value = "1";
      customerPassword.placeholder = "";
    }
  }

  function closeCustomerForm() {
    if (!customerFormCard || !customerForm) return;
    customerFormCard.classList.add("hidden");
    customerForm.reset();
    customerMembershipId.value = "";
    customerTier.value = "basic";
    customerPoints.value = "0";
    customerActive.value = "1";
  }

  function buildCustomerTableRows(rows) {
    if (!customerTableBody) return;
    const sourceRows = Array.isArray(rows) ? rows : [];
    const keyword = (customerSearchInput?.value || "").trim().toLowerCase();
    const filtered = !keyword
      ? sourceRows
      : sourceRows.filter((row) => {
          const fullName = `${row.member_name || ""} ${row.member_lastname || ""}`.toLowerCase();
          return (
            fullName.includes(keyword) ||
            String(row.phone || "").toLowerCase().includes(keyword) ||
            String(row.email || "").toLowerCase().includes(keyword)
          );
        });

    customerTableBody.innerHTML = "";

    if (!filtered.length) {
      customerTableBody.innerHTML =
        '<tr class="customer-empty-row"><td colspan="5">No customers found</td></tr>';
      return;
    }

    const html = filtered
      .map((row) => {
        const fullName = `${row.member_name || ""} ${row.member_lastname || ""}`.trim() || "-";
        return `
          <tr data-customer-id="${row.membership_id}">
            <td>${escapeHtml(row.membership_id)}</td>
            <td>${escapeHtml(fullName)}</td>
            <td>${escapeHtml(row.phone || "-")}</td>
            <td>${escapeHtml(row.email || "-")}</td>
            <td>
              <div class="customer-row-actions">
                <button type="button" class="customer-action-btn customer-view-btn" data-id="${escapeHtml(row.membership_id)}">View</button>
                <button type="button" class="customer-action-btn customer-edit-btn" data-id="${escapeHtml(row.membership_id)}">Edit</button>
                <button type="button" class="customer-action-btn customer-action-btn--delete customer-delete-btn" data-id="${escapeHtml(row.membership_id)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    customerTableBody.innerHTML = html;
  }

  async function loadCustomers() {
    if (!customersPanel || !customerTableStatus) return;
    customerTableStatus.textContent = "Loading customers...";
    customerTableStatus.classList.remove("hidden");
    try {
      const res = await fetch(MEMBERSHIP_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      customerRows = Array.isArray(data) ? data.sort((a, b) => Number(b.membership_id) - Number(a.membership_id)) : [];
      updateCustomerSummary(customerRows);
      buildCustomerTableRows(customerRows);
      customerTableStatus.textContent = customerRows.length ? "" : "No customers found.";
      if (customerRows.length) customerTableStatus.classList.add("hidden");
      else customerTableStatus.classList.remove("hidden");
    } catch (err) {
      console.error("Customer fetch error", err);
      customerRows = [];
      updateCustomerSummary(customerRows);
      buildCustomerTableRows(customerRows);
      customerTableStatus.textContent = "Could not load customers.";
      customerTableStatus.classList.remove("hidden");
    }
  }

  async function saveCustomer(event) {
    event.preventDefault();
    if (!customerForm) return;
    const mode = customerForm.dataset.mode === "edit" ? "edit" : "add";
    const id = Number(customerMembershipId.value);
    const payload = {
      member_name: (customerFirstName?.value || "").trim(),
      member_lastname: (customerLastName?.value || "").trim(),
      phone: (customerPhone?.value || "").trim(),
      email: (customerEmail?.value || "").trim(),
      tier: (customerTier?.value || "basic").trim().toLowerCase(),
      points: Number(customerPoints?.value) || 0,
      active: Number(customerActive?.value) === 0 ? 0 : 1,
    };

    if (!payload.member_name || !payload.email) {
      alert("First name and email are required.");
      return;
    }

    const passwordValue = (customerPassword?.value || "").trim();
    if (mode === "add") {
      if (!passwordValue) {
        alert("Password is required for a new customer.");
        return;
      }
      payload.password = passwordValue;
    } else if (passwordValue) {
      payload.password = passwordValue;
    }

    const endpoint = mode === "edit" && id ? `${MEMBERSHIP_API}/${id}` : MEMBERSHIP_API;
    const method = mode === "edit" && id ? "PUT" : "POST";
    const saveBtn = document.getElementById("customerSaveBtn");
    const prevText = saveBtn ? saveBtn.textContent : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
      closeCustomerForm();
      await loadCustomers();
    } catch (err) {
      console.error("Save customer failed", err);
      alert("Could not save customer data.");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = prevText || "Save";
      }
    }
  }

  async function deleteCustomer(id) {
    if (!id) return;
    const sure = window.confirm("Delete this customer?");
    if (!sure) return;
    try {
      const res = await fetch(`${MEMBERSHIP_API}/${id}`, { method: "DELETE" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
      await loadCustomers();
    } catch (err) {
      console.error("Delete customer failed", err);
      alert("Could not delete this customer.");
    }
  }

  function initCustomerManagement() {
    if (!customersPanel || !customerTableBody) return;

    if (customerSearchInput) {
      customerSearchInput.addEventListener("input", () => {
        buildCustomerTableRows(customerRows);
      });
    }

    if (customerRefreshBtn) {
      customerRefreshBtn.addEventListener("click", () => {
        loadCustomers();
      });
    }

    if (customerAddBtn) {
      customerAddBtn.addEventListener("click", () => openCustomerForm("add"));
    }

    if (customerCancelBtn) {
      customerCancelBtn.addEventListener("click", () => closeCustomerForm());
    }

    if (customerForm) {
      customerForm.addEventListener("submit", saveCustomer);
    }

    customerTableBody.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      if (!target) return;
      const id = Number(target.dataset.id);
      if (!Number.isFinite(id)) return;
      const row = customerRows.find((item) => Number(item.membership_id) === id);
      if (!row) return;

      if (target.classList.contains("customer-view-btn")) {
        openCustomerForm("edit", row);
        if (customerFormCard) customerFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (target.classList.contains("customer-edit-btn")) {
        openCustomerForm("edit", row);
        if (customerFormCard) customerFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (target.classList.contains("customer-delete-btn")) {
        deleteCustomer(id);
      }
    });

    loadCustomers();
  }

  // Cart helpers
  function persistCart() {
    if (!cartItems) return;
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({ items: cartItems, membershipApplied }),
    );
  }

  function loadCart() {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      cartItems = Array.isArray(parsed.items) ? parsed.items : [];
      membershipApplied = Boolean(parsed.membershipApplied);
      if (membershipApplied && membershipStatus) {
        membershipStatus.className = "pill pill--success";
        membershipStatus.textContent = "Available";
      }
    } catch (err) {
      console.error("Cart load error", err);
    }
  }

  function addToCart(item) {
    if (!item || !item.menu_id) return;
    const existing = cartItems.find((it) => it.menu_id === item.menu_id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cartItems.push({
        menu_id: item.menu_id,
        menu_name: item.menu_name,
        category_name: item.category_name,
        price: Number(item.price) || 0,
        quantity: 1,
      });
    }
    persistCart();
    renderCart();
    if (menuItemsCache.length) renderMenuItems(menuItemsCache);
  }

  function removeFromCart(id) {
    cartItems = cartItems.filter((item) => item.menu_id !== id);
    persistCart();
    renderCart();
    if (menuItemsCache.length) renderMenuItems(menuItemsCache);
  }

  function updateQuantity(id, delta) {
    const target = cartItems.find((it) => it.menu_id === id);
    if (!target) return;
    const nextQty = (target.quantity || 1) + delta;
    if (nextQty <= 0) {
      cartItems = cartItems.filter((it) => it.menu_id !== id);
    } else {
      target.quantity = nextQty;
    }
    persistCart();
    renderCart();
    if (menuItemsCache.length) renderMenuItems(menuItemsCache);
  }

  function getCartQty(id) {
    const found = cartItems.find((it) => it.menu_id === id);
    return found ? found.quantity || 0 : 0;
  }

  function applyMembership(code) {
    const trimmed = (code || "").trim();
    membershipApplied = trimmed.toUpperCase() === MEMBERSHIP_CODE;
    if (membershipStatus) {
      membershipStatus.textContent = membershipApplied
        ? "Available"
        : trimmed
          ? "Invalid"
          : "Enter code";
      membershipStatus.className = `pill ${membershipApplied ? "pill--success" : trimmed ? "pill--danger" : "pill--neutral"}`;
    }
    persistCart();
    renderCart();
  }

  function calculateTotals(filteredItems) {
    const items = Array.isArray(filteredItems) ? filteredItems : cartItems;
    const subtotal = items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
      0,
    );
    const discountAmount = membershipApplied ? subtotal * MEMBERSHIP_RATE : 0;
    const total = Math.max(0, subtotal - discountAmount);
    return { subtotal, discountAmount, total };
  }

  function formatQty(value) {
    return value.toString().padStart(2, "0");
  }

  function renderCart() {
    if (!ordersPanel || !cartList) return;
    const keyword = (cartSearch?.value || "").trim().toLowerCase();
    const filtered = keyword
      ? cartItems.filter((item) =>
          (item.menu_name || "").toLowerCase().includes(keyword),
        )
      : cartItems;

    cartList.innerHTML = "";

    if (cartCount) {
      const count = cartItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
      cartCount.textContent = `Total Item (${formatQty(count)})`;
    }

    const totals = calculateTotals(cartItems);
    if (cartSubtotal) cartSubtotal.textContent = formatPrice(totals.subtotal);
    if (cartDiscount)
      cartDiscount.textContent = membershipApplied
        ? `${Math.round(MEMBERSHIP_RATE * 100)}%`
        : "0%";
    if (cartTotal) cartTotal.textContent = formatPrice(totals.total);

    if (completeOrderBtn) {
      const hasItems = cartItems.length > 0;
      completeOrderBtn.disabled = !hasItems;
    }

    if (!filtered.length) {
      if (cartEmpty) {
        cartEmpty.textContent = keyword
          ? "No items match your search."
          : "Add menu items to see them here.";
        cartEmpty.classList.remove("hidden");
      }
      return;
    }

    if (cartEmpty) cartEmpty.classList.add("hidden");

    filtered.forEach((item) => {
      const row = document.createElement("article");
      row.className = "cart-item";
      row.dataset.id = item.menu_id;

      const left = document.createElement("div");
      left.className = "cart-item__left";

      const thumb = document.createElement("div");
      thumb.className = "cart-thumb";
      const img = document.createElement("img");
      img.src = resolveMenuImageUrl(item);
      img.alt = item.menu_name || "Menu item";
      img.loading = "lazy";
      img.onerror = () => {
        img.remove();
        thumb.classList.add("cart-thumb--placeholder");
        thumb.textContent = createPlaceholderLetter(item.menu_name);
      };
      thumb.appendChild(img);

      const info = document.createElement("div");
      info.className = "cart-item__info";
      const name = document.createElement("p");
      name.className = "cart-item__name";
      name.textContent = item.menu_name || "Untitled";
      const meta = document.createElement("p");
      meta.className = "cart-item__meta";
      meta.textContent = item.category_name
        ? item.category_name
        : "Net Wt: 800g";
      info.appendChild(name);
      info.appendChild(meta);

      left.appendChild(thumb);
      left.appendChild(info);

      const right = document.createElement("div");
      right.className = "cart-item__right";

      const price = document.createElement("p");
      price.className = "cart-item__price";
      const total = (item.price || 0) * (item.quantity || 1);
      price.textContent = `Total: ${formatPrice(total)}`;

      const actions = document.createElement("div");
      actions.className = "cart-item__actions";

      const stepper = document.createElement("div");
      stepper.className = "qty-stepper";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "qty-btn";
      minus.textContent = "−";
      minus.addEventListener("click", () => updateQuantity(item.menu_id, -1));

      const qty = document.createElement("span");
      qty.className = "qty-value";
      qty.textContent = formatQty(item.quantity || 1);

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "qty-btn";
      plus.textContent = "+";
      plus.addEventListener("click", () => updateQuantity(item.menu_id, 1));

      stepper.appendChild(minus);
      stepper.appendChild(qty);
      stepper.appendChild(plus);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-btn icon-btn--danger";
      remove.setAttribute("aria-label", `Remove ${item.menu_name}`);
      remove.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
      remove.addEventListener("click", () => removeFromCart(item.menu_id));

      actions.appendChild(stepper);
      actions.appendChild(remove);

      right.appendChild(price);
      right.appendChild(actions);

      row.appendChild(left);
      row.appendChild(right);

      cartList.appendChild(row);
    });
  }

  // Event bindings
  if (cartSearch) {
    cartSearch.addEventListener("input", () => renderCart());
  }

  if (membershipInput) {
    membershipInput.addEventListener("input", (e) =>
      applyMembership(e.target.value),
    );
  }

  if (cartSeeAll) {
    cartSeeAll.addEventListener("click", () => {
      if (!cartSearch) return;
      cartSearch.value = "";
      renderCart();
    });
  }

  if (completeOrderBtn) {
    completeOrderBtn.addEventListener("click", completeOrder);
    // completeOrderBtn.addEventListener("click", () => {
    //   const membershipId = localStorage.getItem("ff_membership_id");
    //   console.log({
    //     order_status: "pending",
    //     table_id: tableId,
    //     membership_id: membershipId ? Number(membershipId) || null : null,
    //     details: cartItems.map((it) => ({
    //       menu_id: it.menu_id,
    //       quantity: it.quantity,
    //     })),
    //   });
    // });
  }

  function completeOrder() {
    if (!cartItems.length) return;
    if (!completeOrderBtn) return;
    completeOrderBtn.disabled = true;
    const prevText = completeOrderBtn.textContent;
    completeOrderBtn.textContent = "Placing order…";

    const rawMembershipId = localStorage.getItem("ff_membership_id");
    const parsedMembershipId = Number(rawMembershipId);
    const membershipId = Number.isFinite(parsedMembershipId) && parsedMembershipId > 0 ? parsedMembershipId : null;
    const safeTableId = Number.isFinite(tableId) && tableId > 0 ? tableId : null;

    const payload = {
      order_status: "pending",
      table_id: safeTableId,
      membership_id: membershipId,
      details: cartItems.map((it) => ({
        menu_id: it.menu_id,
        quantity: it.quantity,
      })),
    };

    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
        try {
          return JSON.parse(text);
        } catch (e) {
          return { raw: text };
        }
      })
      .then((data) => {
        cartItems = [];
        membershipApplied = false;
        persistCart();
        renderCart();
        if (menuItemsCache.length) renderMenuItems(menuItemsCache);
        const id = data.order_id || data.orderId || (data && data.id) || "—";
        alert(`Order placed successfully. Order ID: ${id}`);
      })
      .catch((err) => {
        console.error("Order submit error", err);
        console.error("Order payload (debug)", payload);
        alert("Could not place order. Please try again.");
      })
      .finally(() => {
        if (completeOrderBtn) {
          completeOrderBtn.disabled = true;
          completeOrderBtn.textContent = prevText || "Complete order";
        }
      });
  }

  // Initialize cart state
  loadCart();
  renderCart();
  initMenuManagement();
  initOrdersManagement();
  initCustomerManagement();
});
