(() => {
  const main = document.querySelector("main.container");
  const listingCards = document.getElementById("cards");

  if (!main || !listingCards) {
    console.error("Не найдены главный экран или список объявлений.");
    return;
  }

  const FAVORITES_KEY = "vortex-favorites-v1";
  const PLAN_KEY = "vortex-subscription-demo-v1";
  const PAID_PLANS = new Set(["econom", "deluxe", "premium"]);
  const CATEGORY_NAMES = {
    jobs: "Работа",
    housing: "Жильё",
    pets: "Питомцы",
    other: "Объявление"
  };
  const PLAN_NAMES = {
    econom: "Эконом",
    deluxe: "Делюкс",
    premium: "Премиум"
  };

  const profilePage = document.getElementById("vx-profile-page");
  const subscriptionPage = document.getElementById("vx-subscriptions-page");

  function getSelectedPlan() {
    try {
      return localStorage.getItem(PLAN_KEY) || "";
    } catch {
      return "";
    }
  }

  function hasFavoritesAccess() {
    return PAID_PLANS.has(getSelectedPlan());
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function safeImage(value) {
    const src = String(value || "");
    if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(src) && src.length < 700000) {
      return src;
    }
    if (/^https:\/\//i.test(src)) {
      return src;
    }
    return "";
  }

  function makeId(item) {
    const signature = JSON.stringify([
      item.category,
      item.title,
      item.location,
      item.description,
      item.price,
      item.contact,
      item.contactHref
    ]);

    let hash = 2166136261;
    for (let i = 0; i < signature.length; i++) {
      hash = Math.imul(hash ^ signature.charCodeAt(i), 16777619);
    }

    return "vf-" + (hash >>> 0).toString(36);
  }

  function extractCard(card) {
    const tag = card.querySelector(".tag");
    const category = ["jobs", "housing", "pets", "sales"].find(name =>
      tag?.classList.contains("tag-" + name)
    ) || "other";

    const contactLink = card.querySelector(".contact-link");
    const href = contactLink?.getAttribute("href") || "";

    const item = {
      category,
      title: card.querySelector("h3")?.textContent.trim() || "Объявление",
      location: card.querySelector(".location")?.textContent.trim() || "",
      description: card.querySelector(".description")?.textContent.trim() || "",
      price: card.querySelector(".price")?.textContent.trim() || "",
      contact: contactLink?.textContent.trim()
        || card.querySelector(".card-bottom .muted")?.textContent.trim()
        || "",
      contactHref: /^(mailto:|tel:)/i.test(href) ? href : "",
      image: safeImage(card.querySelector(".card-image")?.getAttribute("src"))
    };

    item.id = makeId(item);
    return item;
  }

  function readFavorites() {
    try {
      const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      if (!Array.isArray(value)) return [];

      return value.filter(item => item && typeof item === "object").map(item => {
        const clean = {
          category: ["jobs", "housing", "pets", "sales", "other"].includes(item.category)
            ? item.category : "other",
          title: String(item.title || "Объявление"),
          location: String(item.location || ""),
          description: String(item.description || ""),
          price: String(item.price || ""),
          contact: String(item.contact || ""),
          contactHref: /^(mailto:|tel:)/i.test(String(item.contactHref || ""))
            ? String(item.contactHref) : "",
          image: safeImage(item.image)
        };

        clean.id = typeof item.id === "string" && item.id
          ? item.id
          : makeId(clean);

        return clean;
      });
    } catch {
      return [];
    }
  }

  let favorites = readFavorites();

  const style = document.createElement("style");
  style.textContent = `
    .vx-favorites-top {
      display:flex; align-items:center; gap:7px;
      padding:9px 12px; border:1px solid rgba(255,255,255,.2);
      border-radius:13px; color:#f0e3c9;
      background:rgba(255,255,255,.08); font:inherit;
      font-weight:700; cursor:pointer;
    }

    .vx-favorite-toggle {
      position:absolute; z-index:6; top:50px; right:10px;
      display:grid; place-items:center; width:40px; height:40px;
      border:1px solid rgba(255,255,255,.35); border-radius:50%;
      color:#fff; background:rgba(15,18,21,.72);
      box-shadow:0 4px 14px #0005;
      font-size:23px; line-height:1; cursor:pointer;
      -webkit-backdrop-filter:blur(8px);
      backdrop-filter:blur(8px);
    }

    .vx-favorite-toggle.is-active {
      color:#ff8a9a;
      border-color:rgba(255,138,154,.7);
    }

    .vx-favorite-toggle.is-locked::after {
      content:"🔒"; position:absolute; right:-4px; bottom:-4px;
      display:grid; place-items:center; width:17px; height:17px;
      border:1px solid rgba(255,255,255,.35); border-radius:50%;
      background:#252b30; font-size:10px;
    }

    #cards > .card,
    .vx-favorites-grid > .card { position:relative; }

    .vx-favorites-page {
      max-width:1000px; margin:26px auto; padding:24px;
      border:1px solid rgba(255,255,255,.2); border-radius:22px;
      color:#f3f0e9;
      background:linear-gradient(140deg,rgba(255,255,255,.09),rgba(255,255,255,.025));
      box-shadow:inset 0 1px 1px rgba(255,255,255,.12),0 18px 50px #0004;
      animation:vx-favorites-in .3s ease-out both;
    }

    .vx-favorites-page[hidden] { display:none !important; }

    .vx-favorites-heading {
      display:flex; align-items:end; justify-content:space-between;
      gap:14px; margin-bottom:18px;
    }

    .vx-favorites-heading h2 { margin:5px 0; font-size:28px; }
    .vx-favorites-heading p { margin:0; color:#a3a8ad; }

    .vx-favorites-eyebrow {
      color:#f0e3c9; font-size:11px;
      font-weight:800; letter-spacing:.12em;
    }

    .vx-favorites-status {
      display:flex; align-items:center; justify-content:space-between;
      gap:12px; margin-bottom:18px; padding:13px;
      border:1px solid rgba(255,255,255,.13);
      border-radius:13px; background:rgba(255,255,255,.05);
    }

    .vx-favorites-status p {
      margin:0; color:#c4c8cc; font-size:13px; line-height:1.5;
    }

    .vx-favorites-status button,
    #vx-favorite-gate button {
      min-height:40px; border:0; border-radius:11px; padding:9px 13px;
      color:#17191b; background:#f0e3c9;
      font:inherit; font-weight:750; cursor:pointer;
    }

    .vx-favorites-status button[hidden] { display:none !important; }

    .vx-favorites-empty {
      padding:24px; border:1px dashed rgba(255,255,255,.25);
      border-radius:14px; color:#a3a8ad; text-align:center;
    }

    .vx-favorites-empty[hidden] { display:none !important; }

    #vx-favorite-gate {
      width:min(430px, calc(100% - 28px)); padding:22px;
      border:1px solid rgba(255,255,255,.2); border-radius:20px;
      color:#f3f0e9; background:rgba(28,33,38,.94);
      box-shadow:0 24px 70px #0009;
    }

    #vx-favorite-gate::backdrop { background:#080a0ccc; }
    #vx-favorite-gate h2 { margin:0 0 10px; }
    #vx-favorite-gate p { color:#b8bec3; line-height:1.55; }
    #vx-favorite-gate .vx-gate-actions {
      display:flex; gap:9px; margin-top:18px;
    }
    #vx-favorite-gate .vx-gate-actions button { flex:1; }
    #vx-favorite-gate #vx-gate-later {
      color:#f3f0e9; background:#30363c;
    }

    @keyframes vx-favorites-in {
      from { opacity:0; transform:translateY(9px); }
      to { opacity:1; transform:translateY(0); }
    }

    @media(max-width:760px) {
      .vx-favorites-top { padding:8px; }
      .vx-favorites-top span { display:none; }
      .vx-favorites-page { padding:18px 14px; }
      .vx-favorites-heading { align-items:flex-start; flex-direction:column; }
      .vx-favorites-grid {
        display:grid !important; grid-template-columns:1fr !important;
        overflow:visible !important;
      }
      .vx-favorites-grid .card { max-width:none; }
      .vortex-mobile-nav {
        width:min(calc(100% - 16px), 560px) !important;
        justify-content:flex-start !important;
        overflow-x:auto !important;
        scrollbar-width:none;
      }
      .vortex-mobile-nav::-webkit-scrollbar { display:none; }
      .vortex-mobile-nav button {
        flex:0 0 57px !important; min-width:57px;
      }
      .vortex-mobile-nav button small { font-size:9px !important; }
    }

    body.light-theme .vx-favorites-page {
      color:#18231f; border-color:#ffffffc9;
      background:linear-gradient(140deg,#ffffffbd,#ffffff75);
    }
    body.light-theme .vx-favorites-eyebrow { color:#155e4b; }
    body.light-theme .vx-favorites-heading p,
    body.light-theme .vx-favorites-status p,
    body.light-theme .vx-favorites-empty { color:#68756e; }
    body.light-theme .vx-favorites-status { border-color:#dce5de; background:#ffffff88; }
    body.light-theme .vx-favorites-status button,
    body.light-theme #vx-favorite-gate button { color:#fff; background:#155e4b; }
    body.light-theme #vx-favorite-gate { color:#18231f; background:rgba(255,255,255,.96); }
    body.light-theme #vx-favorite-gate p { color:#68756e; }
    body.light-theme #vx-favorite-gate #vx-gate-later { color:#18231f; background:#edf1ee; }

    @media(prefers-reduced-motion:reduce) {
      .vx-favorites-page { animation:none; }
    }
  `;
  document.head.appendChild(style);

  const page = document.createElement("section");
  page.id = "vx-favorites-page";
  page.className = "vx-favorites-page";
  page.hidden = true;
  page.innerHTML = `
    <div class="vx-favorites-heading">
      <div>
        <div class="vx-favorites-eyebrow">ВОРТЕКС</div>
        <h2>Избранное</h2>
        <p>Сохранённые вами объявления</p>
      </div>
    </div>
    <div class="vx-favorites-status">
      <p id="vx-favorites-status-text"></p>
      <button id="vx-favorites-choose-plan" type="button">Выбрать тариф</button>
    </div>
    <div id="vx-favorites-grid" class="cards vx-favorites-grid"></div>
    <p id="vx-favorites-empty" class="vx-favorites-empty" hidden>
      Пока нет сохранённых объявлений.
    </p>
  `;
  main.append(page);

  const gate = document.createElement("dialog");
  gate.id = "vx-favorite-gate";
  gate.innerHTML = `
    <h2>Нужна подписка</h2>
    <p>
      Добавлять вакансии в избранное можно на тарифах
      «Эконом», «Делюкс» и «Премиум».
      Бесплатная «Обычная версия» эту функцию не включает.
    </p>
    <p>Сейчас оплата в приложении не подключена. Выбор тарифа ниже — демо, без списания денег.</p>
    <div class="vx-gate-actions">
      <button id="vx-gate-later" type="button">Позже</button>
      <button id="vx-gate-plans" type="button">К тарифам</button>
    </div>
  `;
  document.body.append(gate);

  const favoritesGrid = document.getElementById("vx-favorites-grid");
  const favoritesStatus = document.getElementById("vx-favorites-status-text");
  const choosePlanButton = document.getElementById("vx-favorites-choose-plan");

  function renderFavoriteCard(item) {
    const category = ["jobs", "housing", "pets", "sales"].includes(item.category)
      ? item.category : "other";
    const image = safeImage(item.image);
    const contact = item.contactHref
      ? `<a class="contact-link" href="${escapeHTML(item.contactHref)}">${escapeHTML(item.contact || "Связаться →")}</a>`
      : item.contact
        ? `<span class="muted">${escapeHTML(item.contact)}</span>`
        : "";

    return `
      <article class="card${image ? " has-custom-image" : ""}">
        ${image ? `<img class="card-image" src="${escapeHTML(image)}" alt="" loading="lazy" decoding="async">` : ""}
        <button class="vx-favorite-toggle is-active"
          type="button" data-vx-fav-toggle="${escapeHTML(item.id)}"
          aria-label="Удалить из избранного">♥</button>
        <div class="card-top">
          <span class="tag tag-${category}">${escapeHTML(CATEGORY_NAMES[category])}</span>
          <span class="location">${escapeHTML(item.location)}</span>
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        <p class="description">${escapeHTML(item.description)}</p>
        <div class="card-bottom">
          <span class="price">${escapeHTML(item.price)}</span>
          ${contact}
        </div>
      </article>
    `;
  }

  function updateFavoriteStatus() {
    const plan = getSelectedPlan();
    const active = PAID_PLANS.has(plan);

    if (active) {
      favoritesStatus.textContent =
        `Демо-тариф «${PLAN_NAMES[plan]}» выбран. Можно добавлять объявления в избранное.`;
      choosePlanButton.hidden = true;
    } else {
      favoritesStatus.textContent =
        "Чтобы добавлять объявления в избранное, выберите тариф «Эконом», «Делюкс» или «Премиум».";
      choosePlanButton.hidden = false;
    }
  }

  function renderFavorites() {
    favorites = readFavorites();
    favoritesGrid.innerHTML = favorites.map(renderFavoriteCard).join("");
    document.getElementById("vx-favorites-empty").hidden = favorites.length > 0;
    updateFavoriteStatus();
    updateFavoriteButtons();
  }

  function saveFavorites(next) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      favorites = next;
      return true;
    } catch {
      // Если не хватает места для копии фотографий, попробуем сохранить объявления без фото.
      const withoutImages = next.map(item => ({ ...item, image: "" }));
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(withoutImages));
        favorites = withoutImages;
        alert("Избранное сохранено без копий фотографий: в хранилище браузера мало места.");
        return true;
      } catch {
        alert("Не удалось сохранить избранное. Возможно, хранилище браузера заполнено.");
        return false;
      }
    }
  }

  function updateFavoriteButtons() {
    const ids = new Set(readFavorites().map(item => item.id));
    const unlocked = hasFavoritesAccess();

    document.querySelectorAll(".vx-favorite-toggle").forEach(button => {
      const selected = ids.has(button.dataset.vxFavToggle);
      button.classList.toggle("is-active", selected);
      button.classList.toggle("is-locked", !selected && !unlocked);
      button.textContent = selected ? "♥" : "♡";
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute(
        "aria-label",
        selected
          ? "Удалить из избранного"
          : unlocked
            ? "Добавить в избранное"
            : "Для добавления нужна платная подписка"
      );
      button.title = selected
        ? "Удалить из избранного"
        : unlocked
          ? "Добавить в избранное"
          : "Нужен тариф Эконом, Делюкс или Премиум";
    });
  }

  function decorateCards() {
    listingCards.querySelectorAll(".card").forEach(card => {
      const item = extractCard(card);
      let button = card.querySelector(".vx-favorite-toggle");

      if (!button) {
        button = document.createElement("button");
        button.className = "vx-favorite-toggle";
        button.type = "button";
        card.prepend(button);
      }

      button.dataset.vxFavToggle = item.id;
    });

    updateFavoriteButtons();
  }

  function saveOrRemoveFavorite(button) {
    const id = button.dataset.vxFavToggle;
    const current = readFavorites();
    const existingIndex = current.findIndex(item => item.id === id);

    // Удалить ранее сохранённое можно и без активной подписки.
    if (existingIndex >= 0) {
      current.splice(existingIndex, 1);
      if (saveFavorites(current)) renderFavorites();
      return;
    }

    if (!hasFavoritesAccess()) {
      if (typeof gate.showModal === "function") gate.showModal();
      else alert("Для избранного нужен тариф Эконом, Делюкс или Премиум.");
      return;
    }

    const card = button.closest(".card");
    if (!card) return;

    const item = extractCard(card);
    if (saveFavorites([item, ...current])) renderFavorites();
  }

  listingCards.addEventListener("click", event => {
    const button = event.target.closest(".vx-favorite-toggle");
    if (button) saveOrRemoveFavorite(button);
  });

  favoritesGrid.addEventListener("click", event => {
    const button = event.target.closest(".vx-favorite-toggle");
    if (button) saveOrRemoveFavorite(button);
  });

  new MutationObserver(decorateCards).observe(listingCards, { childList: true });
  decorateCards();
  renderFavorites();

  const subscriptionsTop = document.getElementById("vx-subscriptions-top");
  const profileTop = document.getElementById("vx-profile-top");

  function showOnly(target) {
    [...main.children].forEach(element => {
      element.hidden = element !== target;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showHome() {
    [...main.children].forEach(element => {
      element.hidden =
        element === page
        || element === profilePage
        || element === subscriptionPage;
    });
  }

  function setMobileActive(action) {
    document.querySelectorAll("#vortex-mobile-nav button").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.vortexAction === action
      );
    });
  }

  function openFavorites() {
    renderFavorites();
    showOnly(page);
    setMobileActive("favorites");
  }

  function toggleFavorites() {
    if (page.hidden) openFavorites();
    else {
      showHome();
      setMobileActive("home");
    }
  }

  const topTab = document.createElement("button");
  topTab.type = "button";
  topTab.id = "vx-favorites-top";
  topTab.className = "vx-favorites-top";
  topTab.innerHTML = "<span aria-hidden='true'>♡</span><span>Избранное</span>";
  topTab.setAttribute("aria-label", "Открыть избранное");

  if (profileTop) profileTop.after(topTab);
  else if (subscriptionsTop) subscriptionsTop.before(topTab);
  else document.querySelector(".nav")?.append(topTab);

  topTab.addEventListener("click", toggleFavorites);

  const mobileNav = document.getElementById("vortex-mobile-nav");
  let mobileTab = mobileNav?.querySelector('[data-vortex-action="favorites"]');

  if (mobileNav && !mobileTab) {
    mobileTab = document.createElement("button");
    mobileTab.type = "button";
    mobileTab.dataset.vortexAction = "favorites";
    mobileTab.innerHTML = "<span>♡</span><small>Избранное</small>";

    const profileMobile = mobileNav.querySelector('[data-vortex-action="profile"]');
    const subscriptionMobile = mobileNav.querySelector('[data-vortex-action="subscriptions"]');

    if (profileMobile) profileMobile.after(mobileTab);
    else if (subscriptionMobile) subscriptionMobile.before(mobileTab);
    else mobileNav.append(mobileTab);
  }

  mobileTab?.addEventListener("click", toggleFavorites);

  choosePlanButton.addEventListener("click", () => {
    if (subscriptionPage) {
      showOnly(subscriptionPage);
      setMobileActive("subscriptions");
    } else if (subscriptionsTop) {
      subscriptionsTop.click();
    } else {
      alert("Страница тарифов пока не найдена.");
    }
  });

  document.getElementById("vx-gate-later").addEventListener("click", () => gate.close());
  document.getElementById("vx-gate-plans").addEventListener("click", () => {
    gate.close();
    if (subscriptionPage) {
      showOnly(subscriptionPage);
      setMobileActive("subscriptions");
    } else if (subscriptionsTop) {
      subscriptionsTop.click();
    }
  });

  profileTop?.addEventListener("click", () => { page.hidden = true; });
  subscriptionsTop?.addEventListener("click", () => { page.hidden = true; });

  mobileNav?.querySelectorAll(
    '[data-vortex-action="home"], [data-vortex-action="search"], [data-vortex-action="pets"]'
  ).forEach(button => {
    button.addEventListener("click", () => {
      setTimeout(() => {
        showHome();
        setMobileActive(button.dataset.vortexAction);
      }, 0);
    });
  });

  mobileNav?.querySelector('[data-vortex-action="profile"]')
    ?.addEventListener("click", () => { page.hidden = true; });

  mobileNav?.querySelector('[data-vortex-action="subscriptions"]')
    ?.addEventListener("click", () => { page.hidden = true; });

  function refreshPaidPlanButtons() {
    if (!subscriptionPage) return;

    subscriptionPage.querySelectorAll(".vx-plan-card").forEach(card => {
      const id = card.dataset.plan;
      if (!PAID_PLANS.has(id)) return;

      const button = card.querySelector("[data-select-plan]");
      if (!button) return;

      button.disabled = false;
      button.textContent = getSelectedPlan() === id
        ? "Демо-тариф выбран"
        : "Подключить демо";
      button.title = "Демо-режим: оплаты и списания денег нет.";
    });

    const note = subscriptionPage.querySelector(".vx-plans-note");
    if (note) {
      note.textContent =
        "Демо-режим: выбор платного тарифа только сохраняется в этом браузере. " +
        "Оплата не производится. Для настоящих подписок нужен платёжный сервис и серверная проверка.";
    }

    updateFavoriteStatus();
    updateFavoriteButtons();
  }

  if (subscriptionPage) {
    subscriptionPage.addEventListener("click", event => {
      if (event.target.closest("[data-select-plan]")) {
        setTimeout(refreshPaidPlanButtons, 0);
      }
    });
  }

  window.addEventListener("storage", event => {
    if (event.key === FAVORITES_KEY || event.key === PLAN_KEY) {
      favorites = readFavorites();
      renderFavorites();
      refreshPaidPlanButtons();
    }
  });

  refreshPaidPlanButtons();
})();
