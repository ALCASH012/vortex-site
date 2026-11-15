(() => {
  "use strict";

  const PLAN_KEY = "vortex-subscription-demo-v1";
  const DRAFT_KEY = "vortex-usual-draft-v1";
  const LISTINGS_KEY = "ryadom-demo-listings-v1";
  const form = document.getElementById("listingForm");
  const dialog = document.getElementById("listingDialog");
  const cardsRoot = document.getElementById("cards");

  if (!form) {
    console.error("Обычная версия: не найдена форма объявления.");
    return;
  }

  const fieldNames = [
    "category", "location", "title", "description",
    "price", "contact", "image"
  ];

  const readJSON = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch {
      return fallback;
    }
  };

  function selectedPlan() {
    try {
      return localStorage.getItem(PLAN_KEY) || "usual";
    } catch {
      return "usual";
    }
  }

  function hasUsualFeatures() {
    return !["econom", "deluxe", "premium"].includes(selectedPlan());
  }

  function getFieldValue(name) {
    const field = form.elements.namedItem(name);
    return field && typeof field.value === "string" ? field.value : "";
  }

  function collectFields() {
    const fields = {};
    fieldNames.forEach(name => {
      fields[name] = getFieldValue(name);
    });
    return fields;
  }

  function hasDraftContent(fields) {
    return ["location", "title", "description", "price", "contact", "image"]
      .some(name => String(fields[name] || "").trim() !== "");
  }

  function readDraft() {
    const draft = readJSON(DRAFT_KEY, null);
    return draft && typeof draft === "object" && draft.fields
      ? draft
      : null;
  }

  function formIsEmpty() {
    return ["location", "title", "description", "price", "contact"]
      .every(name => getFieldValue(name).trim() === "");
  }

  const style = document.createElement("style");
  style.textContent = `
    #vx-usual-draft-controls {
      margin-top:12px; padding:12px;
      border:1px solid rgba(255,255,255,.18);
      border-radius:13px; background:rgba(255,255,255,.05);
    }
    #vx-usual-draft-controls[hidden],
    #vx-usual-reminder[hidden] {
      display:none !important;
    }
    .vx-usual-draft-title { display:block; margin-bottom:5px; font-weight:750; }
    .vx-usual-draft-copy,
    #vx-usual-draft-status {
      display:block; margin:5px 0; color:#a3a8ad;
      font-size:12px; line-height:1.5;
    }
    .vx-usual-draft-actions {
      display:flex; flex-wrap:wrap; gap:7px; margin-top:9px;
    }
    .vx-usual-draft-actions button {
      min-height:34px; padding:7px 10px;
      border:1px solid rgba(255,255,255,.25); border-radius:9px;
      color:inherit; background:rgba(255,255,255,.08);
      font:inherit; font-size:12px; font-weight:700; cursor:pointer;
    }
    .vx-usual-draft-actions button:disabled {
      opacity:.6; cursor:default;
    }
    #vx-usual-reminder {
      margin:12px 0; padding:14px 16px;
      border:1px solid #e8c97999; border-radius:15px;
      color:#f3f0e9; background:rgba(232,201,121,.1);
    }
    .vx-usual-reminder-head {
      display:flex; justify-content:space-between; align-items:center; gap:10px;
    }
    .vx-usual-reminder-head strong { color:#f0e3c9; }
    .vx-usual-reminder-close {
      border:0; color:inherit; background:transparent;
      font-size:20px; cursor:pointer;
    }
    #vx-usual-reminder ul { margin:8px 0 0; padding-left:20px; }
    #vx-usual-reminder li { margin-top:5px; line-height:1.5; }
    body.light-theme #vx-usual-draft-controls {
      border-color:#dce5de; background:#ffffff80;
    }
    body.light-theme .vx-usual-draft-copy,
    body.light-theme #vx-usual-draft-status {
      color:#68756e;
    }
    body.light-theme .vx-usual-draft-actions button {
      border-color:#155e4b66; color:#155e4b; background:#155e4b0d;
    }
    body.light-theme #vx-usual-reminder {
      border-color:#b3892f66; color:#26342c; background:#f7edcf99;
    }
    body.light-theme .vx-usual-reminder-head strong { color:#73530a; }
  `;
  document.head.appendChild(style);

  const draftPanel = document.createElement("section");
  draftPanel.id = "vx-usual-draft-controls";
  draftPanel.innerHTML = `
    <strong class="vx-usual-draft-title">Черновик объявления</strong>
    <span class="vx-usual-draft-copy">
      Хранится в этом браузере. Можно сохранить только один черновик.
    </span>
    <div class="vx-usual-draft-actions">
      <button type="button" data-vx-draft-save>Сохранить черновик</button>
      <button type="button" data-vx-draft-restore>Восстановить</button>
      <button type="button" data-vx-draft-delete>Удалить</button>
    </div>
    <small id="vx-usual-draft-status" role="status"></small>
  `;
  form.append(draftPanel);

  const draftStatus = draftPanel.querySelector("#vx-usual-draft-status");
  const saveButton = draftPanel.querySelector("[data-vx-draft-save]");
  const restoreButton = draftPanel.querySelector("[data-vx-draft-restore]");
  const deleteButton = draftPanel.querySelector("[data-vx-draft-delete]");

  function setDraftStatus(message) {
    draftStatus.textContent = message;
  }

  function updateDraftButtons() {
    const exists = Boolean(readDraft());
    restoreButton.disabled = !exists;
    deleteButton.hidden = !exists;
  }

  function saveDraft(silentIfEmpty = false) {
    if (!hasUsualFeatures()) return false;

    const fields = collectFields();
    if (!hasDraftContent(fields)) {
      if (!silentIfEmpty) {
        setDraftStatus("Заполни хотя бы одно поле, чтобы сохранить черновик.");
      }
      return false;
    }

    const payload = {
      version: 1,
      savedAt: Date.now(),
      hadImage: Boolean(fields.image),
      photoSaved: Boolean(fields.image),
      fields
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setDraftStatus("Черновик сохранён в этом браузере.");
    } catch {
      const textOnlyPayload = {
        ...payload,
        photoSaved: false,
        fields: { ...fields, image: "" }
      };

      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(textOnlyPayload));
        setDraftStatus(
          "Текст черновика сохранён. Фото нужно будет загрузить заново."
        );
      } catch {
        setDraftStatus("Не удалось сохранить черновик в браузере.");
        return false;
      }
    }

    updateDraftButtons();
    return true;
  }

  function restoreDraft(force = false) {
    if (!hasUsualFeatures()) return;

    const draft = readDraft();
    if (!draft) {
      setDraftStatus("Сохранённого черновика пока нет.");
      updateDraftButtons();
      return;
    }

    if (!force && !formIsEmpty()) return;

    if (force && !formIsEmpty()
      && !confirm("Заменить текущие поля данными сохранённого черновика?")) {
      return;
    }

    const fields = draft.fields;
    fieldNames.forEach(name => {
      const field = form.elements.namedItem(name);
      if (!field || fields[name] === undefined || !("value" in field)) return;

      field.value = String(fields[name] ?? "");
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });

    if (draft.hadImage && !draft.photoSaved) {
      setDraftStatus(
        "Черновик восстановлен. Фото нужно загрузить заново."
      );
    } else {
      setDraftStatus("Черновик восстановлен. Проверь поля перед публикацией.");
    }

    updateDraftButtons();
  }

  function deleteDraft(message = "Черновик удалён.") {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setDraftStatus(message);
      updateDraftButtons();
    } catch {
      setDraftStatus("Не удалось удалить черновик.");
    }
  }

  saveButton.addEventListener("click", () => saveDraft());
  restoreButton.addEventListener("click", () => restoreDraft(true));
  deleteButton.addEventListener("click", () => deleteDraft());

  let restoringDraft = false;
  let autosaveTimer = 0;

  function scheduleAutosave() {
    if (restoringDraft || !hasUsualFeatures()) return;

    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => saveDraft(true), 500);
  }

  form.addEventListener("input", scheduleAutosave);
  form.addEventListener("change", scheduleAutosave);

  document.getElementById("openDialog")?.addEventListener("click", () => {
    window.setTimeout(() => {
      if (hasUsualFeatures() && formIsEmpty()) restoreDraft(false);
    }, 0);
  });

  document.getElementById("closeDialog")?.addEventListener("click", () => {
    saveDraft(true);
  });

  document.getElementById("cancelDialog")?.addEventListener("click", () => {
    saveDraft(true);
  });

  dialog?.addEventListener("cancel", () => saveDraft(true));

  form.querySelector("#listingImageFile")?.addEventListener("change", () => {
    window.setTimeout(() => saveDraft(true), 1500);
  });

  form.addEventListener("submit", () => {
    window.setTimeout(() => {
      const dialogClosed = !dialog || !dialog.open;
      if (dialogClosed && formIsEmpty()) {
        deleteDraft("Объявление опубликовано. Черновик удалён.");
      }
    }, 0);
  });

  let reminderBox = null;

  if (cardsRoot?.parentNode) {
    reminderBox = document.createElement("aside");
    reminderBox.id = "vx-usual-reminder";
    reminderBox.hidden = true;
    reminderBox.setAttribute("role", "status");
    reminderBox.setAttribute("aria-live", "polite");
    cardsRoot.parentNode.insertBefore(reminderBox, cardsRoot);

    reminderBox.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-vx-reminder-close]")) {
        reminderBox.hidden = true;
      }
    });
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

  function renderReminder() {
    if (!reminderBox || !hasUsualFeatures()) {
      if (reminderBox) reminderBox.hidden = true;
      return;
    }

    const listings = readJSON(LISTINGS_KEY, []);
    if (!Array.isArray(listings)) {
      reminderBox.hidden = true;
      return;
    }

    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const dueSoon = listings
      .filter(item => {
        const expiresAt = Number(item?.expiresAt) || 0;
        return expiresAt > now && expiresAt - now <= threeDays;
      })
      .sort((a, b) => Number(a.expiresAt) - Number(b.expiresAt));

    if (!dueSoon.length) {
      reminderBox.hidden = true;
      return;
    }

    const items = dueSoon.map(item => {
      const expiresAt = Number(item.expiresAt);
      const days = Math.max(1, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)));
      const remaining = days === 1
        ? "через 1 день"
        : `через ${days} дня`;
      const title = escapeHTML(item.title || "Без заголовка");
      const location = item.location
        ? ` — ${escapeHTML(item.location)}`
        : "";
      const date = new Date(expiresAt).toLocaleDateString("ru-RU");

      return `<li><strong>${title}</strong>${location}: истекает ${date} (${remaining}).</li>`;
    }).join("");

    reminderBox.innerHTML = `
      <div class="vx-usual-reminder-head">
        <strong>Скоро истекает срок объявления</strong>
        <button type="button" class="vx-usual-reminder-close"
          data-vx-reminder-close aria-label="Скрыть напоминание">×</button>
      </div>
      <ul>${items}</ul>
      <small>Напоминание хранится в этом браузере; push-уведомления не отправляются.</small>
    `;
    reminderBox.hidden = false;
  }

  function refresh() {
    const active = hasUsualFeatures();
    draftPanel.hidden = !active;
    updateDraftButtons();

    if (active) {
      setDraftStatus(readDraft()
        ? "В браузере сохранён один черновик."
        : "Заполненные поля будут сохраняться автоматически.");
    }

    renderReminder();
  }

  const subscriptionsPage = document.getElementById("vx-subscriptions-page");
  subscriptionsPage?.addEventListener("click", () => {
    window.setTimeout(refresh, 0);
  });

  if (subscriptionsPage && "MutationObserver" in window) {
    new MutationObserver(refresh)
      .observe(subscriptionsPage, { childList: true, subtree: true });
  }

  window.addEventListener("storage", refresh);
  refresh();
})();
