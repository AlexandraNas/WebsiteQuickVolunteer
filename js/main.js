// QuickVolunteer · front-end behaviour
// Later, the forms will send their data to the Flask back end with fetch().

document.addEventListener("DOMContentLoaded", () => {
  setUpMobileMenu();
  setUpPasswordToggles();
  setUpSubscribeForm();
  setUpLoginForm();
  setUpSignupForm();
  setUpTaskFilters();
  setUpReportLinks();
});

/* ---------- Mobile menu ---------- */
function setUpMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const openBtn = document.querySelector(".menu-toggle");
  const closeBtn = document.querySelector(".menu-close");
  if (!menu || !openBtn || !closeBtn) return;

  const open = () => {
    menu.classList.add("is-open");
    document.body.classList.add("menu-open");
    openBtn.setAttribute("aria-expanded", "true");
    closeBtn.focus();
  };
  const close = () => {
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    openBtn.setAttribute("aria-expanded", "false");
    openBtn.focus();
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) close();
  });
  // Close the menu if the window grows to desktop size
  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => {
    if (e.matches && menu.classList.contains("is-open")) close();
  });
}

/* ---------- Show or hide password ---------- */
function setUpPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
}

/* ---------- Helpers ---------- */
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function markInvalid(input, invalid) {
  input.closest(".field__control").classList.toggle("is-invalid", invalid);
  input.setAttribute("aria-invalid", String(invalid));
}

function showError(form, message) {
  const box = form.querySelector(".form-error");
  if (!box) return;
  if (message) {
    const text = box.querySelector("span");
    if (text) text.textContent = message;
    box.classList.add("is-visible");
  } else {
    box.classList.remove("is-visible");
  }
}

/* ---------- Footer subscribe ---------- */
function setUpSubscribeForm() {
  const form = document.querySelector(".subscribe");
  if (!form) return;
  const note = document.querySelector(".subscribe-note");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input");
    note.hidden = false;
    if (isEmail(input.value)) {
      note.textContent = "Thanks! You are subscribed.";
      note.style.color = "";
      form.reset();
    } else {
      note.textContent = "Please enter a valid email address.";
      note.style.color = "var(--error)";
    }
  });
}

/* ---------- Log in ---------- */
function setUpLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");
    const emailOk = isEmail(email.value);
    const passwordOk = password.value.length > 0;
    markInvalid(email, !emailOk);
    markInvalid(password, !passwordOk);

    if (!emailOk || !passwordOk) {
      showError(form, "Email or password is incorrect.");
      return;
    }
    showError(form, null);
    // One login for everyone: Flask checks the account type and sends
    // users to Find a task and the administrator to the admin page.
    window.location.href = "find-a-task.html";
  });
}

/* ---------- Sign up ---------- */
function setUpSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;
  const success = form.querySelector(".form-success");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.querySelector("#fullname");
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");
    const confirm = form.querySelector("#confirm");
    const terms = form.querySelector("#terms");

    const checks = [
      [name, name.value.trim().length >= 2, "Please enter your full name."],
      [email, isEmail(email.value), "Please enter a valid email address."],
      [password, password.value.length >= 8, "Your password needs at least 8 characters."],
      [confirm, confirm.value === password.value && confirm.value !== "", "The passwords do not match."],
    ];

    let firstMessage = null;
    checks.forEach(([input, ok, message]) => {
      markInvalid(input, !ok);
      if (!ok && !firstMessage) firstMessage = message;
    });
    if (!firstMessage && !terms.checked) {
      firstMessage = "Please agree to the Terms of Use and Privacy Policy.";
    }

    success.classList.remove("is-visible");
    if (firstMessage) {
      showError(form, firstMessage);
      return;
    }
    showError(form, null);
    success.textContent = "Account created. Our team will verify it shortly.";
    success.classList.add("is-visible");
    form.reset();
  });
}

/* ---------- Find a task: search and filter chips ---------- */
function setUpTaskFilters() {
  const list = document.getElementById("task-list");
  if (!list) return;
  const chips = document.querySelectorAll(".chip");
  const search = document.getElementById("task-search");
  const count = document.getElementById("task-count");
  const empty = document.getElementById("empty-state");
  const cards = Array.from(list.querySelectorAll(".task-card"));

  // Search text can also come from the mobile menu search (?q=...)
  const params = new URLSearchParams(window.location.search);
  if (params.get("q")) search.value = params.get("q");

  // Best match first: matched tasks go to the top
  cards
    .sort((a, b) => (b.dataset.match === "true") - (a.dataset.match === "true"))
    .forEach((card) => list.appendChild(card));

  let active = "all";

  function apply() {
    const text = search.value.trim().toLowerCase();
    let shown = 0;
    cards.forEach((card) => {
      const minutes = Number(card.dataset.minutes);
      const passFilter =
        active === "all" ||
        card.dataset.mode === active ||
        (active === "short" && minutes <= 30) ||
        (active === "match" && card.dataset.match === "true");
      const passSearch = !text || card.textContent.toLowerCase().includes(text);
      const visible = passFilter && passSearch;
      card.hidden = !visible;
      if (visible) shown++;
    });
    count.textContent = shown;
    empty.classList.toggle("is-visible", shown === 0);
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      active = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      apply();
    });
  });
  search.addEventListener("input", apply);
  apply();
}

/* ---------- Report a concern ---------- */
function setUpReportLinks() {
  document.querySelectorAll(".report").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.nextElementSibling && btn.nextElementSibling.classList.contains("report-note")) return;
      const note = document.createElement("p");
      note.className = "report-note";
      note.setAttribute("role", "status");
      note.textContent = "Thank you. Our team will review this concern.";
      btn.after(note);
    });
  });
}
