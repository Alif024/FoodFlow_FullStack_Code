const body = document.body;
const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  // user เคยเลือกเอง
  body.dataset.theme = savedTheme;
} else {
  // default = ตามระบบ
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  body.dataset.theme = systemTheme;
}

document.getElementById("toggleTheme").onclick = () => {
  const newTheme = document.body.dataset.theme === "dark" ? "light" : "dark";

  document.body.dataset.theme = newTheme;
  localStorage.setItem("theme", newTheme);
};

