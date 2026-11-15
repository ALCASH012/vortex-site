(() => {
  "use strict";

  const PLAN_KEY = "vortex-subscription-demo-v1";
  const PROFILE_KEY = "vortex-profile-v1";
  const BOOST_KEY = "vortex-premium-boosts-v1";
  const STATS_KEY = "vortex-deluxe-stats-v1";
  const HIGHLIGHT_KEY = "vortex-deluxe-highlighted-listing-v1";
  const LISTINGS_KEY = "ryadom-demo-listings-v1";

  const cardsRoot = document.getElementById("cards");
  if (!cardsRoot) {
    console.error("Делюкс: не найден список объявлений.");
    return;
  }

  const readJSON = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  const selectedPlan = () => {
    try {
      return localStorage.getItem(PLAN_KEY) || "";
    } catch {
      return "";
    }
  };

  const isDeluxe = () => selectedPlan() === "deluxe";

  const currentMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  function normalizeContact(value) {
    let text = String(value || "").trim().toLowerCase();
    text = text.replace(/^(mailto:|tel:)/, "").split("?")[0].trim();
    const digits = text.replace(/\D/g, "");
    if (digits.length >= 7) return "tel:" + digits;
    return text;
  }

  function cardDetails(card) {
    const tag = card.querySelector(".tag");
    const category = ["jobs", "housing", "pets", "sales"].find(name =>
      tag?.classList.contains("tag-" + name)
    ) || "other";
    const link = card.querySelector(".contact-link");

    return {
      category,
      title: card.querySelector("h3")?.textContent.trim() || "Объявление",
      location: card.querySelector(".location")?.textContent.trim() || "",
      description: card.querySelector(".description")?.textContent.trim() || "",
      price: card.querySelector(".price")?.textContent.trim() || "",
      contact: link?.getAttribute("href")
        || card.querySelector(".card-bottom .muted")?.textContent.trim()
        || ""
    };
  }

  function listingId(card) {
    const text = JSON.stringify(cardDetails(card));
    let hash = 2166136261;

    for (let i = 0; i < text.length; i++) {
      hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    }

    return "vx-" + (hash >>> 0).toString(36);
  }

  function isOwnListing(card) {
    const profile = readJSON(PROFILE_KEY, {});
    const myContact = normalizeContact(profile.contact);
    if (!myContact) return false;

    const detail = cardDetails(card);
    if (normalizeContact(detail.contact) === myContact) return true;

    const own = readJSON(LISTINGS_KEY, []);
    if (!Array.isArray(own)) return false;

    return own.some(item => {
      const owner = normalizeContact(item.ownerContact || item.contact);
      return owner === myContact
        && String(item.title || "").trim() === detail.title
        && String(item.location || "").trim() === detail.location;
    });
  }

  function readBoosts() {
    const value = readJSON(BOOST_KEY, {});
    if (value.month !== currentMonth()) {
      return { month: currentMonth(), used: 0, items: {} };
    }

    return {
      month: value.month,
      used: Math.max(0, Number(value.used) || 0),
      items: value.items && typeof value.items === "object" ? value.items : {}
    };
  }

  function activeBoostTime(id, boosts) {
    const until = Number(boosts.items[id]) || 0;
    return until > Date.now() ? until : 0;
  }

  function readStats() {
    const value = readJSON(STATS_KEY, {});
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }

  function selectedHighlight() {
    try {
      return localStorage.getItem(HIGHLIGHT_KEY) || "";
    } catch {
      return "";
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    .vx-deluxe-actions {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin:0 14px 13px;
      padding-top:9px;
      border-top:1px solid rgba(255,255,255,.1);
    }
    .vx-deluxe-control { display:grid; gap:5px; }
    .vx-deluxe-actions button {
      width:100%;
      min-height:36px;
      padding:7px 10px;
      border:1px solid #7db8ff77;
      border-radius:10px;
      color:#a9d2ff;
      background:#7db8ff14;
      font:inherit;
      font-size:12px;
      font-weight:750;
      cursor:pointer;
    }
    .vx-deluxe-actions button:disabled {
      opacity:.7;
      cursor:default;
    }
    .vx-deluxe-actions small {
      color:#a3a8ad;
      font-size:10px;
      line-height:1.4;
    }
    .vx-deluxe-highlighted {
      outline:2px solid #7db8ff !important;
      box-shadow:0 0 0 4px #7db8ff26, 0 0 24px #7db8ff22 !important;
    }
    body.light-theme .vx-deluxe-highlighted {
      outline-color:#2875c7 !important;
      box-shadow:0 0 0 4px #2875c726 !important;
    }
    body.light-theme .vx-deluxe-actions {
      border-color:#dce5de;
    }
    body.light-theme .vx-deluxe-actions button {
      color:#155e4b;
      border-color:#155e4b66;
      background:#155e4b0d;
    }
    body.light-theme .vx-deluxe-actions small {
      color:#68756e;
    }
    body.vx-deluxe-active .vx-premium-actions,
    body.vx-deluxe-active .vx-premium-panel:not(.vx-deluxe-panel) {
      display:none !important;
    }
    .vx-deluxe-panel[hidden] { display:none !important; }
    @media(max-width:420px) {
      .vx-deluxe-actions { grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(style);

  function renderDeluxePlanDetails() {
    const planCard = document.querySelector(
      '#vx-subscriptions-page [data-plan="deluxe"]'
    );
    const list = planCard?.querySelector("ul");

    if (list) {
      const features = [
        "До 2 поднятий объявлений в месяц — каждое на 12 часов",
        "Простая статистика просмотров — демо",
        "Рамка для одного объявления"
      ];

      features.forEach(feature => {
        const exists = [...list.querySelectorAll("li")].some(li =>
          li.textContent.trim() === feature
        );

        if (!exists) {
          const li = document.createElement("li");
          li.textContent = feature;
          list.append(li);
        }
      });
    }

    const note = document.querySelector(
      "#vx-subscriptions-page .vx-plans-note"
    );

    if (note && !note.dataset.deluxeDemoNote) {
      note.textContent +=
        " Инструменты Делюкс работают в деморежиме только в этом браузере.";
      note.dataset.deluxeDemoNote = "true";
    }
  }

  let statsPanel = null;
  const profilePage = document.getElementById("vx-profile-page");

  if (profilePage) {
    statsPanel = document.createElement("section");
    statsPanel.id = "vx-deluxe-panel";
    statsPanel.className = "vx-premium-panel vx-deluxe-panel";
    statsPanel.hidden = true;
    statsPanel.innerHTML = `
      <h3>Инструменты Делюкс</h3>
      <p id="vx-deluxe-status"></p>
      <div class="vx-premium-metrics">
        <div class="vx-premium-metric">
          <strong id="vx-deluxe-total-views">0</strong>
          <small>просмотров своих объявлений · демо</small>
        </div>
      </div>
      <div id="vx-deluxe-list" class="vx-premium-list"></div>
      <p>
        Счётчик хранится только в этом браузере и не показывает активность
        других пользователей или устройств.
      </p>
      <button id="vx-deluxe-plans" type="button">Посмотреть тарифы</button>
    `;

    profilePage.append(statsPanel);

    document.getElementById("vx-deluxe-plans")?.addEventListener("click", () => {
      document.getElementById("vx-subscriptions-top")?.click();
    });
  }

  function updateStatsPanel() {
    if (!statsPanel) return;

    const active = isDeluxe();
    statsPanel.hidden = !active;
    if (!active) return;

    const stats = readStats();
    const ownCards = [...cardsRoot.querySelectorAll(":scope > .card")]
      .filter(isOwnListing);

    const totalViews = ownCards.reduce(
      (total, card) => total + (Number(stats[listingId(card)]?.views) || 0),
      0
    );

    document.getElementById("vx-deluxe-status").textContent =
      "Делюкс выбран в деморежиме. Оплата не производится.";

    document.getElementById("vx-deluxe-total-views").textContent =
      String(totalViews);

    const list = document.getElementById("vx-deluxe-list");
    list.innerHTML = ownCards.length
      ? ownCards.map(card => {
          const detail = cardDetails(card);
          const views = Number(stats[listingId(card)]?.views) || 0;
          return `
            <div class="vx-premium-list-item">
              <span>${escapeHTML(detail.title)}</span>
              <span>${views} просмотров</span>
            </div>`;
        }).join("")
      : "<small>Свои объявления появятся здесь. Контакт в объявлении должен совпадать с контактом в профиле.</small>";
  }

  function recordLocalView(card) {
    if (!isDeluxe() || !isOwnListing(card)) return;

    const id = listingId(card);
    const seenKey = `vortex-deluxe-seen-${currentMonth()}-${id}`;

    try {
      if (sessionStorage.getItem(seenKey)) return;
      sessionStorage.setItem(seenKey, "1");
    } catch {}

    const stats = readStats();
    if (!stats[id] || typeof stats[id] !== "object") {
      stats[id] = { views: 0 };
    }

    stats[id].views = (Number(stats[id].views) || 0) + 1;

    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {}

    updateStatsPanel();
  }

  let observer = null;

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          recordLocalView(entry.target);
        }
      });
    }, { threshold: [0.35] });
  }

  function decorateCards() {
    const deluxe = isDeluxe();

    if (document.body) {
      document.body.classList.toggle("vx-deluxe-active", deluxe);
    }

    const boosts = readBoosts();
    const highlightedId = selectedHighlight();
    const cards = [...cardsRoot.querySelectorAll(":scope > .card")];

    cards.forEach(card => {
      const own = isOwnListing(card);
      const id = listingId(card);
      card.dataset.vxDeluxeId = id;

      card.classList.toggle(
        "vx-deluxe-highlighted",
        deluxe && own && highlightedId === id
      );

      let actions = card.querySelector(".vx-deluxe-actions");

      if (!deluxe || !own) {
        actions?.remove();
      } else {
        if (!actions) {
          actions = document.createElement("div");
          actions.className = "vx-deluxe-actions";
          actions.innerHTML = `
            <div class="vx-deluxe-control">
              <button type="button" data-vx-deluxe-boost></button>
              <small data-vx-deluxe-boost-info></small>
            </div>
            <div class="vx-deluxe-control">
              <button type="button" data-vx-deluxe-highlight></button>
              <small data-vx-deluxe-highlight-info></small>
            </div>
          `;
          card.append(actions);
        }

        const boostButton = actions.querySelector("[data-vx-deluxe-boost]");
        const boostInfo = actions.querySelector("[data-vx-deluxe-boost-info]");
        const remaining = Math.max(0, 2 - boosts.used);
        const until = activeBoostTime(id, boosts);

        if (until) {
          boostButton.textContent = "⚡ Продвигается";
          boostButton.disabled = true;
          boostInfo.textContent =
            `Демо-поднятие активно ещё примерно ${Math.max(1, Math.ceil((until - Date.now()) / 3600000))} ч.`;
        } else if (remaining === 0) {
          boostButton.textContent = "Лимит на месяц исчерпан";
          boostButton.disabled = true;
          boostInfo.textContent = "Поднятий осталось: 0 из 2";
        } else {
          boostButton.textContent = "⚡ Поднять на 12 часов";
          boostButton.disabled = false;
          boostInfo.textContent = `Осталось поднятий: ${remaining} из 2`;
        }

        const highlightButton =
          actions.querySelector("[data-vx-deluxe-highlight]");
        const highlightInfo =
          actions.querySelector("[data-vx-deluxe-highlight-info]");
        const highlighted = highlightedId === id;

        highlightButton.textContent = highlighted
          ? "Снять рамку"
          : "Выделить рамкой";
        highlightInfo.textContent = highlighted
          ? "Рамка включена для этого объявления"
          : "Можно выделить только одно объявление";
      }

      if (observer) {
        observer.unobserve(card);
        if (deluxe && own) observer.observe(card);
      }
    });

    const order = [...cards].sort((a, b) =>
      activeBoostTime(b.dataset.vxDeluxeId, boosts)
      - activeBoostTime(a.dataset.vxDeluxeId, boosts)
    );

    if (order.some((card, index) => card !== cards[index])) {
      order.forEach(card => cardsRoot.append(card));
    }

    updateStatsPanel();
  }

  cardsRoot.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const boostButton = target.closest("[data-vx-deluxe-boost]");
    const highlightButton = target.closest("[data-vx-deluxe-highlight]");
    const button = boostButton || highlightButton;
    if (!button) return;

    if (!isDeluxe()) {
      alert("Эти возможности доступны на демотарифе Делюкс.");
      return;
    }

    const card = button.closest(".card");
    if (!card || !isOwnListing(card)) return;

    const id = listingId(card);

    if (boostButton) {
      const boosts = readBoosts();

      if (activeBoostTime(id, boosts)) {
        alert("Это объявление уже продвигается.");
        return;
      }

      if (boosts.used >= 2) {
        alert("В Делюкс доступно до 2 поднятий объявлений в месяц.");
        return;
      }

      boosts.used += 1;
      boosts.items[id] = Date.now() + 12 * 60 * 60 * 1000;

      try {
        localStorage.setItem(BOOST_KEY, JSON.stringify(boosts));
      } catch {
        alert("Не удалось сохранить демо-поднятие в браузере.");
        return;
      }

      decorateCards();
      return;
    }

    try {
      if (selectedHighlight() === id) {
        localStorage.removeItem(HIGHLIGHT_KEY);
      } else {
        localStorage.setItem(HIGHLIGHT_KEY, id);
      }
    } catch {
      alert("Не удалось сохранить рамку в браузере.");
      return;
    }

    decorateCards();
  });

  function refresh() {
    renderDeluxePlanDetails();
    decorateCards();
  }

  const subscriptionsPage = document.getElementById("vx-subscriptions-page");

  subscriptionsPage?.addEventListener("click", () => {
    setTimeout(refresh, 0);
  });

  if (subscriptionsPage && "MutationObserver" in window) {
    new MutationObserver(renderDeluxePlanDetails)
      .observe(subscriptionsPage, { childList: true, subtree: true });
  }

  document.querySelectorAll("#vx-profile-top, [data-vortex-action='profile']")
    .forEach(button => button.addEventListener("click", () => setTimeout(refresh, 0)));

  new MutationObserver(() => decorateCards())
    .observe(cardsRoot, { childList: true });

  window.addEventListener("storage", refresh);
  refresh();
})();
