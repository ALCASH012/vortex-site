(() => {
  const KEY = "vortex-aurora-v1";
  const defaults = { color: "#a78bfa", enabled: true };

  function readSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        color: /^#[0-9a-f]{6}$/i.test(saved.color || "")
          ? saved.color
          : defaults.color,
        enabled: saved.enabled !== false
      };
    } catch {
      return { ...defaults };
    }
  }

  let saved = readSettings();

  try {
    CSS.registerProperty({
      name: "--vx-aurora-color",
      syntax: "<color>",
      inherits: true,
      initialValue: defaults.color
    });
  } catch {}

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --vx-aurora-color: ${defaults.color};
      transition: --vx-aurora-color .7s ease;
    }

    html body {
      background-color: #0d1014 !important;
      background-image:
        radial-gradient(ellipse at 18% 15%,
          color-mix(in srgb, var(--vx-aurora-color) 30%, transparent),
          transparent 55%),
        radial-gradient(ellipse at 82% 26%,
          rgba(58, 211, 202, .18), transparent 52%),
        radial-gradient(ellipse at 52% 86%,
          rgba(232, 126, 190, .16), transparent 54%),
        linear-gradient(145deg, #0d1014, #171c22, #101316) !important;
      background-size: 175% 175%, 160% 160%, 170% 170%, 100% 100% !important;
      background-position: 0% 0%, 100% 0%, 50% 100%, 0% 0%;
      background-attachment: fixed !important;
      animation: vx-aurora-drift 26s ease-in-out infinite alternate;
    }

    html body.light-theme {
      background-color: #f6f5f0 !important;
      background-image:
        radial-gradient(ellipse at 18% 15%,
          color-mix(in srgb, var(--vx-aurora-color) 14%, transparent),
          transparent 55%),
        radial-gradient(ellipse at 82% 26%,
          rgba(58, 211, 202, .10), transparent 52%),
        radial-gradient(ellipse at 52% 86%,
          rgba(232, 126, 190, .09), transparent 54%),
        linear-gradient(145deg, #f7f8f4, #eff1ed, #f8f6f1) !important;
    }

    html body.vx-aurora-off {
      animation: none !important;
      background-image: linear-gradient(145deg, #0d1014, #171c22) !important;
    }

    html body.light-theme.vx-aurora-off {
      background-image: linear-gradient(145deg, #f7f8f4, #eff1ed) !important;
    }

    html body.vx-reduce-motion,
    html body.vx-reduce-motion *,
    html body.vx-reduce-motion *::before,
    html body.vx-reduce-motion *::after {
      animation-duration: .01ms !important;
    }

    html body .hero {
      border-color: color-mix(in srgb, var(--vx-aurora-color) 25%, #353b41);
    }

    #vx-dialog input[type="color"] {
      width: 52px !important;
      height: 42px;
      padding: 3px;
      cursor: pointer;
    }

    @keyframes vx-aurora-drift {
      0% {
        background-position: 0% 0%, 100% 0%, 50% 100%, 0% 0%;
      }
      100% {
        background-position: 100% 100%, 0% 100%, 100% 0%, 0% 0%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html body { animation: none !important; }
    }
  `;
  document.head.appendChild(style);

  function applySettings(value) {
    document.documentElement.style.setProperty("--vx-aurora-color", value.color);
    document.body.classList.toggle("vx-aurora-off", !value.enabled);
  }

  applySettings(saved);

  const dialog = document.getElementById("vx-dialog");
  if (!dialog) {
    console.warn("Окно настроек не найдено. Проверь, что settings.js подключён.");
    return;
  }

  if (!dialog.querySelector("#vx-aurora-color")) {
    const enabledRow = document.createElement("label");
    enabledRow.className = "vx-row";
    enabledRow.innerHTML =
      '<span><strong>Переливающийся фон</strong>' +
      '<small>Включить или выключить анимацию</small></span>' +
      '<input id="vx-aurora-enabled" type="checkbox">';

    const colorRow = document.createElement("div");
    colorRow.className = "vx-row";
    colorRow.innerHTML =
      '<span><strong>Цвет перелива</strong>' +
      '<small>Выбери основной оттенок фона</small></span>' +
      '<input id="vx-aurora-color" type="color" aria-label="Цвет фона">';

    const themeRow = dialog.querySelector("#vx-theme")?.closest(".vx-row");
    const actions = dialog.querySelector(".vx-actions");

    const appearancePanel = dialog.querySelector("#vx-glass-panel-appearance");
    if (appearancePanel) {
      enabledRow.className = "vx-glass-row";
      colorRow.className = "vx-glass-row";
      appearancePanel.append(enabledRow, colorRow);
    } else if (themeRow) {
      themeRow.after(enabledRow, colorRow);
    } else if (actions) {
      actions.before(enabledRow, colorRow);
    } else {
      dialog.append(enabledRow, colorRow);
    }
  }

  const colorInput = dialog.querySelector("#vx-aurora-color");
  const enabledInput = dialog.querySelector("#vx-aurora-enabled");
  if (!colorInput || !enabledInput) return;
  enabledInput.classList.add("vx-glass-switch");

  const palette = document.createElement("div");
  palette.setAttribute("role", "group");
  palette.setAttribute("aria-label", "Цвет перелива");
  palette.style.cssText = "display:flex;align-items:center;gap:7px;flex-wrap:wrap";
  palette.innerHTML = ["#a78bfa", "#7c3aed", "#315efb", "#10b981", "#f59e0b", "#f97316", "#ef4444"].map(color => `<button type="button" data-vx-color="${color}" aria-label="Выбрать цвет ${color}" title="${color}" style="box-sizing:border-box;width:24px;height:24px;padding:0;border:2px solid transparent;border-radius:50%;background:${color};cursor:pointer"></button>`).join("");
  palette.querySelectorAll("button").forEach(dot => dot.addEventListener("click", () => {
    colorInput.value = dot.dataset.vxColor;
    colorInput.dispatchEvent(new Event("input", { bubbles: true }));
  }));
  colorInput.style.cssText = "width:28px!important;height:28px;padding:1px;border-radius:50%;cursor:pointer";
  colorInput.title = "Выбрать другой цвет";
  const colorRow = colorInput.closest(".vx-glass-row, .vx-row");
  palette.append(colorInput);
  if (colorRow) {
    colorRow.style.flexWrap = "wrap";
    colorRow.append(palette);
  }

  function updatePalette() {
    palette.querySelectorAll("button").forEach(dot => {
      const selected = dot.dataset.vxColor === colorInput.value.toLowerCase();
      dot.style.borderColor = selected ? "#18c997" : "transparent";
      dot.setAttribute("aria-pressed", String(selected));
    });
  }

  function reloadSavedSettings() {
    saved = readSettings();
    colorInput.value = saved.color;
    enabledInput.checked = saved.enabled;
    applySettings(saved);
    updatePalette();
  }

  function previewSettings() {
    applySettings({
      color: colorInput.value,
      enabled: enabledInput.checked
    });
    updatePalette();
  }

  colorInput.addEventListener("input", previewSettings);
  enabledInput.addEventListener("change", previewSettings);

  document.getElementById("vx-open")
    ?.addEventListener("click", reloadSavedSettings);

  document.getElementById("vx-save")
    ?.addEventListener("click", () => {
      const next = {
        color: colorInput.value,
        enabled: enabledInput.checked
      };

      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        saved = next;
        applySettings(saved);
      } catch {
        alert("Не удалось сохранить настройки в браузере.");
      }
    });

  document.getElementById("vx-reset")
    ?.addEventListener("click", () => {
      try { localStorage.removeItem(KEY); } catch {}
      saved = { ...defaults };
      applySettings(saved);
    });

  dialog.addEventListener("close", reloadSavedSettings);
})();
