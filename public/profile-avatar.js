(() => {
  const page = document.getElementById("vx-profile-page");
  const avatar = document.getElementById("vx-profile-avatar");

  if (!page || !avatar) {
    console.error("Профиль не найден. Проверь, что profile.js подключён.");
    return;
  }

  const storageKey = "vortex-profile-v1";
  const nameInput = document.getElementById("vx-profile-name");
  const saveButton = document.getElementById("vx-profile-save");
  const details = page.querySelector(".vx-profile-heading > div:last-child");

  if (!details || page.querySelector("#vx-avatar-file")) return;

  const style = document.createElement("style");
  style.textContent = `
    .vx-avatar {
      overflow: hidden;
      background-position: center;
      background-size: cover;
    }

    .vx-avatar-controls {
      display: none;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }

    .vx-profile-editing .vx-avatar-controls {
      display: flex;
    }

    .vx-avatar-upload,
    .vx-avatar-remove {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 8px 11px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 10px;
      color: inherit;
      background: rgba(255,255,255,.1);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .vx-avatar-upload input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      overflow: hidden;
      clip-path: inset(50%);
    }

    .vx-avatar-status {
      flex-basis: 100%;
      color: #a3a8ad;
      font-size: 12px;
    }

    body.light-theme .vx-avatar-upload,
    body.light-theme .vx-avatar-remove {
      color: #18231f;
      border-color: #d6ded8;
      background: #edf1ee;
    }

    body.light-theme .vx-avatar-status {
      color: #68756e;
    }
  `;
  document.head.appendChild(style);

  const controls = document.createElement("div");
  controls.className = "vx-avatar-controls";
  controls.innerHTML = `
    <label class="vx-avatar-upload">
      <span>Выбрать фото</span>
      <input id="vx-avatar-file" type="file" accept="image/*">
    </label>
    <button class="vx-avatar-remove" id="vx-avatar-remove" type="button">
      Убрать фото
    </button>
    <small class="vx-avatar-status" id="vx-avatar-status" role="status"></small>
  `;
  details.appendChild(controls);

  const fileInput = document.getElementById("vx-avatar-file");
  const removeButton = document.getElementById("vx-avatar-remove");
  const status = document.getElementById("vx-avatar-status");

  let currentAvatar = "";
  let operation = 0;

  function readProfile() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  }

  function validAvatar(value) {
    return typeof value === "string"
      && value.length < 400000
      && /^data:image\/jpeg;base64,/i.test(value);
  }

  function setAvatar(value) {
    currentAvatar = validAvatar(value) ? value : "";

    if (currentAvatar) {
      avatar.style.backgroundImage = `url("${currentAvatar}")`;
      avatar.style.color = "transparent";
      avatar.setAttribute("aria-label", "Аватар профиля");
    } else {
      avatar.style.backgroundImage = "none";
      avatar.style.color = "";
      const name = nameInput?.value.trim() || "";
      avatar.textContent = Array.from(name)[0]?.toLocaleUpperCase("ru") || "В";
      avatar.removeAttribute("aria-label");
    }
  }

  function loadSavedAvatar() {
    const profile = readProfile();
    setAvatar(profile.avatar || "");
    fileInput.value = "";
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Не удалось обработать фото."));
      reader.readAsDataURL(blob);
    });
  }

  async function makeAvatar(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Выбери файл изображения.");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Фото больше 10 МБ. Выбери файл поменьше.");
    }

    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Не удалось открыть фото."));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      const side = 320;
      canvas.width = side;
      canvas.height = side;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Не удалось подготовить фото.");

      const scale = Math.max(
        side / image.naturalWidth,
        side / image.naturalHeight
      );
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, side, side);
      context.drawImage(
        image,
        (side - width) / 2,
        (side - height) / 2,
        width,
        height
      );

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/jpeg", 0.75)
      );

      if (!blob || blob.size > 250 * 1024) {
        throw new Error("Не удалось сжать фото. Попробуй другое изображение.");
      }

      return await blobToDataURL(blob);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function persistAvatar() {
    const profile = readProfile();

    try {
      if (currentAvatar) profile.avatar = currentAvatar;
      else delete profile.avatar;

      localStorage.setItem(storageKey, JSON.stringify(profile));
      return true;
    } catch {
      if (status) status.textContent = "Не удалось сохранить фото в браузере.";
      return false;
    }
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const thisOperation = ++operation;
    if (saveButton) saveButton.disabled = true;
    status.textContent = "Готовим фото…";

    try {
      const dataURL = await makeAvatar(file);
      if (thisOperation !== operation) return;

      setAvatar(dataURL);
      status.textContent = "Фото выбрано. Нажми «Сохранить изменения».";
    } catch (error) {
      if (thisOperation === operation) {
        status.textContent = "";
        fileInput.value = "";
        alert(error.message || "Не удалось загрузить фото.");
      }
    } finally {
      if (thisOperation === operation && saveButton) {
        saveButton.disabled = false;
      }
    }
  });

  removeButton.addEventListener("click", () => {
    operation++;
    fileInput.value = "";
    setAvatar("");
    status.textContent = "Фото удалено. Нажми «Сохранить изменения».";
  });

  // Сохраняем после обработчика профиля, который записывает имя и контакты.
  saveButton?.addEventListener("click", () => {
    if (persistAvatar()) status.textContent = "Профиль и аватар сохранены.";
  });

  document.getElementById("vx-profile-cancel")
    ?.addEventListener("click", () => {
      operation++;
      loadSavedAvatar();
      status.textContent = "Изменения аватара отменены.";
    });

  // Сохраняем фото, если пользователь сразу нажал «Добавить вакансию».
  document.getElementById("vx-profile-add")
    ?.addEventListener("click", persistAvatar);

  new MutationObserver(() => {
    if (!page.hidden) loadSavedAvatar();
  }).observe(page, { attributes: true, attributeFilter: ["hidden"] });

  loadSavedAvatar();
})();
