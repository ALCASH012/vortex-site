(() => {
  const PLAN_KEY = "vortex-subscription-demo-v1";
  const PROFILE_KEY = "vortex-profile-v1";
  const BOOST_KEY = "vortex-premium-boosts-v1";
  const STATS_KEY = "vortex-premium-stats-v1";
  const LISTINGS_KEY = "ryadom-demo-listings-v1";
  const FAVORITES_KEY = "vortex-favorites-v1";

  const cardsRoot = document.getElementById("cards");
  if (!cardsRoot) {
    console.error("Не найден список объявлений.");
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

  const isPremium = () => selectedPlan() === "premium";
  const currentMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const style = document.createElement("style");
  style.textContent = `
    .vx-premium-badge {
      display:inline-flex; align-items:center; gap:4px;
      margin:5px 0; padding:5px 8px; border:1px solid #f0e3c9aa;
      border-radius:99px; color:#f0e3c9; background:#f0e3c91c;
      font-size:10px; font-weight:850; letter-spacing:.04em;
    }
    .vx-premium-actions {
      display:flex; align-items:center; justify-content:space-between;
      flex-wrap:wrap; gap:8px; margin:0 14px 13px; padding-top:9px;
      border-top:1px solid rgba(255,255,255,.1);
    }
    .vx-premium-actions button {
      min-height:34px; padding:7px 10px; border:1px solid #f0e3c966;
      border-radius:10px; color:#f0e3c9; background:#f0e3c914;
      font:inherit; font-size:12px; font-weight:750; cursor:pointer;
    }
    .vx-premium-actions button:disabled { opacity:.65; cursor:default; }
    .vx-premium-actions small { color:#a3a8ad; font-size:10px; }
    .vx-boosted-card { outline:1px solid #f0e3c988; }
    .vx-premium-panel {
      margin-top:18px; padding:16px; border:1px solid rgba(255,255,255,.18);
      border-radius:16px; background:rgba(255,255,255,.05);
    }
    .vx-premium-panel h3 { margin:0 0 7px; }
    .vx-premium-panel p { color:#a3a8ad; font-size:12px; line-height:1.5; }
    .vx-premium-metrics {
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      gap:9px; margin:12px 0;
    }
    .vx-premium-metric {
      padding:12px; border:1px solid rgba(255,255,255,.12);
      border-radius:12px; background:rgba(255,255,255,.04);
    }
    .vx-premium-metric strong { display:block; font-size:20px; }
    .vx-premium-metric small { color:#a3a8ad; line-height:1.4; }
    .vx-premium-list { display:grid; gap:7px; margin-top:10px; }
    .vx-premium-list-item {
      display:flex; justify-content:space-between; gap:10px;
      padding:9px 0; border-top:1px solid rgba(255,255,255,.1);
      font-size:12px;
    }
    #vx-premium-plans {
      min-height:40px; padding:9px 13px; border:0; border-radius:11px;
      color:#17191b; background:#f0e3c9; font:inherit;
      font-weight:750; cursor:pointer;
    }
    body.light-theme .vx-premium-badge {
      color:#155e4b; border-color:#155e4b66; background:#155e4b12;
    }
    body.light-theme .vx-premium-actions { border-color:#dce5de; }
    body.light-theme .vx-premium-actions button {
      color:#155e4b; border-color:#155e4b66; background:#155e4b0d;
    }
    body.light-theme .vx-premium-actions small,
    body.light-theme .vx-premium-panel p,
    body.light-theme .vx-premium-metric small { color:#68756e; }
    body.light-theme .vx-premium-panel,
    body.light-theme .vx-premium-metric { border-color:#dce5de; background:#ffffff80; }
    body.light-theme .vx-premium-list-item { border-color:#dce5de; }
    body.light-theme #vx-premium-plans { color:white; background:#155e4b; }
    @media(max-width:420px) {
      .vx-premium-metrics { grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(style);

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
    const detail = cardDetails(card);
    const text = JSON.stringify(detail);
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

    if (normalizeContact(cardDetails(card).contact) === myContact) return true;

    const own = readJSON(LISTINGS_KEY, []);
    if (!Array.isArray(own)) return false;

    const detail = cardDetails(card);
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

  function readStats() {
    const value = readJSON(STATS_KEY, {});
    return value && typeof value === "object" ? value : {};
  }

  function favoriteCount(detail) {
    const saved = readJSON(FAVORITES_KEY, []);
    if (!Array.isArray(saved)) return 0;

    return saved.filter(item =>
      String(item.title || "").trim() === detail.title
      && String(item.location || "").trim() === detail.location
      && item.category === detail.category
    ).length;
  }

  function renderPremiumPlanDetails() {
    const premiumCard = document.querySelector(
      '#vx-subscriptions-page [data-plan="premium"]'
    );
    const list = premiumCard?.querySelector("ul");

    if (list) {
      const features = [
        "До 5 поднятий объявлений в месяц — каждое на 24 часа",
        "Статистика просмотров и избранного — демо",
        "Премиум-значок в профиле и своих объявлениях",
        "Приоритетное обращение в поддержку — демо"
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
    if (note && !note.dataset.premiumDemoNote) {
      note.textContent +=
        " Premium-функции, аналитика и продвижение сейчас работают в деморежиме только в этом браузере.";
      note.dataset.premiumDemoNote = "true";
    }
  }

  let observer = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
        recordLocalView(entry.target);
      });
    }, { threshold: [0.35] });
  }

  function recordLocalView(card) {
    if (!isPremium() || !isOwnListing(card)) return;

    const id = listingId(card);
    const seenKey = `vortex-premium-seen-${currentMonth()}-${id}`;

    try {
      if (sessionStorage.getItem(seenKey)) return;
      sessionStorage.setItem(seenKey, "1");
    } catch {}

    const stats = readStats();
    if (!stats[id]) stats[id] = { views: 0 };
    stats[id].views = (Number(stats[id].views) || 0) + 1;

    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {}

    updateStatsPanel();
  }

  function activeBoostTime(id, boosts) {
    const until = Number(boosts.items[id]) || 0;
    return until > Date.now() ? until : 0;
  }

  function decorateCards() {
    const premium = isPremium();
    const boosts = readBoosts();
    const cards = [...cardsRoot.querySelectorAll(":scope > .card")];

    cards.forEach(card => {
      const own = isOwnListing(card);
      const id = listingId(card);
      card.dataset.vxPremiumId = id;

      let badge = card.querySelector(".vx-premium-listing-badge");
      if (premium && own) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "vx-premium-badge vx-premium-listing-badge";
          badge.textContent = "✦ ПРЕМИУМ · ДЕМО";
          card.querySelector(".card-top")?.append(badge);
        }
      } else {
        badge?.remove();
      }

      let actions = card.querySelector(".vx-premium-actions");
      if (!own) {
        actions?.remove();
      } else {
        if (!actions) {
          actions = document.createElement("div");
          actions.className = "vx-premium-actions";
          actions.innerHTML =
            '<button type="button" data-vx-premium-boost></button><small></small>';
          card.append(actions);
        }

        const button = actions.querySelector("button");
        const info = actions.querySelector("small");
        const until = activeBoostTime(id, boosts);
        const remaining = Math.max(0, 5 - boosts.used);

        if (!premium) {
          button.textContent = "🔒 Премиум";
          button.disabled = true;
          button.title = "Поднятие доступно на тарифе Премиум";
          info.textContent = "Продвижение доступно в тарифе Премиум";
        } else if (until) {
          button.textContent = "⚡ Продвигается";
          button.disabled = true;
          button.title = "Поднятие активно 24 часа";
          info.textContent = "Демо-продвижение активно";
          card.classList.add("vx-boosted-card");
        } else if (remaining === 0) {
          button.textContent = "Лимит на месяц исчерпан";
          button.disabled = true;
          button.title = "Доступно до 5 поднятий в месяц";
          info.textContent = "Поднятий осталось: 0 из 5";
          card.classList.remove("vx-boosted-card");
        } else {
          button.textContent = "⚡ Поднять на 24 часа";
          button.disabled = false;
          button.title = "В демоверсии карточка поднимется только в этом браузере";
          info.textContent = `Осталось поднятий: ${remaining} из 5`;
          card.classList.remove("vx-boosted-card");
        }
      }

      if (observer) {
        observer.unobserve(card);
        observer.observe(card);
      }
    });

    const order = [...cards].sort((a, b) =>
      activeBoostTime(b.dataset.vxPremiumId, boosts)
      - activeBoostTime(a.dataset.vxPremiumId, boosts)
    );
    if (order.some((card, index) => card !== cards[index])) {
      order.forEach(card => cardsRoot.append(card));
    }

    updateStatsPanel();
  }

  cardsRoot.addEventListener("click", event => {
    const button = event.target.closest("[data-vx-premium-boost]");
    if (!button) return;

    if (!isPremium()) {
      alert("Поднятие объявления доступно на тарифе Премиум.");
      return;
    }

    const card = button.closest(".card");
    if (!card || !isOwnListing(card)) return;

    const boosts = readBoosts();
    if (boosts.used >= 5) {
      alert("На этот месяц использованы все 5 поднятий.");
      return;
    }

    const id = listingId(card);
    boosts.used += 1;
    boosts.items[id] = Date.now() + 24 * 60 * 60 * 1000;

    try {
      localStorage.setItem(BOOST_KEY, JSON.stringify(boosts));
    } catch {
      alert("Не удалось сохранить демо-продвижение в браузере.");
      return;
    }

    decorateCards();
  });

  const profilePage = document.getElementById("vx-profile-page");
  let statsPanel = null;

  if (profilePage) {
    const heading = document.getElementById("vx-profile-heading");
    if (heading && !document.getElementById("vx-premium-profile-badge")) {
      const badge = document.createElement("span");
      badge.id = "vx-premium-profile-badge";
      badge.className = "vx-premium-badge";
      badge.textContent = "✦ ПРЕМИУМ · ДЕМО";
      heading.insertAdjacentElement("afterend", badge);
    }

    statsPanel = document.createElement("section");
    statsPanel.className = "vx-premium-panel";
    statsPanel.innerHTML = `
      <h3>Премиум-инструменты</h3>
      <p id="vx-premium-status"></p>
      <button id="vx-premium-plans" type="button">Посмотреть тарифы</button>
      <div class="vx-premium-metrics">
        <div class="vx-premium-metric">
          <strong id="vx-premium-views">0</strong>
          <small>локальные показы на этом устройстве</small>
        </div>
        <div class="vx-premium-metric">
          <strong id="vx-premium-favorites">0</strong>
          <small>сохранения в локальном избранном</small>
        </div>
      </div>
      <div id="vx-premium-list" class="vx-premium-list"></div>
      <p>
        Демо-статистика видна только в этом браузере и не показывает активность
        других пользователей. Реальная аналитика и продвижение требуют общей базы и сервера.
      </p>
    `;

    profilePage.append(statsPanel);

    document.getElementById("vx-premium-plans").addEventListener("click", () => {
      document.getElementById("vx-subscriptions-top")?.click();
    });
  }

  function updateProfileBadge() {
    const badge = document.getElementById("vx-premium-profile-badge");
    if (badge) badge.hidden = !isPremium();

    const status = document.getElementById("vx-premium-status");
    const button = document.getElementById("vx-premium-plans");
    if (status) {
      status.textContent = isPremium()
        ? "Премиум выбран в деморежиме. Оплата не производится."
        : "Премиум-статус доступен после выбора тарифа Премиум.";
    }
    if (button) button.hidden = isPremium();
  }

  function updateStatsPanel() {
    if (!statsPanel) return;

    const premium = isPremium();
    const stats = readStats();
    const ownCards = [...cardsRoot.querySelectorAll(":scope > .card")]
      .filter(isOwnListing);

    const totalViews = ownCards.reduce((total, card) => {
      return total + (Number(stats[listingId(card)]?.views) || 0);
    }, 0);

    const totalFavorites = ownCards.reduce((total, card) => {
      return total + favoriteCount(cardDetails(card));
    }, 0);

    document.getElementById("vx-premium-views").textContent = String(totalViews);
    document.getElementById("vx-premium-favorites").textContent = String(totalFavorites);

    const list = document.getElementById("vx-premium-list");
    if (!premium) {
      list.innerHTML = ownCards.length
        ? "<small>Статистика и поднятие объявлений доступны в тарифе Премиум.</small>"
        : "";
      updateProfileBadge();
      return;
    }

    list.innerHTML = ownCards.length
      ? ownCards.map(card => {
          const detail = cardDetails(card);
          const views = Number(stats[listingId(card)]?.views) || 0;
          const favorites = favoriteCount(detail);
          return `
            <div class="vx-premium-list-item">
              <span>${escapeHTML(detail.title)}</span>
              <span>${views} показов · ${favorites} в избранном*</span>
            </div>`;
        }).join("")
      : "<small>Свои объявления появятся здесь. Контакт в объявлении должен совпадать с контактом в профиле.</small>";

    updateProfileBadge();
  }

  function updateSupportLink() {
    document.querySelectorAll(".vx-support-top, .vx-support-mobile").forEach(link => {
      if (isPremium()) {
        const message =
          "Здравствуйте! У меня выбран тариф Premium в ВОРТЕКС. Подскажите, пожалуйста.";
        link.href = "https://t.me/v0rtex_help?text=" + encodeURIComponent(message);
        link.title = "Telegram откроется с подготовленным сообщением о Premium.";
        link.setAttribute("aria-label", "Написать в поддержку с сообщением о Premium");
      } else {
        link.href = "https://t.me/v0rtex_help";
        link.title = "Связаться с поддержкой в Telegram";
        link.setAttribute("aria-label", "Связаться с поддержкой в Telegram");
      }
    });
  }

  function refresh() {
    renderPremiumPlanDetails();
    updateProfileBadge();
    updateSupportLink();
    decorateCards();
  }

  cardsRoot.addEventListener("click", event => {
    if (event.target.closest(".vx-favorite-toggle")) {
      setTimeout(updateStatsPanel, 100);
    }
  });

  const subscriptionsPage = document.getElementById("vx-subscriptions-page");
  subscriptionsPage?.addEventListener("click", () => setTimeout(refresh, 0));

  document.querySelectorAll("#vx-profile-top, [data-vortex-action='profile']")
    .forEach(button => button.addEventListener("click", () => setTimeout(refresh, 0)));

  new MutationObserver(() => decorateCards())
    .observe(cardsRoot, { childList: true });

  window.addEventListener("storage", refresh);
  refresh();
})();
