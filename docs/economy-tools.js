(() => {
  "use strict";

  const PLAN_KEY = "vortex-subscription-demo-v1";
  const PROFILE_KEY = "vortex-profile-v1";
  const BOOST_KEY = "vortex-economy-boosts-v1";
  const LISTINGS_KEY = "ryadom-demo-listings-v1";
  const cardsRoot = document.getElementById("cards");

  if (!cardsRoot) {
    console.error("Эконом: не найден список объявлений.");
    return;
  }

  const readJSON = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch {
      return fallback;
    }
  };

  const isEconomy = () => {
    try {
      return localStorage.getItem(PLAN_KEY) === "econom";
    } catch {
      return false;
    }
  };

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
    return digits.length >= 7 ? "tel:" + digits : text;
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

    return own.some(item =>
      normalizeContact(item.ownerContact || item.contact) === myContact
      && String(item.title || "").trim() === detail.title
      && String(item.location || "").trim() === detail.location
    );
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

  const style = document.createElement("style");
  style.textContent = `
    .vx-economy-actions {
      display:flex; align-items:center; flex-wrap:wrap; gap:8px;
      margin:0 14px 13px; padding-top:9px;
      border-top:1px solid rgba(255,255,255,.1);
    }
    .vx-economy-actions button {
      min-height:36px; padding:7px 10px;
      border:1px solid #7db8ff77; border-radius:10px;
      color:#a9d2ff; background:#7db8ff14;
      font:inherit; font-size:12px; font-weight:750; cursor:pointer;
    }
    .vx-economy-actions button:disabled {
      opacity:.7; cursor:default;
    }
    .vx-economy-actions small {
      color:#a3a8ad; font-size:10px; line-height:1.4;
    }
    .vx-economy-raised {
      outline:1px solid #7db8ff99 !important;
      box-shadow:0 0 0 4px #7db8ff22 !important;
    }
    body.light-theme .vx-economy-actions {
      border-color:#dce5de;
    }
    body.light-theme .vx-economy-actions button {
      color:#155e4b; border-color:#155e4b66; background:#155e4b0d;
    }
    body.light-theme .vx-economy-actions small {
      color:#68756e;
    }
    body.light-theme .vx-economy-raised {
      outline-color:#2875c7 !important;
      box-shadow:0 0 0 4px #2875c722 !important;
    }
    body.vx-economy-active .vx-premium-actions,
    body.vx-economy-active .vx-deluxe-actions,
    body.vx-economy-active .vx-premium-panel {
      display:none !important;
    }
  `;
  document.head.appendChild(style);

  function renderEconomyPlanDetails() {
    const planCard = document.querySelector(
      '#vx-subscriptions-page [data-plan="econom"]'
    );
    const list = planCard?.querySelector("ul");

    if (list) {
      const feature = "1 поднятие объявления в месяц — на 6 часов";
      const exists = [...list.querySelectorAll("li")].some(li =>
        li.textContent.trim() === feature
      );

      if (!exists) {
        const li = document.createElement("li");
        li.textContent = feature;
        list.append(li);
      }
    }

    const note = document.querySelector(
      "#vx-subscriptions-page .vx-plans-note"
    );

    if (note && !note.dataset.economyDemoNote) {
      note.textContent +=
        " Поднятие в Экономе работает в деморежиме только в этом браузере.";
      note.dataset.economyDemoNote = "true";
    }
  }

  function decorateCards() {
    const economy = isEconomy();

    if (document.body) {
      document.body.classList.toggle("vx-economy-active", economy);
    }

    const boosts = readBoosts();
    const cards = [...cardsRoot.querySelectorAll(":scope > .card")];

    cards.forEach(card => {
      const own = isOwnListing(card);
      const id = listingId(card);
      const until = activeBoostTime(id, boosts);

      card.dataset.vxEconomyId = id;
      card.classList.toggle(
        "vx-economy-raised",
        economy && own && Boolean(until)
      );

      let actions = card.querySelector(".vx-economy-actions");

      if (!economy || !own) {
        actions?.remove();
        return;
      }

      if (!actions) {
        actions = document.createElement("div");
        actions.className = "vx-economy-actions";
        actions.innerHTML =
          '<button type="button" data-vx-economy-boost></button><small></small>';
        card.append(actions);
      }

      const button = actions.querySelector("button");
      const info = actions.querySelector("small");

      if (until) {
        const hours = Math.max(1, Math.ceil((until - Date.now()) / 3600000));
        button.textContent = "⚡ Продвигается";
        button.disabled = true;
        info.textContent = `Демо-поднятие активно ещё примерно ${hours} ч.`;
      } else if (boosts.used >= 1) {
        button.textContent = "Поднятие на этот месяц использовано";
        button.disabled = true;
        info.textContent = "В Экономе доступно 1 поднятие в месяц.";
      } else {
        button.textContent = "⚡ Поднять на 6 часов";
        button.disabled = false;
        info.textContent = "Осталось поднятий: 1 из 1";
      }
    });

    if (economy) {
      const ordered = [...cards].sort((a, b) =>
        activeBoostTime(b.dataset.vxEconomyId, boosts)
        - activeBoostTime(a.dataset.vxEconomyId, boosts)
      );

      if (ordered.some((card, index) => card !== cards[index])) {
        ordered.forEach(card => cardsRoot.append(card));
      }
    }
  }

  cardsRoot.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("[data-vx-economy-boost]");
    if (!button) return;

    if (!isEconomy()) {
      alert("Поднятие объявления доступно в демотарифе Эконом.");
      return;
    }

    const card = button.closest(".card");
    if (!card || !isOwnListing(card)) return;

    const boosts = readBoosts();
    const id = listingId(card);

    if (activeBoostTime(id, boosts)) {
      alert("Это объявление уже продвигается.");
      return;
    }

    if (boosts.used >= 1) {
      alert("В Экономе доступно одно поднятие объявления в месяц.");
      return;
    }

    boosts.used = 1;
    boosts.items[id] = Date.now() + 6 * 60 * 60 * 1000;

    try {
      localStorage.setItem(BOOST_KEY, JSON.stringify(boosts));
    } catch {
      alert("Не удалось сохранить демо-поднятие в браузере.");
      return;
    }

    decorateCards();
  });

  function refresh() {
    renderEconomyPlanDetails();
    decorateCards();
  }

  const subscriptionsPage = document.getElementById("vx-subscriptions-page");

  subscriptionsPage?.addEventListener("click", () => {
    setTimeout(refresh, 0);
  });

  if (subscriptionsPage && "MutationObserver" in window) {
    new MutationObserver(renderEconomyPlanDetails)
      .observe(subscriptionsPage, { childList: true, subtree: true });
  }

  new MutationObserver(decorateCards)
    .observe(cardsRoot, { childList: true });

  window.addEventListener("storage", refresh);
  refresh();
})();
