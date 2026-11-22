(() => {
  "use strict";

  const LIVE_ORIGIN = "https://alcash012.github.io";
  const APP_PATH = "/vortex-site/";

  // Push-код работает только на живом сайте, не в Preview.
  if (
    window.location.origin !== LIVE_ORIGIN
    || !window.location.pathname.startsWith(APP_PATH)
  ) return;

  const client = window.VORTEX_SUPABASE;
  if (!client) {
    console.warn("Push ВОРТЕКС: клиент Supabase не найден.");
    return;
  }

  // Сюда вставить только publicKey из вывода генератора VAPID.
  const VAPID_PUBLIC_KEY = "BAOFxsthqU16n0P9FhgLKVGXZk8b_dPE3XA6Wmc0n8QZDChNkqi6U2LulHQ8tA0EvtFaej-u2cJvfyZVKlFGLQQ";

  let currentSession = null;
  let subscriptionTask = null;
  let registeredUserId = "";

  function notificationsAreEnabled() {
    try {
      const raw = localStorage.getItem("vortex-settings-v2")
        || localStorage.getItem("vortex-settings-v1")
        || "{}";
      return JSON.parse(raw).notifications === true;
    } catch {
      return false;
    }
  }

  function applicationServerKey(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const raw = window.atob(base64);
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  async function ensurePushSubscription(userId) {
    if (
      !userId
      || !notificationsAreEnabled()
      || typeof window.Notification === "undefined"
      || window.Notification.permission !== "granted"
      || !("serviceWorker" in navigator)
      || !("PushManager" in window)
    ) return;

    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.length < 80) {
      console.warn("Push ВОРТЕКС: не указан public VAPID key.");
      return;
    }

    if (subscriptionTask) {
      try {
        await subscriptionTask;
      } catch {}
      if (registeredUserId === userId) return;
    }

    const task = (async () => {
      const registration = await navigator.serviceWorker.register(
        `${APP_PATH}sw.js`,
        { scope: APP_PATH }
      );

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(VAPID_PUBLIC_KEY)
        });
      }

      const { error } = await client
        .from("push_subscriptions")
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          subscription: subscription.toJSON(),
          updated_at: new Date().toISOString()
        }, { onConflict: "endpoint" });

      if (error) throw error;
      registeredUserId = userId;
      console.info("Push ВОРТЕКС: подписка сохранена.");
    })();

    subscriptionTask = task;
    try {
      await task;
    } catch (error) {
      console.warn(
        "Не удалось включить push-уведомления ВОРТЕКС:",
        error?.message || error
      );
    } finally {
      if (subscriptionTask === task) subscriptionTask = null;
    }
  }

  async function disableCurrent() {
    if (subscriptionTask) {
      try {
        await subscriptionTask;
      } catch {}
    }

    if (!("serviceWorker" in navigator)) return;

    try {
      const registration =
        await navigator.serviceWorker.getRegistration(APP_PATH);
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription) {
        registeredUserId = "";
        return;
      }

      const userId = currentSession?.user?.id || registeredUserId;
      if (userId) {
        try {
          const { error } = await client
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", subscription.endpoint);
          if (error) console.warn("Не удалось удалить push-подписку:", error.message);
        } catch (error) {
          console.warn("Не удалось удалить push-подписку:", error?.message || error);
        }
      }

      await subscription.unsubscribe();
      registeredUserId = "";
    } catch (error) {
      console.warn("Не удалось отключить push:", error?.message || error);
    }
  }

  async function notifyMessage(messageId) {
    if (!messageId) return;

    try {
      const { error } = await client.functions.invoke("send-push", {
        body: { messageId }
      });
      if (error) {
        console.warn("Не удалось отправить push:", error.message);
      }
    } catch (error) {
      console.warn("Ошибка отправки push:", error?.message || error);
    }
  }

  window.VORTEX_PUSH = { notifyMessage, disableCurrent };

  window.addEventListener("vortex:notifications-changed", event => {
    if (event.detail?.enabled === true) {
      const userId = currentSession?.user?.id;
      if (userId) void ensurePushSubscription(userId);
    } else {
      void disableCurrent();
    }
  });

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      currentSession = session || null;
      const userId = currentSession?.user?.id;
      if (userId && notificationsAreEnabled()) {
        void ensurePushSubscription(userId);
      }
    }, 0);
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.warn("Не удалось проверить push-сессию:", error.message);
      return;
    }
    currentSession = data.session || null;
    const userId = currentSession?.user?.id;
    if (userId && notificationsAreEnabled()) {
      void ensurePushSubscription(userId);
    }
  });
})();