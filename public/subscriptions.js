(() => {
  const main = document.querySelector("main.container");
  if (!main || document.getElementById("vx-subscriptions-page")) return;

  const plans = [
    {
      id: "usual",
      name: "Обычная",
      features: [
        "3 выставления вакансий в неделю",
        "Срок действия вакансии — 1 месяц"
      ]
    },
    {
      id: "econom",
      name: "Эконом",
      features: [
        "5 выставлений вакансий в неделю",
        "Добавление вакансии в избранное",
        "Срок действия вакансии — 2 месяца"
      ]
    },
    {
      id: "deluxe",
      name: "Делюкс",
      features: [
        "7 выставлений вакансий в неделю",
        "Добавление вакансии в избранное",
        "Срок действия вакансии — 5 месяцев"
      ]
    },
    {
      id: "premium",
      name: "Премиум",
      features: [
        "15 выставлений вакансий в неделю",
        "Добавление вакансии в избранное",
        "Срок действия вакансии — 1 год",
        "Премиум-статус"
      ]
    }
  ];

  const storageKey = "vortex-subscription-demo-v1";

  function readSelectedPlan() {
    try {
      const id = localStorage.getItem(storageKey);
      return plans.some(plan => plan.id === id) ? id : "";
    } catch {
      return "";
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  const style = document.createElement("style");
  style.textContent = `
    .vx-subscriptions-top {
      display:flex; align-items:center; gap:7px;
      padding:9px 12px; border:1px solid rgba(255,255,255,.2);
      border-radius:13px; color:#f0e3c9;
      background:rgba(255,255,255,.08); font:inherit;
      font-weight:700; cursor:pointer;
      -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px);
    }
    .vx-subscriptions-top span { white-space:nowrap; }

    .vx-subscriptions-page {
      max-width:1050px; margin:26px auto; padding:25px;
      border:1px solid rgba(255,255,255,.2); border-radius:24px;
      color:#f3f0e9;
      background:linear-gradient(140deg,rgba(255,255,255,.09),rgba(255,255,255,.025));
      box-shadow:inset 0 1px 1px rgba(255,255,255,.14),0 22px 60px #0005;
      -webkit-backdrop-filter:blur(24px) saturate(150%);
      backdrop-filter:blur(24px) saturate(150%);
      animation:vx-plans-in .35s ease-out both;
    }
    .vx-subscriptions-page[hidden] { display:none !important; }
    .vx-plans-heading { text-align:center; margin:0 auto 20px; }
    .vx-plans-eyebrow {
      color:#f0e3c9; font-size:12px; font-weight:800;
      letter-spacing:.12em; text-transform:uppercase;
    }
    .vx-plans-heading h2 { margin:8px 0; font-size:clamp(25px,4vw,36px); }
    .vx-plans-heading p { margin:0; color:#a3a8ad; line-height:1.5; }

    .vx-plans-status {
      min-height:24px; margin:14px 0 19px; color:#f0e3c9;
      text-align:center; font-size:14px;
    }
    .vx-plans-grid {
      display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
      align-items:stretch; gap:13px; perspective:1000px;
    }
    .vx-plan-card {
      display:flex; flex-direction:column; min-width:0; padding:17px;
      border:1px solid rgba(255,255,255,.35); border-radius:18px;
      background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.035));
      box-shadow:inset 0 1px 2px #fff3,0 10px 28px #0004,0 0 18px #eaf3ff12;
      transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease;
    }
    .vx-plan-card:nth-child(1) { transform:rotate(-3deg) translateY(8px); }
    .vx-plan-card:nth-child(2) { transform:rotate(-1deg) translateY(2px); }
    .vx-plan-card:nth-child(3) { transform:rotate(1deg) translateY(2px); }
    .vx-plan-card:nth-child(4) { transform:rotate(3deg) translateY(8px); }
    .vx-plan-card.vx-plan-selected {
      border-color:#f0e3c9;
      box-shadow:inset 0 1px 2px #fff5,0 10px 28px #0004,0 0 22px #f0e3c944;
    }
    .vx-plan-card h3 { min-height:48px; margin:0 0 12px; font-size:18px; }
    .vx-plan-card ul {
      display:grid; gap:11px; margin:0 0 20px; padding:14px 0 0;
      border-top:1px solid rgba(255,255,255,.16); list-style:none;
    }
    .vx-plan-card li { display:flex; gap:8px; color:#e6e7e8; font-size:13px; line-height:1.4; }
    .vx-plan-card li::before { content:"✓"; color:#f0e3c9; font-weight:900; }
    .vx-plan-card button {
      width:100%; min-height:42px; margin-top:auto; padding:9px;
      border:1px solid rgba(255,255,255,.4); border-radius:12px;
      color:#17191b; background:#f0e3c9; font:inherit;
      font-weight:750; cursor:pointer;
      transition:transform .2s ease,filter .2s ease;
    }
    .vx-plan-card button:hover { transform:translateY(-2px); filter:brightness(1.08); }
    .vx-plans-note {
      max-width:700px; margin:20px auto 0; color:#a3a8ad;
      font-size:12px; line-height:1.6; text-align:center;
    }

    body.light-theme .vx-subscriptions-page {
      color:#18231f; border-color:#ffffffc9;
      background:linear-gradient(140deg,#ffffffbd,#ffffff70);
    }
    body.light-theme .vx-plans-eyebrow,
    body.light-theme .vx-plans-status { color:#155e4b; }
    body.light-theme .vx-plans-heading p,
    body.light-theme .vx-plans-note { color:#68756e; }
    body.light-theme .vx-plan-card {
      border-color:#ffffffd9; background:#ffffffa8;
      box-shadow:inset 0 1px 2px #fff,0 10px 28px #20332618;
    }
    body.light-theme .vx-plan-card li { color:#34423a; }
    body.light-theme .vx-plan-card li::before { color:#155e4b; }
    body.light-theme .vx-plan-card ul { border-color:#dfe7e1; }
    body.light-theme .vx-plan-card button { color:#fff; background:#155e4b; }

    @keyframes vx-plans-in {
      from { opacity:0; transform:translateY(12px); }
      to { opacity:1; transform:translateY(0); }
    }

    @media(max-width:760px) {
      .vx-subscriptions-top { padding:8px; }
      .vx-subscriptions-top span { display:none; }
      .vx-subscriptions-page { padding:20px 15px; }
      .vx-plans-grid {
        display:flex; overflow-x:auto; padding:5px 2px 16px;
        scroll-snap-type:x mandatory; scrollbar-width:thin;
      }
      .vx-plan-card {
        flex:0 0 min(78vw,290px); scroll-snap-align:center;
        transform:none !important;
      }
      .vx-plan-card.vx-plan-selected { transform:translateY(-3px) !important; }
      .vx-plan-card h3 { min-height:auto; }
    }

    @media(prefers-reduced-motion:reduce) {
      .vx-subscriptions-page { animation:none; }
      .vx-plan-card, .vx-plan-card button { transition:none; }
    }
    body.vx-reduce-motion .vx-subscriptions-page { animation:none; }
    body.vx-reduce-motion .vx-plan-card,
    body.vx-reduce-motion .vx-plan-card button { transition:none; }
  `;
  document.head.appendChild(style);

  const profilePage = document.getElementById("vx-profile-page");
  const homeElements = [...main.children].filter(element => element !== profilePage);

  const page = document.createElement("section");
  page.id = "vx-subscriptions-page";
  page.className = "vx-subscriptions-page";
  page.hidden = true;
  page.innerHTML = `
    <div class="vx-plans-heading">
      <div class="vx-plans-eyebrow">ВОРТЕКС · ТАРИФЫ</div>
      <h2>Выберите подписку</h2>
      <p>Тарифы для размещения вакансий</p>
    </div>
    <div class="vx-plans-status" id="vx-plans-status" aria-live="polite"></div>
    <div class="vx-plans-grid">
      ${plans.map(plan => `
        <article class="vx-plan-card" data-plan="${escapeHTML(plan.id)}">
          <h3>${escapeHTML(plan.name)}</h3>
          <ul>${plan.features.map(feature => `<li>${escapeHTML(feature)}</li>`).join("")}</ul>
          <button type="button" data-select-plan="${escapeHTML(plan.id)}">Выбрать тариф</button>
        </article>
      `).join("")}
    </div>
    <p class="vx-plans-note">
      Демоверсия: выбранный тариф запоминается только в этом браузере.
      Оплата, настоящие подписки и ограничения на публикации пока не подключены.
    </p>
  `;
  main.append(page);

  let selectedPlan = readSelectedPlan();

  function renderSelection() {
    const plan = plans.find(item => item.id === selectedPlan);
    const status = document.getElementById("vx-plans-status");

    status.textContent = plan
      ? `Для демонстрации выбран тариф «${plan.name}». Оплата не производится.`
      : "Тариф пока не выбран.";

    page.querySelectorAll(".vx-plan-card").forEach(card => {
      const selected = card.dataset.plan === selectedPlan;
      card.classList.toggle("vx-plan-selected", selected);
      const button = card.querySelector("button");
      button.textContent = selected ? "Выбран" : "Выбрать тариф";
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  page.querySelectorAll("[data-select-plan]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.selectPlan;
      if (!plans.some(plan => plan.id === id)) return;

      try {
        localStorage.setItem(storageKey, id);
        selectedPlan = id;
        renderSelection();
      } catch {
        alert("Не удалось сохранить выбор тарифа в этом браузере.");
      }
    });
  });

  const topTab = document.createElement("button");
  topTab.id = "vx-subscriptions-top";
  topTab.type = "button";
  topTab.className = "vx-subscriptions-top";
  topTab.title = "Подписки";
  topTab.setAttribute("aria-label", "Открыть подписки");
  topTab.innerHTML = "<span aria-hidden='true'>◇</span><span>Подписки</span>";

  const profileTop = document.getElementById("vx-profile-top");
  const settingsTop = document.querySelector("#vx-open, #openSettings, .settings-open-button");

  if (profileTop) profileTop.after(topTab);
  else if (settingsTop) settingsTop.before(topTab);
  else document.querySelector(".nav")?.append(topTab);

  const mobileNav = document.getElementById("vortex-mobile-nav");
  let mobileTab = mobileNav?.querySelector('[data-vortex-action="subscriptions"]');

  if (mobileNav && !mobileTab) {
    mobileTab = document.createElement("button");
    mobileTab.type = "button";
    mobileTab.dataset.vortexAction = "subscriptions";
    mobileTab.innerHTML = "<span>◇</span><small>Подписки</small>";

    const profileMobile = mobileNav.querySelector('[data-vortex-action="profile"]');
    const settingsMobile = mobileNav.querySelector('[data-vortex-action="settings"]');

    if (profileMobile) profileMobile.after(mobileTab);
    else if (settingsMobile) settingsMobile.before(mobileTab);
    else mobileNav.append(mobileTab);
  }

  function setMobileActive(action) {
    mobileNav?.querySelectorAll("button").forEach(button => {
      button.classList.toggle("active", button.dataset.vortexAction === action);
    });
  }

  function showSubscriptions() {
    [...main.children].forEach(element => {
      element.hidden = element !== page;
    });
    page.hidden = false;
    setMobileActive("subscriptions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnHome() {
    page.hidden = true;
    homeElements.forEach(element => { element.hidden = false; });
    if (profilePage) profilePage.hidden = true;
    setMobileActive("home");
  }

  function toggleSubscriptions() {
    if (page.hidden) showSubscriptions();
    else returnHome();
  }

  topTab.addEventListener("click", toggleSubscriptions);
  mobileTab?.addEventListener("click", toggleSubscriptions);

  // Переход в профиль закрывает страницу подписок, не мешая профилю открыться.
  document.getElementById("vx-profile-top")?.addEventListener("click", () => {
    page.hidden = true;
  });
  mobileNav?.querySelector('[data-vortex-action="profile"]')
    ?.addEventListener("click", () => { page.hidden = true; });

  mobileNav?.querySelectorAll(
    '[data-vortex-action="home"], [data-vortex-action="search"], [data-vortex-action="pets"]'
  ).forEach(button => button.addEventListener("click", returnHome));

  renderSelection();
})();
