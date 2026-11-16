(() => {
  "use strict";

  const client = window.VORTEX_SUPABASE;
  const saveButton = document.getElementById("vx-profile-save");
  const status = document.getElementById("vx-profile-status");
  if (!client || !saveButton || !status) return;

  const storageKey = "vortex-profile-v1";
  const fileInput = document.getElementById("vx-avatar-file");
  const removeButton = document.getElementById("vx-avatar-remove");
  const cancelButton = document.getElementById("vx-profile-cancel");
  let removalPending = false;
  let syncing = false;

  removeButton?.addEventListener("click", () => {
    removalPending = true;
  });

  fileInput?.addEventListener("change", () => {
    if (fileInput.files?.length) removalPending = false;
  });

  cancelButton?.addEventListener("click", () => {
    removalPending = false;
  });

  function readLocalProfile() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  }

  function jpegBlob(dataUrl) {
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
    if (!match) throw new Error("Фото профиля имеет неподдерживаемый формат.");

    const binary = atob(match[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "image/jpeg" });
    if (blob.size > 250 * 1024) {
      throw new Error("Фото профиля превышает допустимый размер.");
    }
    return blob;
  }

  saveButton.addEventListener("click", async () => {
    if (syncing) return;
    syncing = true;
    status.textContent = "Сохраняем имя и аватар для переписок…";

    try {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = data?.session?.user?.id;
      if (!userId) {
        status.textContent =
          "Профиль сохранён в этом браузере. Войдите в аккаунт, чтобы показывать имя и аватар собеседникам.";
        return;
      }

      const profile = readLocalProfile();
      const avatarData = typeof profile.avatar === "string"
        ? profile.avatar
        : "";
      const avatarPath = `${userId}/avatar.jpg`;
      const { data: savedProfile, error: profileReadError } = await client
        .from("profiles")
        .select("avatar_path")
        .eq("id", userId)
        .maybeSingle();
      if (profileReadError) throw profileReadError;

      const row = {
        id: userId,
        display_name: typeof profile.name === "string"
          ? profile.name.trim().slice(0, 80)
          : ""
      };

      if (avatarData) {
        const blob = jpegBlob(avatarData);
        const { error: uploadError } = await client
          .storage
          .from("profile-avatars")
          .upload(avatarPath, blob, {
            cacheControl: "3600",
            contentType: "image/jpeg",
            upsert: true
          });
        if (uploadError) throw uploadError;
        row.avatar_path = avatarPath;
      } else if (removalPending) {
        row.avatar_path = null;
      } else if (typeof savedProfile?.avatar_path === "string") {
        row.avatar_path = savedProfile.avatar_path;
      }

      const { error: profileError } = await client
        .from("profiles")
        .upsert(row, { onConflict: "id" });
      if (profileError) throw profileError;

      if (!avatarData && removalPending) {
        const { error: removeError } = await client
          .storage
          .from("profile-avatars")
          .remove([avatarPath]);

        if (removeError) {
          console.warn("ВОРТЕКС: профиль сохранён, но фото не удалено.", removeError);
          status.textContent =
            "Имя сохранено, но не удалось удалить старый файл фото.";
          return;
        }
        removalPending = false;
      } else if (avatarData) {
        removalPending = false;
      }

      status.textContent = "Профиль сохранён для переписок.";
    } catch (error) {
      console.warn("ВОРТЕКС: не удалось синхронизировать профиль.", error);
      status.textContent =
        "Профиль сохранён в браузере, но не удалось обновить имя или фото для переписок.";
    } finally {
      syncing = false;
    }
  });
})();
