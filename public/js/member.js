// unified login/register validation
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".auth-form");
  const status = document.getElementById("memberStatus");

  function setStatus(text, tone = "muted") {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone;
  }

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = (data.get("email") || "").toString().trim();
    const password = (data.get("password") || "").toString();

    const firstName = (data.get("firstName") || "").toString().trim();
    const lastName = (data.get("lastName") || "").toString().trim();
    const confirm = (data.get("confirmPassword") || "").toString();
    const accepted = data.get("terms") === "on";

    const isRegister = Boolean(form.querySelector("[name='firstName']"));

    // shared checks
    if (!email || !password) {
      return setStatus("Please fill in email and password.", "warn");
    }
    if (!email.includes("@")) {
      return setStatus("Please enter a valid email.", "warn");
    }

    if (!isRegister) {
      return setStatus("Signing you in...", "ok");
    }

    // register-only checks
    if (!firstName) {
      return setStatus("Please enter your first name.", "warn");
    }
    if (password.length < 8) {
      return setStatus("Password must be at least 8 characters.", "warn");
    }
    if (password !== confirm) {
      return setStatus("Passwords do not match.", "warn");
    }
    if (!accepted) {
      return setStatus("Please accept the terms to continue.", "warn");
    }

    setStatus("Creating your account...", "ok");
  });
});
