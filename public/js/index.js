document.addEventListener("DOMContentLoaded", function () {
  const queryTableKey = new URLSearchParams(window.location.search).get("tableKey") || "";
  const pathTableKey = window.location.pathname.split("/").filter(Boolean)[0] || "";
  const tableKey = String(queryTableKey || pathTableKey).trim();
  const rootContainer = document.querySelector(".main-container");
  const tableId = Number(rootContainer?.dataset.tableId) || null;

  // Navbar profile hydrate
  const profileNameEl = document.getElementById("navbarName");
  const profileRoleEl = document.getElementById("navbarRole");
  const profileAvatarEl = document.getElementById("navbarAvatar");
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutModal = document.getElementById("logoutModal");
  const logoutConfirm = document.getElementById("logoutConfirm");
  const logoutCancel = document.getElementById("logoutCancel");
  const logoutClose = document.getElementById("logoutClose");
  const settingsMemberView = document.getElementById("settingsMemberView");
  const settingsGuestView = document.getElementById("settingsGuestView");
  const settingsFirstName = document.getElementById("settingsFirstName");
  const settingsLastName = document.getElementById("settingsLastName");
  const settingsEmail = document.getElementById("settingsEmail");
  const settingsPhone = document.getElementById("settingsPhone");
  const settingsPoints = document.getElementById("settingsPoints");
  const settingsTier = document.getElementById("settingsTier");
  const settingsEditBtn = document.getElementById("settingsEditBtn");
  const settingsEditForm = document.getElementById("settingsEditForm");
  const settingsEditFirstName = document.getElementById("settingsEditFirstName");
  const settingsEditLastName = document.getElementById("settingsEditLastName");
  const settingsEditPhone = document.getElementById("settingsEditPhone");
  const settingsEditPassword = document.getElementById("settingsEditPassword");
  const settingsEditStatus = document.getElementById("settingsEditStatus");
  const settingsEditCancelBtn = document.getElementById("settingsEditCancelBtn");
  const settingsEditSaveBtn = document.getElementById("settingsEditSaveBtn");
  let settingsMemberData = null;

  function setEditStatus(message) {
    if (!settingsEditStatus) return;
    settingsEditStatus.textContent = message || "";
  }

  function toggleEditMode(isEditing) {
    if (!settingsEditForm || !settingsEditBtn) return;
    settingsEditForm.classList.toggle("hidden", !isEditing);
    settingsEditBtn.classList.toggle("hidden", isEditing);
    if (!isEditing) setEditStatus("");
  }

  function fillEditFormFromMember() {
    if (!settingsEditForm || !settingsMemberData) return;
    if (settingsEditFirstName) settingsEditFirstName.value = settingsMemberData.member_name || "";
    if (settingsEditLastName) settingsEditLastName.value = settingsMemberData.member_lastname || "";
    if (settingsEditPhone) settingsEditPhone.value = settingsMemberData.phone || "";
    if (settingsEditPassword) settingsEditPassword.value = "";
  }

  function splitDisplayName(fullName) {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ");
    return { first, last };
  }

  function setSettingsValue(element, value, fallback = "-") {
    if (!element) return;
    const text = String(value || "").trim();
    element.textContent = text || fallback;
  }

  function formatTier(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function formatPoints(value) {
    const points = Number(value);
    if (!Number.isFinite(points)) return "-";
    return String(Math.max(0, Math.floor(points)));
  }

  async function renderSettingsProfile() {
    if (!settingsMemberView || !settingsGuestView) return;

    const isMember = localStorage.getItem("ff_member_isMember") === "true";
    if (!isMember) {
      settingsMemberData = null;
      settingsMemberView.classList.add("hidden");
      settingsGuestView.classList.remove("hidden");
      toggleEditMode(false);
      return;
    }

    settingsMemberView.classList.remove("hidden");
    settingsGuestView.classList.add("hidden");

    const displayName = (localStorage.getItem("ff_member_name") || "").trim();
    const emailFromStorage = (localStorage.getItem("ff_member_email") || "").trim();
    const membershipId = (localStorage.getItem("ff_membership_id") || "").trim();
    const nameParts = splitDisplayName(displayName);

    let memberData = {
      member_name: nameParts.first,
      member_lastname: nameParts.last,
      email: emailFromStorage,
      phone: "",
      points: null,
      tier: "",
      membership_id: membershipId || null,
    };

    if (membershipId) {
      try {
        const response = await fetch(`/api/memberships/${encodeURIComponent(membershipId)}`);
        if (response.ok) {
          const payload = await response.json();
          memberData = {
            ...memberData,
            ...payload,
          };
        }
      } catch (error) {
        console.warn("Could not load member profile for settings", error);
      }
    }

    setSettingsValue(settingsFirstName, memberData.member_name);
    setSettingsValue(settingsLastName, memberData.member_lastname);
    setSettingsValue(settingsEmail, memberData.email);
    setSettingsValue(settingsPhone, memberData.phone);
    setSettingsValue(settingsPoints, formatPoints(memberData.points));
    setSettingsValue(settingsTier, formatTier(memberData.tier));
    settingsMemberData = memberData;
    if (settingsEditForm && settingsEditForm.classList.contains("hidden")) {
      fillEditFormFromMember();
    }
  }

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
  renderSettingsProfile();

  if (settingsEditBtn) {
    settingsEditBtn.addEventListener("click", () => {
      fillEditFormFromMember();
      toggleEditMode(true);
    });
  }

  if (settingsEditCancelBtn) {
    settingsEditCancelBtn.addEventListener("click", () => {
      toggleEditMode(false);
    });
  }

  if (settingsEditForm) {
    settingsEditForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!settingsMemberData) {
        setEditStatus("Member profile not found.");
        return;
      }

      const membershipId =
        settingsMemberData.membership_id ||
        localStorage.getItem("ff_membership_id") ||
        "";
      if (!membershipId) {
        setEditStatus("Cannot update profile: membership id not found.");
        return;
      }

      const firstName = (settingsEditFirstName?.value || "").trim();
      const lastName = (settingsEditLastName?.value || "").trim();
      const phone = (settingsEditPhone?.value || "").trim();
      const password = (settingsEditPassword?.value || "").trim();

      if (!firstName) {
        setEditStatus("First name is required.");
        return;
      }

      if (password && password.length < 8) {
        setEditStatus("New password must be at least 8 characters.");
        return;
      }

      const payload = {
        member_name: firstName,
        member_lastname: lastName || null,
        phone: phone || null,
      };
      if (password) payload.password = password;

      const originalSaveText = settingsEditSaveBtn?.textContent || "Save";
      if (settingsEditSaveBtn) {
        settingsEditSaveBtn.disabled = true;
        settingsEditSaveBtn.textContent = "Saving...";
      }
      setEditStatus("Updating profile...");

      try {
        const response = await fetch(`/api/memberships/${encodeURIComponent(String(membershipId))}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setEditStatus(result.error || "Could not update profile.");
          return;
        }

        const fullName = [result.member_name, result.member_lastname]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (fullName) localStorage.setItem("ff_member_name", fullName);
        renderProfile();
        await renderSettingsProfile();
        toggleEditMode(false);
      } catch (error) {
        setEditStatus(`Could not update profile: ${error.message}`);
      } finally {
        if (settingsEditSaveBtn) {
          settingsEditSaveBtn.disabled = false;
          settingsEditSaveBtn.textContent = originalSaveText;
        }
      }
    });
  }

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

  if (logoutConfirm) {
    logoutConfirm.addEventListener("click", () => {
      try {
        localStorage.setItem("ff_member_isMember", "false");
        localStorage.removeItem("ff_member_name");
        localStorage.removeItem("ff_member_email");
        localStorage.removeItem("ff_member_id");
        localStorage.removeItem("ff_membership_id");
      } catch (_) {}
      if (document.body) document.body.classList.remove("no-scroll");
      window.location.href = tableKey
        ? `/member-login/${encodeURIComponent(tableKey)}`
        : "/";
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
  const menuSearchInput = document.getElementById("menuSearchInput");
  const menuCategoryFilter = document.getElementById("menuCategoryFilter");
  const MENU_API = "/api/menus";
  let menuItemsCache = [];

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

  // Cart state
  const CART_KEY = "ff_cart_items";
  const MEMBERSHIP_CODE = "AZ253GNX";
  const MEMBERSHIP_RATE = 0.2;
  let cartItems = [];
  let membershipApplied = false;

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

  function populateMenuCategoryOptions(items) {
    if (!menuCategoryFilter) return;
    const categories = Array.from(
      new Set(
        (Array.isArray(items) ? items : [])
          .map((item) => (item?.category_name || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const currentValue = menuCategoryFilter.value || "";
    menuCategoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      menuCategoryFilter.appendChild(option);
    });
    menuCategoryFilter.value = categories.includes(currentValue) ? currentValue : "";
  }

  function applyMenuFilters() {
    const keyword = (menuSearchInput?.value || "").trim().toLowerCase();
    const category = (menuCategoryFilter?.value || "").trim().toLowerCase();
    const filtered = (Array.isArray(menuItemsCache) ? menuItemsCache : []).filter((item) => {
      const name = String(item?.menu_name || "").toLowerCase();
      const itemCategory = String(item?.category_name || "").toLowerCase();
      const byKeyword = !keyword || name.includes(keyword);
      const byCategory = !category || itemCategory === category;
      return byKeyword && byCategory;
    });
    renderMenuItems(filtered);
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
    if (!menuStatus) return;
    menuStatus.textContent = "Loading menu items…";
    menuStatus.style.display = "block";
    try {
      const res = await fetch(MENU_API);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      menuItemsCache = Array.isArray(data) ? data : [];
      populateMenuCategoryOptions(menuItemsCache);
      applyMenuFilters();
    } catch (err) {
      console.error("Menu fetch error", err);
      menuStatus.textContent = "Could not load menu items. Please try again.";
      menuStatus.style.display = "block";
      if (menuGrid) menuGrid.innerHTML = "";
    }
  }

  loadMenus();

  if (menuSearchInput) {
    menuSearchInput.addEventListener("input", applyMenuFilters);
  }
  if (menuCategoryFilter) {
    menuCategoryFilter.addEventListener("change", applyMenuFilters);
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
    applyMenuFilters();
  }

  function removeFromCart(id) {
    cartItems = cartItems.filter((item) => item.menu_id !== id);
    persistCart();
    renderCart();
    applyMenuFilters();
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
    applyMenuFilters();
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
});
