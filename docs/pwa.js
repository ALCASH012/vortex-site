"use strict";

const APP_ORIGIN = "https://alcash012.github.io";
const APP_PATH = "/vortex-site/";

if (
  "serviceWorker" in navigator
  && location.origin === APP_ORIGIN
  && location.pathname.startsWith(APP_PATH)
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${APP_PATH}sw.js`, { scope: APP_PATH })
      .catch(error => console.warn("Не удалось подключить ВОРТЕКС:", error));
  }, { once: true });
}
