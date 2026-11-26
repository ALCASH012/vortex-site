(() => {
  "use strict";

  const cards = document.getElementById("cards");
  if (!cards) return;

  const db = window.VORTEX_SUPABASE;
  const dialog = document.createElement("dialog");
  dialog.className = "vx-listing-detail";
  dialog.setAttribute("aria-labelledby", "vx-detail-title");
  dialog.innerHTML = `
    <button type="button" class="vx-detail-close" data-close aria-label="Закрыть">×</button>
    <img class="vx-detail-image" hidden alt="">
    <p class="vx-detail-meta" data-meta></p>
    <h2 id="vx-detail-title" data-title></h2>
    <p class="vx-detail-price" data-price></p>
    <p class="vx-detail-description" data-description></p>
        <section class="vx-detail-highlights" data-highlights hidden>
      <h3>Важное сразу</h3>
      <ul data-highlights-list></ul>
      <p class="vx-detail-highlights-note">Условия указаны автором и не проверяются Вортексом.</p>
    </section>
    <p class="vx-detail-dates" data-dates></p>
    <div class="vx-detail-contact" data-contact></div>
    <div class="vx-detail-actions" data-actions hidden>
      <button type="button" data-bump>⚡ Поднять объявление</button>
      <button type="button" data-delete>Удалить объявление</button>
      <small data-hint></small>
    </div>
    <p class="vx-detail-status" data-status aria-live="polite"></p>
  `;
  document.body.append(dialog);

  const style = document.createElement("style");
  style.textContent = `
    .vx-listing-detail{position:fixed;inset:auto;top:50%;left:50%;transform:translate(-50%,-50%);margin:0;box-sizing:border-box;width:min(720px,90vw);max-height:88vh;overflow:auto;border:0;border-radius:18px;padding:26px;background:#fff;color:#172033;box-shadow:0 20px 70px #0005}
    .vx-listing-detail::backdrop{background:#101828aa}
    .vx-detail-close{position:absolute;right:12px;top:10px;border:0;background:transparent;font-size:28px;cursor:pointer}
    .vx-detail-image{display:block;width:100%;max-height:360px;object-fit:cover;border-radius:12px}
    .vx-detail-image[hidden],.vx-detail-actions[hidden]{display:none!important}
    .vx-detail-meta,.vx-detail-dates,.vx-detail-actions small{color:#667085}
    .vx-detail-title{margin:8px 40px 10px 0}
    .vx-detail-price{font-size:20px;font-weight:800}
    .vx-detail-description{white-space:pre-wrap;line-height:1.6}
        .vx-detail-highlights {
      margin: 18px 0;
      padding: 14px 16px;
      border: 1px solid #3a4656;
      border-radius: 12px;
      background: #1d2a3a;
    }
    .vx-detail-highlights[hidden] {
      display: none !important;
    }
    .vx-detail-highlights h3 {
      margin: 0 0 10px;
      color: #f4f6fa;
      font-size: 16px;
    }
    .vx-detail-highlights ul {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 20px;
      margin: 0;
      padding-left: 20px;
    }
    .vx-detail-highlights li {
      color: #f4f6fa;
      line-height: 1.45;
    }
    .vx-detail-highlights-note {
      margin: 12px 0 0;
      color: #c0cad8 !important;
      font-size: 12px;
    }
    .vx-detail-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px}
    .vx-detail-actions button,.vx-detail-contact button{border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;background:#315efb;color:#fff}
    .vx-detail-actions [data-delete]{background:#b42318}
    .vx-detail-actions button:disabled{opacity:.6;cursor:default}
    .vx-detail-contact{margin:12px 0}
    .vx-detail-status{min-height:1.4em;color:#b42318}
    #cards>.card{cursor:pointer}
    #cards>.card:focus-visible{outline:3px solid #315efb;outline-offset:3px}    .vx-listing-detail {
      background: #17212f !important;
      color: #f4f6fa !important;
    }
    .vx-listing-detail h2,
    .vx-listing-detail p,
    .vx-listing-detail a,
    .vx-listing-detail .vx-detail-close {
      color: #f4f6fa !important;
    }
    .vx-listing-detail .vx-detail-meta,
    .vx-listing-detail .vx-detail-dates {
      color: #c0cad8 !important;
    }
  `;
  document.head.append(style);

  const $ = selector => dialog.querySelector(selector);

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ru-RU");
  }

  function getServerListing(card) {
    const items = window.VORTEX_SUPABASE_LISTINGS;
    if (!Array.isArray(items)) return null;
    return items.find(item => String(item.id) === String(card.dataset.vxListingId)) || null;
  }

  async function openDetails(card) {
    const item = getServerListing(card);
    let userId = "";

    try {
      if (db?.auth) {
        const { data } = await db.auth.getSession();
        userId = data?.session?.user?.id || "";
      }
    } catch (error) {
      console.warn("Не удалось проверить аккаунт:", error);
    }

    const title = card.querySelector("h3")?.textContent.trim() || "Объявление";
    const image = card.querySelector(".card-image");
    const detailImage = $("[data-vx-image]");

    $("[data-title]").textContent = title;
    $("[data-meta]").textContent = [
      card.querySelector(".tag")?.textContent.trim(),
      card.querySelector(".location")?.textContent.trim()
    ].filter(Boolean).join(" · ");
    $("[data-price]").textContent =
      card.querySelector(".price")?.textContent.trim() || "Цена не указана";
        const fullDescription = card.dataset.vxDescription;
    $("[data-description]").textContent =
      typeof fullDescription === "string"
        ? fullDescription || "Описание не указано."
        : card.querySelector(".description")?.textContent.trim() || "Описание не указано.";
    const highlightsSection = $("[data-highlights]");
    const highlightsList = $("[data-highlights-list]");
    let highlights = Array.isArray(item?.highlights) ? item.highlights : [];

    if (!highlights.length && card.dataset.vxHighlights) {
      try {
        const cardHighlights = JSON.parse(card.dataset.vxHighlights);
        if (Array.isArray(cardHighlights)) highlights = cardHighlights;
      } catch {
        highlights = [];
      }
    }

    highlights = highlights
      .filter(value => typeof value === "string" && value.trim())
      .map(value => value.trim());

    if (highlightsSection && highlightsList) {
      highlightsList.replaceChildren();
      highlights.forEach(value => {
        const li = document.createElement("li");
        li.textContent = value;
        highlightsList.append(li);
      });
      highlightsSection.hidden = highlights.length === 0;
    }
    const dates = [];
    if (item?.createdAt) dates.push(`Опубликовано: ${formatDate(item.createdAt)}`);
    if (item?.expiresAt) dates.push(`Срок до: ${formatDate(item.expiresAt)}`);
    $("[data-dates]").textContent = dates.join(" · ");

    const fullImage = dialog.querySelector(".vx-detail-image");
    fullImage.hidden = !image;
    if (image) {
      fullImage.src = image.currentSrc || image.src;
      fullImage.alt = title;
    } else {
      fullImage.removeAttribute("src");
    }

    const contact = $("[data-contact]");
    contact.replaceChildren();

    const contactLink = card.querySelector(".contact-link");
    const chatButton = card.querySelector(".vx-chat-listing-button");

    if (contactLink) {
      const link = document.createElement("a");
      link.href = contactLink.href;
      link.className = contactLink.className;
      link.textContent = contactLink.textContent.trim() || "Связаться";
      contact.append(link);
    } else if (chatButton) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Написать автору в чат";
      button.addEventListener("click", () => {
        dialog.close();
        chatButton.click();
      });
      contact.append(button);
    } else {
      contact.textContent =
        card.querySelector(".card-bottom .muted")?.textContent.trim()
        || "Связаться с автором можно через чат ВОРТЕКС.";
    }

    const isOwner = Boolean(
      item && userId && String(item.ownerId) === String(userId)
    );
    $("[data-actions]").hidden = !isOwner;
    $("[data-status]").textContent = "";

    const bumpButton = $("[data-bump]");
    const deleteButton = $("[data-delete]");
    const hint = $("[data-hint]");
    const activeUntil = Date.parse(item?.bumpExpiresAt || "");

    bumpButton.disabled = Number.isFinite(activeUntil) && activeUntil > Date.now();
    bumpButton.textContent = bumpButton.disabled
      ? "⚡ Объявление уже поднято"
      : "⚡ Поднять объявление";
    hint.textContent = bumpButton.disabled
      ? `Продвижение активно до ${formatDate(item.bumpExpiresAt)}.`
      : "Лимит и срок поднятия проверяются сервером по вашему тарифу.";

    bumpButton.onclick = async () => {
      if (!db) return;
      bumpButton.disabled = true;
      $("[data-status]").textContent = "";

      try {
        const { data, error } = await db.rpc("vx_bump_listing", {
          p_listing_id: item.id
        });
        if (error) throw error;

        bumpButton.textContent = "⚡ Поднято";
        $("[data-status]").textContent = data?.expires_at
          ? `Объявление поднято до ${formatDate(data.expires_at)}.`
          : "Объявление поднято.";

        try {
          await window.VORTEX_RELOAD_LISTINGS?.();
        } catch (_) {}
      } catch (error) {
        $("[data-status]").textContent =
          error.message || "Не удалось поднять объявление.";
        bumpButton.disabled = false;
      }
    };

    deleteButton.onclick = async () => {
      if (!db || !window.confirm(
        "Убрать объявление из общего списка? Оно будет закрыто, переписки не удалятся."
      )) return;

      deleteButton.disabled = true;
      $("[data-status]").textContent = "";

      try {
        const { error } = await db.rpc("vx_close_listing", {
          p_listing_id: item.id
        });
        if (error) throw error;

        dialog.close();
        try {
          await window.VORTEX_RELOAD_LISTINGS?.();
        } catch (_) {}
        window.alert("Объявление закрыто. Переписки сохранены.");
      } catch (error) {
        $("[data-status]").textContent =
          error.message || "Не удалось закрыть объявление.";
        deleteButton.disabled = false;
      }
    };

    if (!dialog.open) dialog.showModal();
  }

  function clickableCard(target) {
    if (!(target instanceof Element)) return null;
    if (target.closest('a,button,input,select,textarea,[role="button"]')) return null;

    const card = target.closest(".card");
    return card?.parentElement === cards ? card : null;
  }

  cards.addEventListener("click", event => {
    const card = clickableCard(event.target);
    if (card) openDetails(card).catch(console.error);
  });

  cards.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = clickableCard(event.target);
    if (!card || event.target !== card) return;
    event.preventDefault();
    openDetails(card).catch(console.error);
  });

  $("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  function decorateCards() {
    cards.querySelectorAll(":scope > .card").forEach(card => {
      card.tabIndex = 0;
      card.setAttribute("aria-haspopup", "dialog");
    });
  }

  new MutationObserver(decorateCards).observe(cards, { childList: true });
  decorateCards();
})();
