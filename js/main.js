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
  setUpOnboarding();
  setUpDashboard();
  setUpLogout();
});

/* ---------- Saved profile (prototype only) ----------
   For now the profile is kept in the browser with localStorage.
   Later Flask will save it in MySQL (USERS: postcode, account_type,
   skills) and send it back with fetch(). */
const PROFILE_KEY = "qv_profile";
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch (e) { return {}; }
}
function saveProfile(profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) { /* storage blocked */ }
}

/* ---------- Onboarding (3 steps) ---------- */
function setUpOnboarding() {
  const form = document.getElementById("onboarding-form");
  if (!form) return;
  const steps = Array.from(form.querySelectorAll(".onboard-step"));
  const label = document.getElementById("step-label");
  const fill = document.getElementById("progress-fill");
  const back = document.getElementById("onboard-back");
  const next = document.getElementById("onboard-next");
  const saved = loadProfile();
  let current = 1;

  // Fill in anything already saved, so "Edit preferences" works too
  if (saved.postcode) form.postcode.value = saved.postcode;
  if (saved.area) form.area.value = saved.area;
  if (saved.distance) form.querySelector(`[name=distance][value="${saved.distance}"]`).checked = true;
  if (saved.role) form.querySelector(`[name=role][value="${saved.role}"]`).checked = true;
  if (saved.mode) form.querySelector(`[name=mode][value="${saved.mode}"]`).checked = true;
  (saved.skills || []).forEach((k) => {
    const box = form.querySelector(`[name=skills][value="${k}"]`);
    if (box) box.checked = true;
  });

  const role = () => (form.querySelector("[name=role]:checked") || {}).value;

  function show(step, moveFocus = true) {
    current = step;
    steps.forEach((s) => s.classList.toggle("is-active", Number(s.dataset.step) === step));
    label.textContent = `Step ${step} of 3`;
    fill.style.width = `${(step / 3) * 100}%`;
    back.hidden = step === 1;
    next.textContent = step === 3 ? "Finish" : "Continue";
    showError(form, null);

    // Step 3 wording changes for people who only ask for help
    if (step === 3) {
      const askOnly = role() === "help_seeker";
      form.querySelector("[data-step3-title]").textContent = askOnly
        ? "What do you usually need help with?" : "What can you help with?";
      form.querySelector("[data-step3-text]").textContent = askOnly
        ? "This helps us suggest the right volunteers for your requests."
        : "Pick your skills so we can show the best matched tasks first.";
      form.querySelector("[data-skills-legend]").textContent = askOnly ? "Types of help" : "Your skills";
    }
    const heading = steps[step - 1].querySelector("h1");
    if (heading && moveFocus) { heading.setAttribute("tabindex", "-1"); heading.focus(); }
  }

  function validate(step) {
    if (step === 1) {
      const ok = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(form.postcode.value.trim());
      markInvalid(form.postcode, !ok);
      const areaOk = form.area.value.trim().length > 1;
      markInvalid(form.area, !areaOk);
      if (!ok) return "Please enter a valid UK postcode, for example E8 1AB.";
      if (!areaOk) return "Please enter your neighbourhood.";
    }
    if (step === 2 && !role()) return "Please choose how you would like to take part.";
    if (step === 3 && !form.querySelector("[name=skills]:checked")) return "Please choose at least one option.";
    return null;
  }

  back.addEventListener("click", () => show(current - 1));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const problem = validate(current);
    if (problem) { showError(form, problem); return; }
    if (current < 3) { show(current + 1); return; }

    saveProfile({
      ...saved,
      postcode: form.postcode.value.trim().toUpperCase(),
      area: form.area.value.trim(),
      distance: form.querySelector("[name=distance]:checked").value,
      role: role(),
      skills: Array.from(form.querySelectorAll("[name=skills]:checked")).map((b) => b.value),
      mode: form.querySelector("[name=mode]:checked").value,
    });
    window.location.href = "dashboard.html";
  });

  show(1, false);
}

/* ---------- Dashboard that adapts to the chosen role ---------- */
function setUpDashboard() {
  const dash = document.querySelector(".dash");
  if (!dash) return;
  const profile = loadProfile();
  const role = profile.role || "both";

  if (profile.area) {
    dash.querySelector("[data-area-label]").textContent =
      `${profile.area} · ${profile.postcode || ""} · up to ${profile.distance || 3} miles`;
  }
  const text = {
    help_seeker: "Post a small request and follow the offers from verified neighbours.",
    volunteer: "Here are tasks near you that match your skills and your free time.",
    both: "Switch between the help you give and the help you ask for.",
  };
  dash.querySelector("[data-role-text]").textContent = text[role];
  if (profile.skills && profile.skills.length && role !== "help_seeker") {
    dash.querySelector("[data-skills-text]").textContent =
      `Matched to your skills: ${profile.skills.join(", ")}.`;
  }

  const panels = dash.querySelectorAll(".dash-panel");
  const tabs = dash.querySelector(".dash-tabs");
  const showPanel = (name) => {
    panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });
    tabs.querySelectorAll(".dash-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  };

  if (role === "both") {
    tabs.hidden = false;
    tabs.querySelectorAll(".dash-tab").forEach((t) => t.addEventListener("click", () => showPanel(t.dataset.tab)));
    showPanel("give");
  } else {
    showPanel(role === "help_seeker" ? "ask" : "give");
  }
}

/* ---------- Name in the header, and log out ---------- */
function setUpLogout() {
  const profile = loadProfile();
  if (profile.name) {
    const first = profile.name.split(" ")[0];
    document.querySelectorAll("[data-first-name]").forEach((el) => { el.textContent = first; });
    document.querySelectorAll("[data-initial]").forEach((el) => { el.textContent = first.charAt(0).toUpperCase(); });
  }
  document.querySelectorAll("[data-logout]").forEach((a) => {
    a.addEventListener("click", () => { try { localStorage.removeItem(PROFILE_KEY); } catch (e) {} });
  });
}

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
    window.location.href = "dashboard.html";
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
    saveProfile({ name: name.value.trim(), email: email.value.trim() });
    success.textContent = "Account created. Next, tell us about your area.";
    success.classList.add("is-visible");
    setTimeout(() => { window.location.href = "onboarding.html"; }, 800);
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
