const root = document.documentElement;
const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  // user เคยเลือกเอง
  root.dataset.theme = savedTheme;
} else {
  // default = ตามระบบ
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  root.dataset.theme = systemTheme;
}

document.getElementById("toggleTheme").onclick = () => {
  const newTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = newTheme;
  localStorage.setItem("theme", newTheme);
};