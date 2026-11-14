(() => {
  const css = `
    .vx-gear {
      width: 42px; height: 42px; flex: 0 0 42px;
      border: 1px solid #3b4248; border-radius: 13px;
      color: #f0e3c9; background: #252b30;
      font-size: 21px; cursor: pointer;
    }
    #vx-dialog {
      width: min(520px, calc(100% - 28px));
      max-height: 85vh; max-height: 85dvh; overflow: auto;
      padding: 22px; border: 1px solid #3b4248;
      border-radius: 22px; color: #f3f0e9; background: #1c2126;
    }
    #vx-dialog::backdrop { background: #080a0ccc; }
    #vx-dialog h2 { margin: 4px 0 18px; }
    #vx-dialog .vx-field {
      display: flex; flex-direction: column; gap: 7px;
      margin: 12px 0; font-weight: 700;
    }
    #vx-dialog input:not([type=checkbox]), #vx-dialog select {
      width: 100%; min-height: 44px; padding: 10px;
      border: 1px solid #454c53; border-radius: 11px;
      color: #f3f0e9; background: #252b30; font: inherit;
    }
    #vx-dialog .vx-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin: 10px 0; padding: 12px;
      border: 1px solid #373e44; border-radius: 13px;
      background: #22282d;
    }
    #vx-dialog .vx-row small {
      display: block; margin-top: 4px; color: #a3a8ad;
      font-weight: 400; line-height: 1.4;
    }
    #vx-dialog .vx-row select { width: auto; min-width: 125px; }
    #vx-dialog input[type=checkbox] { width: 21px; height: 21px; accent-color: #f0e3c9; }
    #vx-dialog .vx-actions { display: grid; gap: 9px; margin-top: 17px; }
    #vx-dialog button { min-height: 43px; border: 0; border-radius: 11px; padding: 9px; font: inherit; font-weight: 700; cursor: pointer; }
    #vx-save { color: #17191b; background: #f0e3c9; }
    #vx-reset, #vx-close, #vx-clear { color: #f3f0e9; background: #30363c; }
    #vx-dialog .vx-note { color: #a3a8ad; font-size: 12px; line-height: 1.5; }

    body[data-vx-layout="grid"] #cards,
    body[data-vx-layout="list"] #cards {
      display: grid !important; overflow: visible !important;
      scroll-snap-type: none !important;
    }
    body[data-vx-layout="grid"] #cards {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
    }
    body[data-vx-layout="list"] #cards {
      grid-template-columns: 1fr !important;
    }
    body[data-vx-layout="grid"] .card,
    body[data-vx-layout="list"] .card {
      flex: initial !important; max-width: none !important;
    }
    body[data-vx-density="compact"] .card { min-height: 220px; }
    body[data-vx-density="compact"] .card::before {
      height: 94px !important; flex-basis: 94px !important;
    }
    body[data-vx-density="compact"] .card-top {
      height: 94px !important; margin-top: -94px !important;
    }
    body.vx-reduce-motion *, body.vx-reduce-motion *::before,
    body.vx-reduce-motion *::after {
      scroll-behavior: auto !important;
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }

    body.light-theme { color: #18231f; background: #f7f9f7; }
    body.light-theme .topbar { background: #fff; border-color: #e3e9e5; }
    body.light-theme .brand, body.light-theme .section-head h2 { color: #18231f; }
    body.light-theme .hero { color: #18231f; background: #eaf4ee; }
    body.light-theme .hero-copy, body.light-theme .result-count,
    body.light-theme .footer { color: #68756e; }
    body.light-theme .field { color: #18231f; }
    body.light-theme input:not([type=checkbox]), body.light-theme select,
    body.light-theme textarea {
      color: #18231f; background: #fff; border-color: #d6ded8;
    }
    body.light-theme .card { color: #18231f; background: #fff; border-color: #e3e9e5; }
    body.light-theme .card h3 { color: #18231f; }
    body.light-theme .card .description { color: #68756e; }
    body.light-theme .card-bottom { border-color: #e3e9e5; }
    body.light-theme .contact-link, body.light-theme .card .price { color: #155e4b; }
    body.light-theme .button.dark { color: #fff; background: #155e4b; }
    body.light-theme .vortex-mobile-nav { background: #fff; border-color: #e3e9e5; }
    body.light-theme .vortex-mobile-nav button { color: #68756e; }
    body.light-theme .vortex-mobile-nav button.active { color: #155e4b; }
    body.light-theme #vx-dialog { color: #18231f; background: #fff; border-color: #e3e9e5; }
    body.light-theme #vx-dialog .vx-row { background: #f7f9f7; border-color: #e3e9e5; }
    body.light-theme #vx-dialog .vx-row small,
    body.light-theme #vx-dialog .vx-note { color: #68756e; }
    body.light-theme #vx-dialog input:not([type=checkbox]),
    body.light-theme #vx-dialog select { color: #18231f; background: #fff; }
    body.light-theme #vx-reset, body.light-theme #vx-close,
    body.light-theme #vx-clear { color: #18231f; background: #edf1ee; }
    body.light-theme #vx-save { color: #fff; background: #155e4b; }

    @media (max-width: 760px) {
      body[data-vx-layout="grid"] #cards { grid-template-columns: 1fr !important; }
      .vx-gear { width: 38px; height: 38px; flex-basis: 38px; }
    }
    @media (min-width: 520px) and (max-width: 760px) {
      body[data-vx-layout="grid"] #cards { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const defaults = {
    city: "",
    category: "all",
    theme: "dark",
    layout: "grid",
    density: "normal",
    reduceMotion: false,
    notifications: false
  };

  function readSettings() {
    try {
      const raw = localStorage.getItem("vortex-settings-v2")
        || localStorage.getItem("vortex-settings-v1")
        || "{}";
      const value = { ...defaults, ...JSON.parse(raw) };

      if (!["all", "jobs", "housing", "pets"].includes(value.category)) value.category = "all";
      if (!["dark", "light", "system"].includes(value.theme)) value.theme = "dark";
      if (!["grid", "list"].includes(value.layout)) value.layout = "grid";
      if (!["normal", "compact"].includes(value.density)) value.density = "normal";

      return value;
    } catch {
      return { ...defaults };
    }
  }

  let settings = readSettings();

  const gear = document.createElement("button");
  gear.id = "vx-open";
  gear.type = "button";
  gear.className = "vx-gear";
  gear.textContent = "⚙";
  gear.title = "Настройки";
  gear.setAttribute("aria-label", "Настройки");

  const nav = document.querySelector(".nav");
  const publish = document.getElementById("openDialog");
  if (publish) publish.before(gear);
  else nav?.append(gear);

  if (!document.getElementById("vx-dialog")) {
    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="vx-dialog">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><small>ВОРТЕКС</small><h2>Настройки</h2></div>
          <button id="vx-close" type="button" aria-label="Закрыть">×</button>
        </div>

        <label class="vx-field">Город по умолчанию
          <input id="vx-city" maxlength="60" placeholder="Например, Москва">
        </label>

        <label class="vx-field">Раздел по умолчанию
          <select id="vx-category">
            <option value="all">Все разделы</option>
            <option value="jobs">Работа</option>
            <option value="housing">Жильё</option>
            <option value="pets">Питомцы</option>
          </select>
        </label>

        <label class="vx-row"><span>Тема<small>Тёмная, светлая или как на устройстве</small></span>
          <select id="vx-theme">
            <option value="dark">Тёмная</option>
            <option value="light">Светлая</option>
            <option value="system">Системная</option>
          </select>
        </label>

        <label class="vx-row"><span>Вид объявлений<small>Сетка или список</small></span>
          <select id="vx-layout">
            <option value="grid">Сетка</option>
            <option value="list">Список</option>
          </select>
        </label>

        <label class="vx-row"><span>Размер карточек<small>Компактные занимают меньше места</small></span>
          <select id="vx-density">
            <option value="normal">Обычные</option>
            <option value="compact">Компактные</option>
          </select>
        </label>

        <label class="vx-row"><span>Уменьшить анимацию</span>
          <input id="vx-motion" type="checkbox">
        </label>

        <label class="vx-row"><span>Уведомления
          <small>Сохраняется предпочтение; push пока не подключены</small></span>
          <input id="vx-notifications" type="checkbox">
        </label>

        <p class="vx-note">Эти настройки сохраняются в браузере на этом устройстве.</p>

        <div class="vx-actions">
          <button id="vx-save" type="button">Сохранить</button>
          <button id="vx-reset" type="button">Сбросить настройки</button>
          <button id="vx-clear" type="button">Удалить мои объявления</button>
        </div>
      </dialog>
    `);
  }

  const dialog = document.getElementById("vx-dialog");
  const $ = id => document.getElementById(id);
  const colorScheme = window.matchMedia?.("(prefers-color-scheme: light)");

  function applyTheme() {
    const light = settings.theme === "light"
      || (settings.theme === "system" && colorScheme?.matches);
    document.body.classList.toggle("light-theme", Boolean(light));
  }

  function applyFilters(force = false) {
    const city = $("city");
    const category = $("categoryFilter");

    if (city && (force || (settings.city && !city.value.trim()))) {
      city.value = settings.city;
      city.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (category && (force || (settings.category !== "all" && category.value === "all"))) {
      category.value = settings.category;
      category.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function applySettings() {
    document.body.dataset.vxLayout = settings.layout;
    document.body.dataset.vxDensity = settings.density;
    document.body.classList.toggle("vx-reduce-motion", settings.reduceMotion);
    applyTheme();
    applyFilters();
  }

  function fillForm() {
    $("vx-city").value = settings.city;
    $("vx-category").value = settings.category;
    $("vx-theme").value = settings.theme;
    $("vx-layout").value = settings.layout;
    $("vx-density").value = settings.density;
    $("vx-motion").checked = settings.reduceMotion;
    $("vx-notifications").checked = settings.notifications;
  }

  function openSettings() {
    fillForm();
    dialog.showModal();
  }

  gear.addEventListener("click", openSettings);
  $("vx-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  const mobileNav = document.getElementById("vortex-mobile-nav");
  if (mobileNav && !mobileNav.querySelector('[data-vortex-action="settings"]')) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.vortexAction = "settings";
    button.innerHTML = "<span>⚙</span><small>Настройки</small>";
    mobileNav.append(button);
  }

  mobileNav?.querySelector('[data-vortex-action="settings"]')
    ?.addEventListener("click", openSettings);

  $("vx-save").addEventListener("click", () => {
    settings = {
      city: $("vx-city").value.trim(),
      category: $("vx-category").value,
      theme: $("vx-theme").value,
      layout: $("vx-layout").value,
      density: $("vx-density").value,
      reduceMotion: $("vx-motion").checked,
      notifications: $("vx-notifications").checked
    };

    try {
      localStorage.setItem("vortex-settings-v2", JSON.stringify(settings));
    } catch {
      alert("Не удалось сохранить настройки в браузере.");
      return;
    }

    applySettings();
    applyFilters(true);
    dialog.close();
  });

  $("vx-reset").addEventListener("click", () => {
    settings = { ...defaults };

    try {
      localStorage.removeItem("vortex-settings-v2");
      localStorage.removeItem("vortex-settings-v1");
    } catch {}

    applySettings();
    applyFilters(true);
    dialog.close();
  });

  $("vx-clear").addEventListener("click", () => {
    if (!confirm("Удалить добавленные объявления из этого браузера?")) return;
    localStorage.removeItem("ryadom-demo-listings-v1");
    location.reload();
  });

  colorScheme?.addEventListener?.("change", applyTheme);
  applySettings();
})();
