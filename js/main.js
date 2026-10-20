// QuickVolunteer · front-end behaviour (no frameworks)
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
  setUpNotifications();
  setUpCounters();
  setUpRowFilters();
  setUpTaskDetail();
  setUpPostRequest();
  setUpCloseRequest();
  setUpOffers();
  setUpWithdraw();
  setUpHistory();
  setUpReview();
  setUpProfile();
  setUpReport();
  setUpAdmin();
  setUpSimpleForms();
  setUpTables();
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
  const askOnly = () => role() === "help_seeker";

  // People who only ask for help have 2 steps; everyone else has 3.
  // On step 2 the button stays disabled until a choice is made, and it
  // becomes "Finish" when the choice is "Ask for help".
  function updateButton() {
    const total = askOnly() ? 2 : 3;
    label.textContent = `Step ${current} of ${total}`;
    fill.style.width = `${(current / total) * 100}%`;
    const last = current === total;
    next.textContent = last ? "Finish" : "Continue";
    next.disabled = current === 2 && !role();
  }
  form.querySelectorAll("[name=role]").forEach((r) => r.addEventListener("change", updateButton));

  function saveAndFinish() {
    const stillAskOnly = askOnly();
    saveProfile({
      ...saved,
      postcode: form.postcode.value.trim().toUpperCase(),
      area: form.area.value.trim(),
      distance: form.querySelector("[name=distance]:checked").value,
      role: role(),
      skills: stillAskOnly ? [] : Array.from(form.querySelectorAll("[name=skills]:checked")).map((b) => b.value),
      mode: stillAskOnly ? null : form.querySelector("[name=mode]:checked").value,
      skipped: false,
    });
    window.location.href = "dashboard.html";
  }

  // Skip for now: keep what was typed (if valid) and go to the dashboard
  document.getElementById("onboard-skip").addEventListener("click", () => {
    const profile = { ...saved, skipped: !saved.role };
    if (!validate(1)) {
      profile.postcode = form.postcode.value.trim().toUpperCase();
      profile.area = form.area.value.trim();
    }
    markInvalid(form.postcode, false);
    markInvalid(form.area, false);
    saveProfile(profile);
    window.location.href = "dashboard.html";
  });

  function show(step, moveFocus = true) {
    current = step;
    steps.forEach((s) => s.classList.toggle("is-active", Number(s.dataset.step) === step));
    back.hidden = step === 1;
    showError(form, null);
    updateButton();

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
    if (current === 2 && askOnly()) { saveAndFinish(); return; }
    if (current < 3) { show(current + 1); return; }
    saveAndFinish();
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
    // members to their dashboard and the administrator to the admin page.
    // Prototype only: an email starting with "admin" opens the admin page.
    const isAdmin = email.value.trim().toLowerCase().startsWith("admin");
    window.location.href = isAdmin ? "admin.html" : "dashboard.html";
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
        (active === "match" && card.dataset.match === "true");
      const passType = !typeBox || !typeBox.value || card.dataset.skill === typeBox.value;
      const passLength = !lengthBox || !lengthBox.value || minutes <= Number(lengthBox.value);
      const passSearch = !text || card.textContent.toLowerCase().includes(text);
      const visible = passFilter && passType && passLength && passSearch;
      card.hidden = !visible;
      if (visible) shown++;
    });
    if (count) count.textContent = shown;
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
  // Type of help and duration (US-05). Later: GET /api/tasks?type=...&max_minutes=...
  const typeBox = document.getElementById("task-type");
  const lengthBox = document.getElementById("task-duration");
  [typeBox, lengthBox].forEach((box) => { if (box) box.addEventListener("change", apply); });
  apply();
}

/* ---------- Report a concern ---------- */
function setUpReportLinks() {
  document.querySelectorAll("button.report").forEach((btn) => {
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

/* ---------- Notifications in the top bar ---------- */
function setUpNotifications() {
  const boxes = document.querySelectorAll("[data-notif]");
  if (!boxes.length) return;
  const profile = loadProfile();
  const incomplete = !(profile.role && profile.postcode);

  boxes.forEach((box) => {
    const btn = box.querySelector(".notif__btn");
    const panel = box.querySelector(".notif__panel");
    box.querySelector(".notif__dot").hidden = !incomplete;
    box.querySelector("[data-notif-profile]").hidden = !incomplete;
    box.querySelector("[data-notif-empty]").hidden = incomplete;
    btn.setAttribute("aria-label", incomplete ? "Notifications, 1 new" : "Notifications");

    const close = () => { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });
}

/* =========================================================
   Inner pages
   Demo data below stands in for the Flask API. Each function
   says which request will replace it later.
   ========================================================= */

/* Demo tasks. Later: fetch(`/api/tasks/${id}`) returns the same fields. */
const DEMO_TASKS = {
  1: { title: "Mow a small back garden lawn", who: "Margaret O.", mode: "in_person", minutes: 45, when: "Sat 24 Oct, 10:00", where: "Hackney, 0.8 miles away", rating: "Joined October 2026", skills: ["Gardening"],
       description: "My back lawn is small but has grown too long for me to manage since my knee operation. The electric mower, extension lead and grass box are in the shed. It would also help to trim the edges if there is time." },
  2: { title: "Weekly check-in call with an older resident", who: "Tom B.", mode: "remote", minutes: 20, when: "Weekday afternoons", where: "By phone", rating: "Joined October 2026", skills: ["Phone calls"],
       description: "I am 82 and live on my own. A regular call once a week to chat would make a real difference to me. Any weekday after 14:00 suits me best." },
  3: { title: "Collect a click and collect grocery order", who: "Nadia R.", mode: "in_person", minutes: 30, when: "Mon 26 Oct, 14:00", where: "Dalston, 0.5 miles away", rating: "Joined October 2026", skills: ["Shopping"],
       description: "My order is already paid for and ready to collect from the supermarket on the high street. I need it brought to my flat on the second floor, as I cannot carry heavy bags at the moment. There are three bags." },
  4: { title: "Review a CV before a job application", who: "Amira K.", mode: "remote", minutes: 30, when: "Before Fri 30 Oct", where: "Online", rating: "Joined October 2026", skills: ["Writing and forms"],
       description: "I am returning to work after five years and applying for an administrative role. I would like someone to review my two page CV and suggest how to present my experience more clearly. I can share it by email or video call." },
  5: { title: "Help assemble a flat pack wardrobe", who: "Joe P.", mode: "in_person", minutes: 60, when: "Wed 28 Oct, 18:00", where: "Hackney Wick, 1.2 miles away", rating: "Joined October 2026", skills: ["Small repairs"],
       description: "I have a two door wardrobe with the instructions and all the tools. Some panels need two people to lift and hold in place, so I need a second pair of hands." },
  6: { title: "Translate a tenancy letter into Arabic", who: "Layla H.", mode: "remote", minutes: 15, when: "Before Sun 1 Nov", where: "Online", rating: "Joined October 2026", skills: ["Translation"],
       description: "My landlord has sent a two page letter about changes to my tenancy. I would like it translated into Arabic so my parents, who live with me, can understand it. I can share a photo of the letter." },
};

/* Character counters under text areas */
function setUpCounters() {
  document.querySelectorAll("[data-counter-for]").forEach((counter) => {
    const box = document.getElementById(counter.dataset.counterFor);
    if (!box) return;
    const update = () => { counter.textContent = `${box.value.length} / ${box.maxLength}`; };
    box.addEventListener("input", update);
    update();
  });
}

/* Check required fields inside a form. Returns the first problem or null. */
function checkRequired(form, extra = []) {
  let first = null;
  form.querySelectorAll("input[required], textarea[required], select[required]").forEach((el) => {
    if (el.closest("[hidden]")) { markInvalid(el, false); return; }
    let ok = el.value.trim() !== "";
    if (ok && el.type === "email") ok = isEmail(el.value);
    markInvalid(el, !ok);
    if (!ok && !first) {
      const label = form.querySelector(`label[for="${el.id}"]`);
      first = el.type === "email" && el.value.trim() ? "Please enter a valid email address."
        : `Please fill in: ${label ? label.firstChild.textContent.trim() : "this field"}.`;
    }
  });
  form.querySelectorAll("[data-required-group]").forEach((group) => {
    if (group.closest("[hidden]")) return;
    const ok = !!group.querySelector("input:checked");
    group.classList.toggle("is-invalid", !ok);
    if (!ok && !first) first = `Please choose: ${group.querySelector("legend").firstChild.textContent.trim()}.`;
  });
  extra.forEach(([ok, message]) => { if (!ok && !first) first = message; });
  return first;
}

/* Chip filters for lists (My requests) */
function setUpRowFilters() {
  const group = document.querySelector("[data-row-filter]");
  const list = document.querySelector("[data-rows]");
  if (!group || !list) return;
  const empty = document.querySelector("[data-rows-empty]");
  const chips = group.querySelectorAll(".chip");
  chips.forEach((chip) => chip.addEventListener("click", () => {
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    let shown = 0;
    list.querySelectorAll(".row-card").forEach((row) => {
      const show = chip.dataset.filter === "all" || row.dataset.status === chip.dataset.filter;
      row.hidden = !show;
      if (show) shown++;
    });
    if (empty) empty.classList.toggle("is-visible", shown === 0);
  }));
}

/* Task details page (task.html?id=3). Later: GET /api/tasks/<id>, POST /api/tasks/<id>/offers */
function setUpTaskDetail() {
  const page = document.querySelector("[data-task-page]");
  if (!page) return;
  const id = new URLSearchParams(window.location.search).get("id") || "3";
  const task = DEMO_TASKS[id] || DEMO_TASKS[3];
  const set = (sel, value) => page.querySelectorAll(sel).forEach((el) => { el.textContent = value; });
  document.title = `${task.title} · QuickVolunteer`;
  set("[data-task-title]", task.title);
  set("[data-task-who]", task.who);
  set("[data-task-initial]", task.who.charAt(0));
  set("[data-task-minutes]", task.minutes);
  set("[data-task-when]", task.when);
  set("[data-task-where]", task.where);
  set("[data-task-rating]", task.rating);
  set("[data-task-description]", task.description);
  page.querySelector("[data-task-tag]").outerHTML = task.mode === "remote"
    ? '<span class="tag tag--remote"><img src="assets/icons/laptop-tag.svg" alt="" width="14" height="14">Remote</span>'
    : '<span class="tag tag--in-person"><img src="assets/icons/pin-tag.svg" alt="" width="14" height="14">In person</span>';
  page.querySelector("[data-task-report]").href = `report.html?task=${id}`;

  // Highlight skills that match the volunteer's profile
  const mySkills = loadProfile().skills || [];
  const skillBox = page.querySelector("[data-task-skills]");
  task.skills.forEach((skill) => {
    const tag = document.createElement("span");
    const match = mySkills.includes(skill);
    tag.className = `skill-tag${match ? " skill-tag--match" : ""}`;
    tag.textContent = match ? `${skill} · your skill` : skill;
    skillBox.appendChild(tag);
  });
  const matched = task.skills.filter((s) => mySkills.includes(s));
  if (matched.length || id === "3") {
    page.querySelector("[data-task-match]").hidden = false;
    page.querySelector("[data-task-match-text]").textContent = matched.length
      ? `It matches your skills: ${matched.join(", ")}.` : "It matches your skills and is close to you.";
  }

  const form = document.getElementById("offer-form");
  const sent = document.getElementById("offer-sent");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.hidden = true;
    sent.hidden = false;
    sent.querySelector("h2").setAttribute("tabindex", "-1");
    sent.querySelector("h2").focus();
  });
  document.getElementById("withdraw-offer").addEventListener("click", () => {
    sent.hidden = true;
    form.hidden = false;
  });
}

/* Post a help request. Later: POST /api/tasks */
function setUpPostRequest() {
  const form = document.getElementById("post-form");
  if (!form) return;
  const profile = loadProfile();
  const inPerson = form.querySelector("[data-in-person-only]");
  const date = form.querySelector("#req-date");
  const flexible = form.querySelector("#req-flexible");
  if (profile.postcode) form.querySelector("#req-postcode").value = profile.postcode;
  date.min = new Date().toISOString().slice(0, 10);

  form.querySelectorAll("[name=req-mode]").forEach((r) => r.addEventListener("change", () => {
    inPerson.hidden = r.value !== "in_person";
  }));
  flexible.addEventListener("change", () => {
    date.required = !flexible.checked;
    date.disabled = flexible.checked;
    form.querySelector("#req-time").disabled = flexible.checked;
    if (flexible.checked) markInvalid(date, false);
  });

  // Edit an existing request (US-09): post-request.html?edit=1
  // Later: GET /api/tasks/<id> to fill the form and PUT /api/tasks/<id> to save it.
  const editId = new URLSearchParams(window.location.search).get("edit");
  const DEMO_REQUESTS = {
    1: { title: "Collect a click and collect grocery order", category: "shopping", skills: ["Shopping"], duration: "30", mode: "in_person",
         postcode: "E8 2AA", date: "2026-10-29", time: "16:00",
         description: "My grocery order is paid for and ready to collect from the supermarket on Kingsland High Street between 16:00 and 17:00. I need it brought to my flat on the second floor, as I cannot carry heavy bags at the moment. There are four bags in total." },
    2: { title: "Set up video calling on a new tablet", category: "tech", skills: ["Tech help"], duration: "30", mode: "remote", date: "2026-10-23", time: "11:00",
         description: "I have a new tablet and would like help setting up video calls so I can talk to my grandchildren. I can share my screen or talk you through it by phone." },
    3: { title: "Explain a council tax letter and next steps", category: "writing", skills: ["Writing and forms"], duration: "30", mode: "remote", flexible: true,
         description: "I received a council tax letter about a change to my discount and I am not sure what I need to do. I would like someone to read it with me by phone and explain the next steps." },
  };
  const editing = editId && DEMO_REQUESTS[editId];
  if (editing) {
    document.title = "Edit your request · QuickVolunteer";
    form.querySelector("[data-post-eyebrow]").textContent = "My requests";
    form.querySelector("[data-post-title]").textContent = "Edit your request";
    form.querySelector("[data-post-submit]").textContent = "Save changes";
    form.querySelector("#req-title").value = editing.title;
    form.querySelector("#req-description").value = editing.description;
    form.querySelector("#req-category").value = editing.category;
    editing.skills.forEach((k) => { const box = form.querySelector(`[name=req-skills][value="${k}"]`); if (box) box.checked = true; });
    form.querySelector(`[name=req-duration][value="${editing.duration}"]`).checked = true;
    const modeBox = form.querySelector(`[name=req-mode][value="${editing.mode}"]`);
    modeBox.checked = true;
    inPerson.hidden = editing.mode !== "in_person";
    if (editing.postcode) form.querySelector("#req-postcode").value = editing.postcode;
    if (editing.flexible) { flexible.checked = true; flexible.dispatchEvent(new Event("change")); }
    else { date.min = ""; date.value = editing.date; form.querySelector("#req-time").value = editing.time || ""; }
    form.querySelector("#req-confirm").checked = true;
    form.querySelectorAll("[data-counter-for]").forEach((c) => {
      const box = document.getElementById(c.dataset.counterFor); c.textContent = `${box.value.length} / ${box.maxLength}`;
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = form.querySelector("#req-title");
    const description = form.querySelector("#req-description");
    const problem = checkRequired(form, [
      [title.value.trim().length <= 60, "Please keep the title to 60 characters or fewer."],
      [description.value.trim().length >= 20, "Please add a little more detail to the description (at least 20 characters)."],
      [form.querySelector("#req-confirm").checked, "Please confirm the task is small and safe."],
    ]);
    if (problem) { showError(form, problem); return; }
    showError(form, null);
    const done = document.getElementById("post-done");
    done.querySelector("[data-done-title]").textContent = `“${title.value.trim()}”`;
    if (editing) {
      done.querySelector("[data-done-heading]").textContent = "Your changes are saved";
      done.querySelector(".body").textContent = "Volunteers will now see the updated details of your request.";
    }
    form.hidden = true;
    done.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* Close a request (My requests and Request pages). Later: PATCH /api/tasks/<id> */
function setUpCloseRequest() {
  document.querySelectorAll("[data-close-request]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.confirm !== "yes") {
        btn.dataset.confirm = "yes";
        btn.textContent = "Click again to close";
        return;
      }
      const row = btn.closest(".row-card") || document;
      const label = row.querySelector("[data-status-label], [data-request-status]");
      if (label) { label.textContent = "Closed"; label.className = "status status--closed"; }
      if (row.dataset) row.dataset.status = "closed";
      btn.replaceWith(Object.assign(document.createElement("span"), { className: "muted", textContent: "Request closed" }));
      document.querySelectorAll("[data-offer-actions]").forEach((a) => { a.hidden = true; });
    });
  });
}

/* Accept or decline volunteer offers. Later: POST /api/offers/<id>/accept or /decline */
function setUpOffers() {
  const cards = document.querySelectorAll("[data-offer]");
  if (!cards.length) return;
  const status = document.querySelector("[data-request-status]");
  const result = (card, text) => { const r = card.querySelector("[data-offer-result]"); r.hidden = false; r.textContent = text; };

  cards.forEach((card) => {
    const name = card.querySelector("strong").textContent;
    card.querySelector("[data-accept]").addEventListener("click", () => {
      cards.forEach((other) => {
        other.querySelector("[data-offer-actions]").hidden = true;
        if (other === card) {
          other.classList.add("is-accepted");
          result(other, `You accepted ${name}. We have shared the address with them and sent you both a confirmation.`);
        } else {
          other.classList.add("is-declined");
          result(other, "Not chosen this time. We have let them know.");
        }
      });
      status.textContent = `Accepted · ${name}`;
      status.className = "status status--accepted";
      document.querySelector("[data-complete-link]").hidden = false;
    });
    card.querySelector("[data-decline]").addEventListener("click", () => {
      card.classList.add("is-declined");
      card.querySelector("[data-offer-actions]").hidden = true;
      result(card, `You declined ${name}'s offer.`);
    });
  });
}

/* Withdraw an offer (My tasks). Later: DELETE /api/offers/<id> */
function setUpWithdraw() {
  document.querySelectorAll("[data-withdraw]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".row-card");
      const label = row.querySelector("[data-status-label]");
      label.textContent = "Withdrawn";
      label.className = "status status--closed";
      btn.remove();
    });
  });
}

/* Total hours from the activity history table. Later: GET /api/me/history */
function setUpHistory() {
  const table = document.querySelector("[data-history]");
  if (!table) return;
  const rows = table.querySelectorAll("tbody tr");
  const minutes = Array.from(rows).reduce((sum, r) => sum + Number(r.dataset.minutes || 0), 0);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  document.querySelector("[data-hours-total]").textContent = h ? `${h} h ${m} min` : `${m} min`;
  document.querySelector("[data-hours-count]").textContent = rows.length;
}

/* Confirm completed and review. Later: POST /api/tasks/<id>/complete and /reviews */
function setUpReview() {
  const form = document.getElementById("review-form");
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  const task = DEMO_TASKS[params.get("task")];
  const asSeeker = params.get("as") === "seeker";
  if (task) {
    form.querySelector("[data-review-task]").textContent = task.title;
    form.querySelector("[data-review-minutes]").textContent = `${task.minutes} minutes`;
  }
  if (asSeeker) form.querySelector("[data-review-person]").textContent = "your volunteer";
  else if (task) form.querySelector("[data-review-person]").textContent = task.who;

  const yesNote = form.querySelector("[data-hours-note]");
  const noNote = form.querySelector("[data-no-note]");
  const fields = form.querySelector("[data-review-fields]");
  form.querySelectorAll("[name=happened]").forEach((r) => r.addEventListener("change", () => {
    const yes = r.value === "yes";
    yesNote.hidden = !yes;
    noNote.hidden = yes;
    fields.hidden = !yes;
  }));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const happened = (form.querySelector("[name=happened]:checked") || {}).value;
    const rated = form.querySelector("[name=rating]:checked");
    const problem = checkRequired(form, [[happened !== "yes" || rated, "Please choose a star rating."]]);
    if (problem) { showError(form, problem); return; }
    const done = document.getElementById("review-done");
    done.querySelector("[data-done-text]").textContent = happened === "yes"
      ? "Your review has been posted and the hours have been added to the activity history."
      : "Thanks for letting us know. The task has been marked as not completed and no hours were added.";
    form.hidden = true;
    done.hidden = false;
  });
}

/* Profile. Later: GET and PUT /api/me */
function setUpProfile() {
  const form = document.getElementById("profile-form");
  if (!form) return;
  const profile = loadProfile();
  const roleNames = { help_seeker: "Asking for help", volunteer: "Giving help", both: "Asking and giving help" };
  const fill = () => {
    const p = loadProfile();
    document.querySelector("[data-profile-name]").textContent = p.name || "Your name";
    document.querySelector("[data-profile-area]").textContent = p.area ? `${p.area}, up to ${p.distance || 3} miles` : "Not set";
    document.querySelector("[data-profile-role]").textContent = roleNames[p.role] || "Not set";
  };
  if (profile.name) form.fullname.value = profile.name;
  if (profile.email) form.email.value = profile.email;
  if (profile.bio) form.bio.value = profile.bio;
  if (profile.postcode) form.postcode.value = profile.postcode;
  if (profile.area) form.area.value = profile.area;
  const check = (name, value) => { const el = form.querySelector(`[name=${name}][value="${value}"]`); if (el) el.checked = true; };
  if (profile.distance) check("distance", profile.distance);
  if (profile.role) check("role", profile.role);
  if (profile.mode) check("mode", profile.mode);
  (profile.skills || []).forEach((v) => check("skills", v));
  (profile.days || []).forEach((v) => check("days", v));
  (profile.times || []).forEach((v) => check("times", v));
  form.bio.dispatchEvent(new Event("input"));
  fill();

  const volunteerOnly = form.querySelector("[data-volunteer-only]");
  const toggle = () => { volunteerOnly.hidden = (form.querySelector("[name=role]:checked") || {}).value === "help_seeker"; };
  form.querySelectorAll("[name=role]").forEach((r) => r.addEventListener("change", toggle));
  toggle();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const success = form.querySelector(".form-success");
    success.classList.remove("is-visible");
    const postcodeOk = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(form.postcode.value.trim());
    const problem = checkRequired(form, [[postcodeOk, "Please enter a valid UK postcode, for example E8 1AB."]]);
    if (!postcodeOk) markInvalid(form.postcode, true);
    if (problem) { showError(form, problem); return; }
    showError(form, null);
    const values = (name) => Array.from(form.querySelectorAll(`[name=${name}]:checked`)).map((b) => b.value);
    const role = form.querySelector("[name=role]:checked").value;
    saveProfile({
      ...loadProfile(),
      name: form.fullname.value.trim(),
      email: form.email.value.trim(),
      bio: form.bio.value.trim(),
      postcode: form.postcode.value.trim().toUpperCase(),
      area: form.area.value.trim(),
      distance: form.querySelector("[name=distance]:checked").value,
      role,
      skills: role === "help_seeker" ? [] : values("skills"),
      mode: role === "help_seeker" ? null : form.querySelector("[name=mode]:checked").value,
      days: values("days"),
      times: values("times"),
      skipped: false,
    });
    fill();
    setUpLogout();
    success.textContent = "Your changes have been saved.";
    success.classList.add("is-visible");
  });
}

/* Report a concern. Later: POST /api/reports */
function setUpReport() {
  const form = document.getElementById("report-form");
  if (!form) return;
  const task = DEMO_TASKS[new URLSearchParams(window.location.search).get("task")];
  if (task) {
    form.querySelector("[data-report-about]").hidden = false;
    form.querySelector("[data-report-task]").textContent = task.title;
    form.querySelector("[name=about][value=task]").checked = true;
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const details = form.querySelector("#report-details");
    const problem = checkRequired(form, [[details.value.trim().length >= 20, "Please tell us a little more (at least 20 characters)."]]);
    if (problem) { showError(form, problem); return; }
    const done = document.getElementById("report-done");
    done.querySelector("[data-report-ref]").textContent = `QV-${1000 + Math.floor(Math.random() * 9000)}`;
    form.hidden = true;
    done.hidden = false;
  });
}

/* Admin: verify accounts and review concerns. Later: /api/admin/... */
function setUpAdmin() {
  const admin = document.querySelector("[data-admin]");
  if (!admin) return;
  const tabs = admin.querySelectorAll(".dash-tab");
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    admin.querySelectorAll(".dash-panel").forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  }));
  const countAccounts = admin.querySelector("[data-count-accounts]");
  const countConcerns = admin.querySelector("[data-count-concerns]");
  const setStatus = (box, text, cls) => { const l = box.querySelector("[data-status-label]"); l.textContent = text; l.className = `status status--${cls}`; };

  admin.querySelectorAll("[data-admin-row]").forEach((row) => {
    const finish = (text, cls) => {
      setStatus(row, text, cls);
      row.querySelector(".cell-actions").innerHTML = '<span class="muted">Done</span>';
      countAccounts.textContent = Math.max(0, Number(countAccounts.textContent) - 1);
    };
    row.querySelector("[data-approve]").addEventListener("click", () => finish("Verified", "accepted"));
    row.querySelector("[data-reject]").addEventListener("click", () => finish("Rejected", "declined"));
  });
  admin.querySelectorAll("[data-concern]").forEach((card) => {
    const finish = (text, cls) => {
      setStatus(card, text, cls);
      card.querySelector("[data-concern-actions]").innerHTML = `<span class="muted">${text}</span>`;
      countConcerns.textContent = Math.max(0, Number(countConcerns.textContent) - 1);
    };
    card.querySelector("[data-resolve]").addEventListener("click", () => finish("Reviewed", "done"));
    // Suspend, then allow the admin to reactivate the account (US-12)
    card.querySelector("[data-suspend]").addEventListener("click", () => {
      finish("Account suspended", "declined");
      const actions = card.querySelector("[data-concern-actions]");
      actions.innerHTML = '<span class="muted">Account suspended</span><button class="btn btn--outline btn--small" type="button" data-reactivate>Reactivate account</button>';
      actions.querySelector("[data-reactivate]").addEventListener("click", () => {
        setStatus(card, "Reactivated", "accepted");
        actions.innerHTML = '<span class="muted">Account reactivated</span>';
      });
    });
    card.querySelector("[data-dismiss]").addEventListener("click", () => finish("Dismissed", "closed"));
  });
}

/* Contact and forgot password forms. Later: POST /api/contact and /api/password-reset */
function setUpSimpleForms() {
  [["contact-form", "Thank you. Your message has been sent and we will reply by email.", "#c-message"],
   ["forgot-form", "If an account uses that email, a reset link is on its way. Check your inbox.", null]].forEach(([id, message, minField]) => {
    const form = document.getElementById(id);
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const success = form.querySelector(".form-success");
      success.classList.remove("is-visible");
      const extra = minField ? [[form.querySelector(minField).value.trim().length >= 20, "Please write at least 20 characters."]] : [];
      const problem = checkRequired(form, extra);
      if (problem) { showError(form, problem); return; }
      showError(form, null);
      success.textContent = message;
      success.classList.add("is-visible");
      form.reset();
      form.querySelectorAll("[data-counter-for]").forEach((c) => { c.textContent = `0 / ${document.getElementById(c.dataset.counterFor).maxLength}`; });
    });
  });
}

/* Copy each column heading onto its cells so tables can stack as cards on phones */
function setUpTables() {
  document.querySelectorAll(".data-table").forEach((table) => {
    const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
    table.querySelectorAll("tbody tr").forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => { if (heads[i]) td.setAttribute("data-label", heads[i]); });
    });
  });
}
