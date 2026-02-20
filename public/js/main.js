const root = document.documentElement;
const themeToggle = document.getElementById("toggleTheme");
const savedTheme = localStorage.getItem("theme");

function applyTheme(theme, persist = true) {
  root.dataset.theme = theme;
  if (persist) localStorage.setItem("theme", theme);
  if (themeToggle) {
    const isDark = theme === "dark";
    themeToggle.classList.toggle("active", isDark);
    themeToggle.setAttribute("aria-checked", String(isDark));
  }
  document.dispatchEvent(
    new CustomEvent("foodflow:theme-change", {
      detail: { theme },
    }),
  );
}

const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(savedTheme || systemTheme, false);

if (themeToggle) {
  themeToggle.setAttribute("role", "switch");
  themeToggle.setAttribute("tabindex", "0");

  const toggleTheme = () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  };

  themeToggle.addEventListener("click", toggleTheme);
  themeToggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTheme();
    }
  });
}
