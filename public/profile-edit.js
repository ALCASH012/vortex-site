(() => {
  const page = document.getElementById("vx-profile-page");
  const save = document.getElementById("vx-profile-save");

  if (!page || !save) {
    console.error("Профиль не найден. Проверь, что profile.js подключён.");
    return;
  }

  const actions = save.parentElement;
  const fields = [
    document.getElementById("vx-profile-name"),
    document.getElementById("vx-profile-contact"),
    document.getElementById("vx-profile-city"),
    document.getElementById("vx-profile-about")
  ].filter(Boolean);

  const status = document.getElementById("vx-profile-status");
  const storageKey = "vortex-profile-v1";

  const style = document.createElement("style");
  style.textContent = `
    .vx-profile-actions {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
    }
    .vx-profile-actions [hidden] {
      display: none !important;
    }
    .vx-profile-page:not(.vx-profile-editing) .vx-profile-fields input:read-only,
    .vx-profile-page:not(.vx-profile-editing) .vx-profile-fields textarea:read-only {
      opacity: .82;
      cursor: default;
    }
    #vx-profile-edit, #vx-profile-cancel {
      min-height: 46px;
      padding: 11px;
      border: 0;
      border-radius: 12px;
      font: inherit;
      font-weight: 750;
      cursor: pointer;
    }
    #vx-profile-edit {
      color: #17191b;
      background: #f0e3c9;
    }
    #vx-profile-cancel {
      color: #f3f0e9;
      background: #30363c;
    }
    body.light-theme #vx-profile-edit {
      color: #fff;
      background: #155e4b;
    }
    body.light-theme #vx-profile-cancel {
      color: #18231f;
      background: #edf1ee;
    }
  `;
  document.head.appendChild(style);

  const edit = document.createElement("button");
  edit.id = "vx-profile-edit";
  edit.type = "button";
  edit.textContent = "Редактировать профиль";

  const cancel = document.createElement("button");
  cancel.id = "vx-profile-cancel";
  cancel.type = "button";
  cancel.textContent = "Отмена";

  actions.insertBefore(edit, save);
  actions.insertBefore(cancel, save);
  save.textContent = "Сохранить изменения";

  const addVacancy = document.getElementById("vx-profile-add");

  function readSavedProfile() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  }

  function updateEditLabel() {
    const profile = readSavedProfile();
    const exists = Object.values(profile).some(value =>
      typeof value === "string" && value.trim()
    );
    edit.textContent = exists ? "Редактировать профиль" : "Заполнить профиль";
  }

  function loadSavedValues() {
    const profile = readSavedProfile();
    const ids = [
      ["vx-profile-name", "name"],
      ["vx-profile-contact", "contact"],
      ["vx-profile-city", "city"],
      ["vx-profile-about", "about"]
    ];

    ids.forEach(([id, key]) => {
      const field = document.getElementById(id);
      if (field) field.value = profile[key] || "";
    });

    document.getElementById("vx-profile-name")
      ?.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function setEditing(enabled) {
    page.classList.toggle("vx-profile-editing", enabled);
    fields.forEach(field => { field.readOnly = !enabled; });

    edit.hidden = enabled;
    cancel.hidden = !enabled;
    save.hidden = !enabled;

    if (addVacancy) addVacancy.hidden = enabled;
  }

  edit.addEventListener("click", () => {
    setEditing(true);
    if (status) status.textContent =
      "Измени данные и нажми «Сохранить изменения» или «Отмена».";
    fields[0]?.focus();
  });

  cancel.addEventListener("click", () => {
    loadSavedValues();
    setEditing(false);
    updateEditLabel();
    if (status) status.textContent = "Изменения отменены.";
  });

  // profile.js сохраняет данные первым обработчиком, затем закрываем режим редактирования.
  save.addEventListener("click", () => {
    setEditing(false);
    updateEditLabel();
  });

  // При повторном открытии профиля показываем сохранённые данные, а не черновик.
  new MutationObserver(() => {
    if (!page.hidden) {
      loadSavedValues();
      setEditing(false);
      updateEditLabel();
    }
  }).observe(page, { attributes: true, attributeFilter: ["hidden"] });

  loadSavedValues();
  setEditing(false);
  updateEditLabel();
})();
