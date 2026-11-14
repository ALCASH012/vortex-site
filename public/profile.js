(() => {
  const key = "vortex-profile-v1";
  const readProfile = () => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "{}");
      return {
        name: p.name || "",
        contact: p.contact || "",
        city: p.city || "",
        about: p.about || ""
      };
    } catch {
      return { name: "", contact: "", city: "", about: "" };
    }
  };

  const css = `
    .vx-profile-top {
      display:flex; align-items:center; gap:8px; padding:9px 13px;
      border:1px solid #3b4248; border-radius:13px;
      color:#f0e3c9; background:#252b30; font:inherit;
      font-weight:700; cursor:pointer;
    }
    .vx-profile-top svg { width:18px; height:18px; }
    .vx-profile-page {
      max-width:700px; margin:26px auto; padding:24px;
      color:#f3f0e9; background:linear-gradient(145deg,#22282e,#191e23);
      border:1px solid #353b41; border-radius:22px;
      box-shadow:0 18px 50px #0004;
      animation:vx-profile-in .3s ease-out both;
    }
    .vx-profile-page[hidden] { display:none !important; }
    .vx-profile-heading { display:flex; align-items:center; gap:16px; margin-bottom:22px; }
    .vx-avatar {
      width:68px; height:68px; flex:0 0 68px; display:grid; place-items:center;
      border-radius:20px; color:#17191b; background:#f0e3c9;
      font-size:30px; font-weight:850;
    }
    .vx-kicker { color:#f0e3c9; font-size:11px; font-weight:800; letter-spacing:.12em; }
    .vx-profile-heading h2 { margin:4px 0; font-size:26px; }
    .vx-profile-heading p, .vx-profile-note { color:#a3a8ad; line-height:1.5; }
    .vx-profile-fields { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
    .vx-profile-fields label { display:flex; flex-direction:column; gap:7px; font-weight:700; }
    .vx-profile-fields .vx-wide { grid-column:1/-1; }
    .vx-profile-fields input, .vx-profile-fields textarea {
      width:100%; padding:12px; border:1px solid #3c4349; border-radius:12px;
      color:#f3f0e9; background:#252b30; font:inherit;
    }
    .vx-profile-fields textarea { min-height:90px; resize:vertical; }
    .vx-profile-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:17px; }
    .vx-profile-actions button, .vx-profile-back {
      min-height:46px; padding:11px; border:0; border-radius:12px;
      font:inherit; font-weight:750; cursor:pointer;
    }
    #vx-profile-save { color:#f3f0e9; background:#30363c; }
    #vx-profile-add { color:#17191b; background:#f0e3c9; }
    .vx-profile-back { margin-top:12px; color:#f3f0e9; background:#30363c; }
    @keyframes vx-profile-in {
      from { opacity:0; transform:translateY(10px); }
      to { opacity:1; transform:translateY(0); }
    }
    body.light-theme .vx-profile-page { color:#18231f; background:#fff; border-color:#e3e9e5; }
    body.light-theme .vx-kicker { color:#155e4b; }
    body.light-theme .vx-profile-heading p, body.light-theme .vx-profile-note { color:#68756e; }
    body.light-theme .vx-profile-fields input, body.light-theme .vx-profile-fields textarea {
      color:#18231f; background:#fff; border-color:#d6ded8;
    }
    body.light-theme #vx-profile-save, body.light-theme .vx-profile-back {
      color:#18231f; background:#edf1ee;
    }
    body.light-theme #vx-profile-add { color:#fff; background:#155e4b; }
    @media (max-width:520px) {
      .vx-profile-page { padding:19px; }
      .vx-profile-fields, .vx-profile-actions { grid-template-columns:1fr; }
      .vx-profile-fields .vx-wide { grid-column:auto; }
      .vx-profile-top span { display:none; }
    }
    @media (prefers-reduced-motion:reduce) {
      .vx-profile-page { animation:none; }
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const nav = document.querySelector(".nav");
  const publishButton = document.getElementById("openDialog");
  if (publishButton) publishButton.style.display = "none";

  const profileTop = document.createElement("button");
  profileTop.id = "vx-profile-top";
  profileTop.type = "button";
  profileTop.className = "vx-profile-top";
  profileTop.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg><span>Профиль</span>';

  const settingsButton = document.querySelector("#vx-open, #openSettings, .settings-open-button");
  if (settingsButton) settingsButton.before(profileTop);
  else if (publishButton) publishButton.before(profileTop);
  else nav?.append(profileTop);

  const mobileNav = document.getElementById("vortex-mobile-nav");
  let mobileProfile = mobileNav?.querySelector('[data-vortex-action="profile"]');

  if (mobileNav && !mobileProfile) {
    mobileProfile = document.createElement("button");
    mobileProfile.type = "button";
    mobileProfile.dataset.vortexAction = "profile";
    mobileProfile.innerHTML = "<span>👤</span><small>Профиль</small>";

    const oldAddButton = mobileNav.querySelector('[data-vortex-action="add"]');
    if (oldAddButton) oldAddButton.replaceWith(mobileProfile);
    else mobileNav.append(mobileProfile);
  } else if (mobileNav) {
    mobileNav.querySelector('[data-vortex-action="add"]')?.remove();
  }

  const main = document.querySelector("main.container");
  if (!main) return;

  const page = document.createElement("section");
  page.id = "vx-profile-page";
  page.className = "vx-profile-page";
  page.hidden = true;
  page.innerHTML = `
    <div class="vx-profile-heading">
      <div class="vx-avatar" id="vx-profile-avatar">В</div>
      <div>
        <div class="vx-kicker">ЛИЧНЫЙ ПРОФИЛЬ</div>
        <h2 id="vx-profile-heading">Мой профиль</h2>
        <p>Контакты для ваших объявлений</p>
      </div>
    </div>

    <div class="vx-profile-fields">
      <label>Имя
        <input id="vx-profile-name" maxlength="60" placeholder="Как к вам обращаться">
      </label>
      <label>Телефон или email
        <input id="vx-profile-contact" maxlength="120" placeholder="+7… или email@example.com">
      </label>
      <label class="vx-wide">Город
        <input id="vx-profile-city" maxlength="60" placeholder="Например, Москва">
      </label>
      <label class="vx-wide">О себе
        <textarea id="vx-profile-about" maxlength="300" placeholder="Коротко расскажите о себе"></textarea>
      </label>
    </div>

    <p class="vx-profile-note" id="vx-profile-status">
      Профиль хранится только в этом браузере; это пока не аккаунт.
    </p>
    <div class="vx-profile-actions">
      <button id="vx-profile-save" type="button">Сохранить профиль</button>
      <button id="vx-profile-add" type="button">＋ Добавить вакансию</button>
    </div>
    <p class="vx-profile-note">В форме можно выбрать и другой раздел: жильё или питомцы.</p>
    <button class="vx-profile-back" id="vx-profile-back" type="button">← На главную</button>
  `;
  main.append(page);

  const homeContent = [...main.children].filter(element => element !== page);
  const $ = id => document.getElementById(id);

  function currentProfile() {
    return {
      name: $("vx-profile-name").value.trim(),
      contact: $("vx-profile-contact").value.trim(),
      city: $("vx-profile-city").value.trim(),
      about: $("vx-profile-about").value.trim()
    };
  }

  function fillProfile() {
    const p = readProfile();
    $("vx-profile-name").value = p.name;
    $("vx-profile-contact").value = p.contact;
    $("vx-profile-city").value = p.city;
    $("vx-profile-about").value = p.about;
    updatePreview();
  }

  function updatePreview() {
    const name = $("vx-profile-name").value.trim();
    $("vx-profile-heading").textContent = name || "Мой профиль";
    $("vx-profile-avatar").textContent = Array.from(name)[0]?.toUpperCase() || "В";
  }

  function closeProfile() {
    homeContent.forEach(element => { element.hidden = false; });
    page.hidden = true;
    mobileProfile?.classList.remove("active");
  }

  function toggleProfile() {
    if (!page.hidden) {
      closeProfile();
      return;
    }
    fillProfile();
    homeContent.forEach(element => { element.hidden = true; });
    page.hidden = false;
    mobileNav?.querySelectorAll("button").forEach(button => {
      button.classList.toggle("active", button === mobileProfile);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  profileTop.addEventListener("click", toggleProfile);
  mobileProfile?.addEventListener("click", toggleProfile);
  $("vx-profile-back").addEventListener("click", closeProfile);

  $("vx-profile-name").addEventListener("input", updatePreview);

  $("vx-profile-save").addEventListener("click", () => {
    try {
      localStorage.setItem(key, JSON.stringify(currentProfile()));
      $("vx-profile-status").textContent = "Профиль сохранён в этом браузере.";
      updatePreview();
    } catch {
      $("vx-profile-status").textContent = "Не удалось сохранить профиль в браузере.";
    }
  });

  $("vx-profile-add").addEventListener("click", () => {
    const p = currentProfile();
    try { localStorage.setItem(key, JSON.stringify(p)); } catch {}

    const form = document.getElementById("listingForm");
    const category = form?.querySelector('[name="category"]');
    const location = form?.querySelector('[name="location"]');
    const contact = form?.querySelector('[name="contact"]');

    if (category) category.value = "jobs";
    if (location && !location.value.trim() && p.city) location.value = p.city;
    if (contact && !contact.value.trim() && p.contact) contact.value = p.contact;

    if (publishButton) publishButton.click();
    else document.getElementById("listingDialog")?.showModal();
  });

  ["home", "search", "pets"].forEach(action => {
    mobileNav?.querySelectorAll(`[data-vortex-action="${action}"]`).forEach(button => {
      button.addEventListener("click", closeProfile);
    });
  });
})();
