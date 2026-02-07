document.addEventListener("DOMContentLoaded", function () {
  // Tab functionality
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
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

  function formatPrice(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return "N/A";
    return `THB ${parsed.toFixed(2)}`;
  }

  function createPlaceholderLetter(name) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  function buildImageSrc(name) {
    const safe = encodeURIComponent((name || "item").trim());
    return `/assets/images/${safe}.png`;
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
      card.className = "menu-card" + (available ? "" : " menu-card--unavailable");
      card.style.setProperty("--menu-accent", "var(--idx-accent)");

      const image = document.createElement("div");
      image.className = "menu-card__image";

      const img = document.createElement("img");
      img.src = buildImageSrc(item.menu_name);
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
      badge.textContent = available ? (item.category_name || "") : "Unavailable";
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

      const cta = document.createElement("button");
      cta.className = "menu-card__cta";
      cta.textContent = available ? "Add to order" : "Out of stock";
      cta.disabled = !available;
      footer.appendChild(cta);

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
      renderMenuItems(data);
    } catch (err) {
      console.error("Menu fetch error", err);
      menuStatus.textContent = "Could not load menu items. Please try again.";
      menuStatus.style.display = "block";
      if (menuGrid) menuGrid.innerHTML = "";
    }
  }

  loadMenus();
});
