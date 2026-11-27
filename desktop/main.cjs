"use strict";

const { app, BrowserWindow, dialog, session, shell } = require("electron");
const path = require("node:path");

const APP_URL = new URL("https://alcash012.github.io/vortex-site/");
const APP_SCOPE = "/vortex-site";
const APP_ID = "com.alcash012.vortex";
const EXTERNAL_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

let mainWindow = null;
const grantedPermissions = new Set();
const pendingPermissionPrompts = new Map();

function isAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:"
      && url.origin === APP_URL.origin
      && (url.pathname === APP_SCOPE || url.pathname.startsWith(`${APP_SCOPE}/`));
  } catch {
    return false;
  }
}

function openExternalSafely(rawUrl) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return;
  }

  if (!EXTERNAL_PROTOCOLS.has(target.protocol)) return;

  void shell.openExternal(target.href).catch(error => {
    console.warn("Не удалось открыть внешнюю ссылку:", error);
  });
}

function askForPermission(permission) {
  if (grantedPermissions.has(permission)) return Promise.resolve(true);

  const pending = pendingPermissionPrompts.get(permission);
  if (pending) return pending;

  const prompts = {
    microphone: {
      title: "Доступ к микрофону — ВОРТЕКС",
      message: "Разрешить ВОРТЕКС использовать микрофон?",
      detail: "Микрофон нужен для голосовых звонков. Разрешайте доступ, только если сами начали звонок."
    },
    notifications: {
      title: "Уведомления — ВОРТЕКС",
      message: "Разрешить ВОРТЕКС показывать уведомления?",
      detail: "Уведомления также могут быть отключены в настройках операционной системы."
    }
  };

  const prompt = prompts[permission];
  if (!prompt) return Promise.resolve(false);

  const options = {
    type: "question",
    ...prompt,
    buttons: ["Разрешить", "Запретить"],
    defaultId: 1,
    cancelId: 1
  };

  const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  let dialogPromise;

  try {
    dialogPromise = parent
      ? dialog.showMessageBox(parent, options)
      : dialog.showMessageBox(options);
  } catch {
    return Promise.resolve(false);
  }

  const resultPromise = dialogPromise
    .then(({ response }) => {
      const allowed = response === 0;
      if (allowed) grantedPermissions.add(permission);
      return allowed;
    })
    .catch(() => false)
    .finally(() => pendingPermissionPrompts.delete(permission));

  pendingPermissionPrompts.set(permission, resultPromise);
  return resultPromise;
}

function configurePermissionHandler() {
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const requestingUrl = details?.requestingUrl || webContents.getURL();

      if (!isAppUrl(requestingUrl)) {
        callback(false);
        return;
      }

      const respond = allowed => {
        try {
          callback(Boolean(allowed));
        } catch {
          // Страница могла закрыться, пока было открыто системное окно.
        }
      };

      if (permission === "media") {
        const mediaTypes = Array.isArray(details?.mediaTypes)
          ? details.mediaTypes
          : [];

        // Сейчас приложению нужен только микрофон; доступ к камере не даём.
        if (mediaTypes.length === 0 || mediaTypes.some(type => type !== "audio")) {
          callback(false);
          return;
        }

        void askForPermission("microphone").then(respond, () => respond(false));
        return;
      }

      if (permission === "notifications") {
        void askForPermission("notifications").then(respond, () => respond(false));
        return;
      }

      callback(false);
    }
  );
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 720,
    minHeight: 520,
    show: true,
    autoHideMenuBar: true,
    title: "ВОРТЕКС",
    backgroundColor: "#11161b",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: !app.isPackaged
    }
  });

  mainWindow = window;

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) {
      void window.loadURL(url).catch(error => {
        console.error("Не удалось открыть страницу ВОРТЕКС:", error);
      });
    } else {
      openExternalSafely(url);
    }
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    openExternalSafely(url);
  });

  window.webContents.on("will-redirect", (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    openExternalSafely(url);
  });

  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  void window.loadURL(APP_URL.href).catch(error => {
    console.error("Не удалось загрузить сайт ВОРТЕКС:", error);
  });
}

app.whenReady().then(() => {
  app.setName("ВОРТЕКС");
  if (process.platform === "win32") {
    app.setAppUserModelId(APP_ID);
  }

  configurePermissionHandler();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
}).catch(error => {
  console.error("Не удалось запустить ВОРТЕКС:", error);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
