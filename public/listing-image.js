(() => {
  const form = document.getElementById("listingForm");
  const fileInput = document.getElementById("listingImageFile");
  const dataInput = document.getElementById("listingImageData");
  const preview = document.getElementById("listingImagePreview");
  const previewImage = document.getElementById("listingImagePreviewImg");
  const status = document.getElementById("listingImageStatus");
  const submitButton = form?.querySelector('[type="submit"]');

  if (!form || !fileInput || !dataInput || !preview) {
    console.error("Не найдена форма или поле загрузки фото.");
    return;
  }

  let busy = false;
  let requestId = 0;

  function toDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Не удалось обработать фото."));
      reader.readAsDataURL(blob);
    });
  }

  function makeBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Не удалось сжать фото.")),
        "image/jpeg",
        quality
      );
    });
  }

  async function compressImage(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Выбери файл изображения.");
    }

    if (file.size > 12 * 1024 * 1024) {
      throw new Error("Фото больше 12 МБ. Выбери файл поменьше.");
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Не удалось открыть фото."));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Браузер не смог подготовить фото.");

      function draw(maxSide) {
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      }

      draw(1000);
      let blob = await makeBlob(canvas, 0.72);

      if (blob.size > 420 * 1024) {
        draw(760);
        blob = await makeBlob(canvas, 0.58);
      }

      if (blob.size > 500 * 1024) {
        throw new Error("Фото не удалось достаточно сжать. Выбери другое.");
      }

      return await toDataURL(blob);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function clearImage() {
    requestId++;
    busy = false;
    fileInput.value = "";
    dataInput.value = "";
    preview.hidden = true;
    previewImage.removeAttribute("src");
    status.textContent = "";
    if (submitButton) submitButton.disabled = false;
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    clearImage();

    if (!file) return;

    const currentId = ++requestId;
    busy = true;
    preview.hidden = false;
    status.textContent = "Подготавливаем фото…";
    if (submitButton) submitButton.disabled = true;

    try {
      const dataURL = await compressImage(file);
      if (currentId !== requestId) return;

      dataInput.value = dataURL;
      previewImage.src = dataURL;
      status.textContent = "Фото готово.";
    } catch (error) {
      if (currentId !== requestId) return;
      clearImage();
      alert(error.message || "Не удалось загрузить фото.");
    } finally {
      if (currentId === requestId) {
        busy = false;
        if (submitButton) submitButton.disabled = false;
      }
    }
  });

  document.getElementById("removeListingImage")
    ?.addEventListener("click", clearImage);

  form.addEventListener("submit", event => {
    if (busy) {
      event.preventDefault();
      event.stopImmediatePropagation();
      status.textContent = "Подожди, пока фото подготовится.";
    }
  }, true);

  form.addEventListener("reset", clearImage);
  document.getElementById("listingDialog")
    ?.addEventListener("close", clearImage);
})();
