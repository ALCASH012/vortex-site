"use strict";

const APP_URL = "https://alcash012.github.io/vortex-site/";
const APP_PATH = "/vortex-site/";

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let payload = {};

  if (event.data) {
    const text = event.data.text();
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { body: text };
    }
  }

  const title = String(payload.title || "Новое сообщение в Вортекс");
  const body = String(
    payload.body || "Откройте ВОРТЕКС, чтобы прочитать сообщение."
  );

  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: payload.messageId
      ? `vortex-message-${payload.messageId}`
      : "vortex-message",
    data: { url: payload.url || APP_URL }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil((async () => {
    let targetUrl = new URL(
      event.notification.data?.url || APP_URL,
      self.location.origin
    );

    if (
      targetUrl.origin !== self.location.origin
      || !targetUrl.pathname.startsWith(APP_PATH)
    ) {
      targetUrl = new URL(APP_URL);
    }

    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of windows) {
      if (new URL(client.url).origin === targetUrl.origin) {
        if (client.url !== targetUrl.href) {
          await client.navigate(targetUrl.href);
        }
        return client.focus();
      }
    }

    return self.clients.openWindow(targetUrl.href);
  })());
});