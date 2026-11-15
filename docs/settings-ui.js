(() => {
  const dialog = document.getElementById("vx-dialog");
  if (!dialog || dialog.dataset.vxGlassUi === "1") return;

  const $ = id => dialog.querySelector(`#${id}`);
  const controls = {
    city: $("vx-city"),
    category: $("vx-category"),
    theme: $("vx-theme"),
    layout: $("vx-layout"),
    density: $("vx-density"),
    motion: $("vx-motion"),
    notifications: $("vx-notifications"),
    close: $("vx-close"),
    save: $("vx-save"),
    reset: $("vx-reset"),
    clear: $("vx-clear")
  };

  if (Object.values(controls).some(item => !item)) {
    console.error("Настройки ВОРТЕКС: не найдены нужные элементы. Старый вид сохранён.");
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    #vx-dialog {
      box-sizing:border-box; width:min(1000px,calc(100vw - 28px));
      max-width:1000px; height:min(820px,calc(100dvh - 28px));
      max-height:calc(100dvh - 28px); padding:0; overflow:hidden;
      border:1px solid #d0deeb33; border-radius:23px;
      color:#f1f4f7;
      background:linear-gradient(145deg,#181e23fa,#11161bfa);
      box-shadow:0 30px 100px #0009,inset 0 1px 1px #ffffff18;
      -webkit-backdrop-filter:blur(26px) saturate(150%);
      backdrop-filter:blur(26px) saturate(150%);
    }
    #vx-dialog::backdrop { background:#05080dcc; backdrop-filter:blur(7px); }
    #vx-dialog[open] { display:block; }
    #vx-dialog h2,#vx-dialog h3,#vx-dialog p { margin-top:0; }
    #vx-dialog button {
      box-sizing:border-box; min-height:38px; border:0; border-radius:10px;
      padding:8px 11px; color:inherit; font:inherit;
      font-weight:700; cursor:pointer;
    }
    #vx-dialog button:focus-visible,
    #vx-dialog input:focus-visible,
    #vx-dialog select:focus-visible {
      outline:2px solid #18c997; outline-offset:2px;
    }
    .vx-glass-shell {
      display:grid; grid-template-columns:235px minmax(0,1fr);
      width:100%; height:100%; min-height:0;
    }
    .vx-glass-sidebar {
      display:grid; grid-template-rows:auto minmax(0,1fr) auto;
      gap:12px; min-width:0; min-height:0; padding:20px 14px;
      border-right:1px solid #ffffff12;
      background:linear-gradient(180deg,#ffffff09,#ffffff02);
    }
    .vx-glass-brand { display:flex; align-items:center; gap:10px; padding:2px 4px 8px; }
    .vx-glass-icon {
      display:grid; place-items:center; width:39px; height:39px;
      border:1px solid #ffffff20; border-radius:12px;
      color:#20d6a0; background:#ffffff08; font-size:20px;
    }
    .vx-glass-brand small { display:block; color:#929ca5; font-size:9px; letter-spacing:.13em; }
    #vx-dialog .vx-glass-brand h2 { margin:3px 0 0; font-size:19px; }
    .vx-glass-tabs { display:grid; align-content:start; gap:6px; overflow:auto; }
    #vx-dialog .vx-glass-tab {
      display:grid; grid-template-columns:32px 1fr; align-items:center;
      gap:8px; width:100%; min-height:48px; padding:7px;
      border:1px solid transparent; color:#c5ccd2; background:transparent;
      text-align:left;
    }
    #vx-dialog .vx-glass-tab[aria-selected="true"] {
      color:#20d6a0; border-color:#14bb8944;
      background:linear-gradient(110deg,#13bc8a26,#13bc8a09);
    }
    .vx-glass-tab-icon {
      display:grid; place-items:center; width:30px; height:30px;
      border:1px solid #ffffff12; border-radius:9px; background:#ffffff07;
    }
    .vx-glass-tab strong { display:block; font-size:11px; }
    .vx-glass-tab small { display:block; margin-top:3px; color:#929ca5; font-size:9px; font-weight:400; }
    #vx-dialog .vx-glass-reset {
      width:100%; border:1px solid #ffffff20; color:#d3d8dc;
      background:#ffffff08; text-align:left; font-size:11px;
    }
    .vx-glass-main { display:grid; grid-template-rows:auto minmax(0,1fr) auto; min-width:0; min-height:0; }
    .vx-glass-header {
      display:flex; justify-content:space-between; align-items:flex-start;
      gap:12px; padding:22px 25px 13px;
    }
    .vx-glass-eyebrow { color:#20d6a0; font-size:9px; font-weight:800; letter-spacing:.13em; }
    #vx-dialog .vx-glass-header h3 { margin:5px 0; font-size:20px; }
    .vx-glass-header p,.vx-glass-hint { margin:0; color:#929ca5; font-size:10px; line-height:1.5; }
    #vx-dialog .vx-glass-close {
      flex:0 0 38px; width:38px; min-height:38px; padding:0;
      border:1px solid #ffffff18; background:#ffffff0b; font-size:20px;
    }
    .vx-glass-content { min-height:0; overflow:auto; padding:8px 25px 18px; }
    .vx-glass-panel[hidden] { display:none !important; }
    .vx-glass-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px; }
    .vx-glass-card {
      min-width:0; padding:14px; border:1px solid #ffffff12;
      border-radius:14px; background:linear-gradient(145deg,#ffffff0b,#ffffff04);
      box-shadow:inset 0 1px 1px #ffffff08;
    }
    .vx-glass-card-title { display:block; margin-bottom:6px; font-size:11px; font-weight:750; }
    .vx-glass-card .vx-glass-hint { display:block; margin-bottom:10px; }
    #vx-dialog .vx-glass-control {
      box-sizing:border-box; width:100%; min-height:41px; padding:9px 11px;
      border:1px solid #ffffff1c; border-radius:10px;
      color:#f1f4f7; background:#ffffff08; font:inherit; font-size:11px;
    }
    #vx-dialog .vx-glass-control option { color:#f1f4f7; background:#20262c; }
    .vx-glass-theme-options { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
    #vx-dialog .vx-glass-theme {
      display:flex; justify-content:center; align-items:center; gap:6px;
      min-width:0; min-height:43px; padding:6px;
      border:1px solid #ffffff15; color:#c5ccd2; background:#ffffff06; font-size:10px;
    }
    #vx-dialog .vx-glass-theme[aria-checked="true"] {
      border-color:#18c997; color:#20d6a0; background:#18c99714;
    }
    .vx-glass-hidden {
      position:absolute !important; width:1px !important; height:1px !important;
      overflow:hidden !important; clip:rect(0,0,0,0) !important;
      white-space:nowrap !important;
    }
    #vx-dialog .vx-glass-row {
      display:flex; justify-content:space-between; align-items:center;
      gap:12px; min-height:51px; margin-top:10px; padding:10px 12px;
      border:1px solid #ffffff12; border-radius:12px;
      background:#ffffff05; cursor:pointer;
    }
    .vx-glass-row strong { display:block; font-size:11px; }
    .vx-glass-row small { display:block; margin-top:4px; color:#929ca5; font-size:9px; font-weight:400; }
    #vx-dialog .vx-glass-switch {
      appearance:none; position:relative; flex:0 0 43px;
      width:43px; min-width:43px; height:25px; min-height:25px;
      margin:0; padding:0; border:1px solid #ffffff25;
      border-radius:99px; background:#454d54; cursor:pointer;
    }
    #vx-dialog .vx-glass-switch::before {
      content:""; position:absolute; top:2px; left:2px;
      width:19px; height:19px; border-radius:50%; background:#e8ecef;
      transition:transform .18s ease;
    }
    #vx-dialog .vx-glass-switch:checked { border-color:#18c997; background:#18c997; }
    #vx-dialog .vx-glass-switch:checked::before { transform:translateX(18px); background:#10251f; }
    #vx-dialog .vx-glass-danger {
      border:1px solid #e7777755; color:#ffaaaa; background:#d9454513; font-size:10px;
    }
    .vx-glass-footer {
      display:flex; justify-content:space-between; align-items:center;
      gap:12px; padding:12px 25px 17px; border-top:1px solid #ffffff10;
    }
    .vx-glass-footer .vx-note { margin:0; color:#929ca5; font-size:9px; line-height:1.4; }
    #vx-dialog #vx-save { min-width:125px; color:#10221c; background:#18c997; font-size:11px; }
    body.light-theme #vx-dialog { color:#18231f; border-color:#dce5de; background:linear-gradient(145deg,#fffefa,#f3f7f5); }
    body.light-theme #vx-dialog .vx-glass-sidebar { border-color:#e3e9e5; background:#f6f9f7; }
    body.light-theme #vx-dialog .vx-glass-card,
    body.light-theme #vx-dialog .vx-glass-row { border-color:#e1e8e3; background:#ffffffbd; }
    body.light-theme #vx-dialog .vx-glass-hint,
    body.light-theme #vx-dialog .vx-glass-tab small,
    body.light-theme #vx-dialog .vx-glass-row small,
    body.light-theme #vx-dialog .vx-note { color:#68756e; }
    body.light-theme #vx-dialog .vx-glass-tab { color:#34443b; }
    body.light-theme #vx-dialog .vx-glass-tab[aria-selected="true"] { color:#087c5d; background:#15996e12; }
    body.light-theme #vx-dialog .vx-glass-control { color:#18231f; border-color:#d6ded8; background:#fff; }
    body.light-theme #vx-dialog .vx-glass-control option { color:#18231f; background:#fff; }
    body.light-theme #vx-dialog .vx-glass-theme { color:#34443b; border-color:#dce5de; background:#fff; }
    body.light-theme #vx-dialog .vx-glass-theme[aria-checked="true"] { color:#087c5d; border-color:#15996f; }
    body.light-theme #vx-dialog .vx-glass-reset,
    body.light-theme #vx-dialog .vx-glass-close { color:#34443b; border-color:#dce5de; background:#fff; }
    body.light-theme #vx-dialog #vx-save { color:#fff; background:#12865f; }
    @media(max-width:760px) {
      #vx-dialog { width:calc(100vw - 12px); height:calc(100dvh - 12px); max-height:calc(100dvh - 12px); border-radius:17px; }
      .vx-glass-shell { grid-template-columns:1fr; grid-template-rows:auto minmax(0,1fr); }
      .vx-glass-sidebar { grid-template-rows:auto auto auto; gap:6px; padding:9px 11px; border-right:0; border-bottom:1px solid #ffffff12; }
      .vx-glass-brand { padding:0 2px; }
      .vx-glass-icon { width:31px; height:31px; }
      #vx-dialog .vx-glass-brand h2 { font-size:16px; }
      .vx-glass-tabs { display:flex; gap:5px; overflow-x:auto; }
      #vx-dialog .vx-glass-tab { display:flex; flex:0 0 auto; width:auto; min-height:35px; gap:5px; padding:5px 8px; }
      .vx-glass-tab-icon { width:23px; height:23px; font-size:11px; }
      .vx-glass-tab small { display:none; }
      #vx-dialog .vx-glass-reset { min-height:32px; padding:5px 8px; }
      .vx-glass-header { padding:12px 15px 8px; }
      #vx-dialog .vx-glass-header h3 { font-size:17px; }
      .vx-glass-content { padding:6px 15px 12px; }
      .vx-glass-footer { padding:10px 15px 12px; }
    }
    @media(max-width:520px) {
      .vx-glass-grid { grid-template-columns:1fr; }
      .vx-glass-theme-options { gap:4px; }
      #vx-dialog .vx-glass-theme { flex-direction:column; gap:2px; font-size:9px; }
    }
  `;
  document.head.append(style);

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const shell = make("div", "vx-glass-shell");
  const sidebar = make("aside", "vx-glass-sidebar");
  const brand = make("div", "vx-glass-brand");
  brand.innerHTML = '<span class="vx-glass-icon" aria-hidden="true">⚙</span><div><small>ВОРТЕКС</small><h2>Настройки</h2></div>';

  const tabList = make("nav", "vx-glass-tabs");
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", "Разделы настроек");

  const definitions = [
    { id: "basic", icon: "⌂", name: "Основные", hint: "Город и раздел", title: "Основные настройки", description: "Город и раздел, которые будут выбраны по умолчанию." },
    { id: "appearance", icon: "◈", name: "Внешний вид", hint: "Тема и анимация", title: "Внешний вид", description: "Настройте тему и анимацию интерфейса." },
    { id: "listings", icon: "▤", name: "Объявления", hint: "Вид и карточки", title: "Объявления", description: "Выберите вид списка и размер карточек." },
    { id: "notifications", icon: "♧", name: "Уведомления", hint: "Ваши предпочтения", title: "Уведомления", description: "Предпочтения сохраняются в браузере на этом устройстве." }
  ];

  const panels = {};
  const tabs = {};

  function newPanel(id) {
    const panel = make("section", "vx-glass-panel");
    panel.id = `vx-glass-panel-${id}`;
    panel.dataset.vxGlassPanel = id;
    panel.setAttribute("role", "tabpanel");
    panels[id] = panel;
    return panel;
  }

  definitions.forEach(item => {
    const tab = make("button", "vx-glass-tab");
    tab.type = "button";
    tab.id = `vx-glass-tab-${item.id}`;
    tab.dataset.vxGlassTab = item.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `vx-glass-panel-${item.id}`);
    tab.innerHTML = `<span class="vx-glass-tab-icon" aria-hidden="true">${item.icon}</span><span><strong>${item.name}</strong><small>${item.hint}</small></span>`;
    tabList.append(tab);
    tabs[item.id] = tab;
  });

  const reset = controls.reset;
  reset.className = "vx-glass-reset";
  reset.textContent = "↺  Сбросить настройки";

  sidebar.append(brand, tabList, reset);

  const main = make("section", "vx-glass-main");
  const header = make("header", "vx-glass-header");
  const headerText = document.createElement("div");
  const eyebrow = make("span", "vx-glass-eyebrow", "НАСТРОЙКИ ВОРТЕКС");
  const title = make("h3", "", "");
  title.id = "vx-glass-title";
  const description = make("p", "", "");
  headerText.append(eyebrow, title, description);

  const close = controls.close;
  close.classList.add("vx-glass-close");
  close.setAttribute("aria-label", "Закрыть настройки");
  header.append(headerText, close);

  const content = make("div", "vx-glass-content");
  definitions.forEach(item => content.append(newPanel(item.id)));

  const footer = make("footer", "vx-glass-footer");
  const note = dialog.querySelector(".vx-note");
  const save = controls.save;
  save.textContent = "Сохранить";
  if (note) footer.append(note);
  footer.append(save);

  const cityCard = make("div", "vx-glass-card");
  const cityLabel = make("label", "vx-glass-card-title", "Город по умолчанию");
  cityLabel.htmlFor = controls.city.id;
  const cityHint = make("small", "vx-glass-hint", "Будет выбран при запуске приложения.");
  controls.city.classList.add("vx-glass-control");
  cityCard.append(cityLabel, cityHint, controls.city);

  const categoryCard = make("div", "vx-glass-card");
  const categoryLabel = make("label", "vx-glass-card-title", "Раздел по умолчанию");
  categoryLabel.htmlFor = controls.category.id;
  const categoryHint = make("small", "vx-glass-hint", "Раздел, который откроется при запуске.");
  controls.category.classList.add("vx-glass-control");
  categoryCard.append(categoryLabel, categoryHint, controls.category);
  panels.basic.classList.add("vx-glass-grid");
  panels.basic.append(cityCard, categoryCard);

  const themeCard = make("div", "vx-glass-card");
  const themeTitle = make("strong", "vx-glass-card-title", "Тема оформления");
  const themeHint = make("small", "vx-glass-hint", "Выберите тему приложения.");
  const hiddenThemeLabel = make("label", "vx-glass-hidden", "Тема оформления");
  hiddenThemeLabel.htmlFor = controls.theme.id;
  controls.theme.classList.add("vx-glass-hidden");
  hiddenThemeLabel.append(controls.theme);

  const themeOptions = make("div", "vx-glass-theme-options");
  themeOptions.setAttribute("role", "radiogroup");
  themeOptions.setAttribute("aria-label", "Тема оформления");
  [
    { value: "light", icon: "☼", label: "Светлая" },
    { value: "dark", icon: "☾", label: "Тёмная" },
    { value: "system", icon: "▣", label: "Системная" }
  ].forEach(option => {
    const button = make("button", "vx-glass-theme");
    button.type = "button";
    button.dataset.vxGlassTheme = option.value;
    button.setAttribute("role", "radio");
    button.innerHTML = `<span aria-hidden="true">${option.icon}</span><span>${option.label}</span>`;
    button.addEventListener("click", () => {
      controls.theme.value = option.value;
      syncTheme();
    });
    themeOptions.append(button);
  });
  themeCard.append(themeTitle, themeHint, hiddenThemeLabel, themeOptions);
  panels.appearance.append(themeCard);

  function toggleRow(titleText, hintText, input) {
    const row = make("label", "vx-glass-row");
    const text = document.createElement("span");
    text.append(make("strong", "", titleText), make("small", "", hintText));
    input.classList.add("vx-glass-switch");
    row.append(text, input);
    return row;
  }

  panels.appearance.append(toggleRow(
    "Уменьшить анимацию",
    "Сократить анимации и переходы интерфейса.",
    controls.motion
  ));

  function selectCard(titleText, hintText, control) {
    const card = make("div", "vx-glass-card");
    const label = make("label", "vx-glass-card-title", titleText);
    label.htmlFor = control.id;
    control.classList.add("vx-glass-control");
    card.append(label, make("small", "vx-glass-hint", hintText), control);
    return card;
  }

  panels.listings.classList.add("vx-glass-grid");
  panels.listings.append(
    selectCard("Вид объявлений", "Сетка или список карточек.", controls.layout),
    selectCard("Размер карточек", "Компактные карточки занимают меньше места.", controls.density)
  );

  const clearCard = make("div", "vx-glass-card");
  clearCard.append(
    make("strong", "vx-glass-card-title", "Локальные демо-объявления"),
    make("small", "vx-glass-hint", "Удаляются только объявления из браузера этого устройства; объявления на сервере не затрагиваются."),
    controls.clear
  );
  controls.clear.classList.add("vx-glass-danger");
  controls.clear.textContent = "Очистить локальные демо-объявления";
  panels.listings.append(clearCard);

  panels.notifications.append(toggleRow(
    "Предпочтение уведомлений",
    "Push-уведомления пока не подключены; выбор сохраняется в браузере.",
    controls.notifications
  ));

  main.append(header, content, footer);
  shell.append(sidebar, main);
  dialog.replaceChildren(shell);
  dialog.dataset.vxGlassUi = "1";
  dialog.setAttribute("aria-labelledby", title.id);

  function syncTheme() {
    dialog.querySelectorAll("[data-vx-glass-theme]").forEach(button => {
      button.setAttribute(
        "aria-checked",
        String(button.dataset.vxGlassTheme === controls.theme.value)
      );
    });
  }

  function activateTab(id) {
    const selected = definitions.find(item => item.id === id) || definitions[0];

    definitions.forEach(item => {
      const active = item.id === selected.id;
      tabs[item.id].setAttribute("aria-selected", String(active));
      tabs[item.id].tabIndex = active ? 0 : -1;
      panels[item.id].hidden = !active;
    });

    title.textContent = selected.title;
    description.textContent = selected.description;
  }

  definitions.forEach(item => {
    tabs[item.id].addEventListener("click", () => activateTab(item.id));
  });

  tabList.addEventListener("keydown", event => {
    const ids = definitions.map(item => item.id);
    const current = ids.indexOf(document.activeElement?.dataset?.vxGlassTab);
    let next = current;

    if (event.key === "ArrowRight") next = (current + 1) % ids.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + ids.length) % ids.length;
    else return;

    event.preventDefault();
    activateTab(ids[next]);
    tabs[ids[next]].focus();
  });

  controls.theme.addEventListener("change", syncTheme);
  document.querySelectorAll("#vx-open, [data-vortex-action='settings']")
    .forEach(button => button.addEventListener("click", () => {
      setTimeout(() => {
        activateTab("basic");
        syncTheme();
      }, 0);
    }));

  activateTab("basic");
  syncTheme();
})();
