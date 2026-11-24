(() => {
  "use strict";

  const client = window.VORTEX_SUPABASE;
  const cardsRoot = document.getElementById("cards");
  const listingForm = document.getElementById("listingForm");

  if (!client) {
    console.error("Чат ВОРТЕКС: клиент Supabase не найден.");
    return;
  }

  let currentSession = null;
  let pendingListing = null;
  let activeConversation = null;
  let realtimeChannel = null;
  let notificationChannel = null;
let notificationChannelUserId = null;

  function notificationsAreEnabled() {
    if (typeof window.Notification === "undefined") return false;
    try {
      const raw = localStorage.getItem("vortex-settings-v2")
        || localStorage.getItem("vortex-settings-v1")
        || "{}";
      const saved = JSON.parse(raw);
      return saved.notifications === true
        && window.Notification.permission === "granted";
    } catch {
      return false;
    }
  }

  function stopNotificationChannel() {
    if (notificationChannel) {
      void client.removeChannel(notificationChannel);
    }
    notificationChannel = null;
        notificationChannelUserId = null;
  }

  function startNotificationChannel(userId) {
    if (!userId || !notificationsAreEnabled()) {
      stopNotificationChannel();
      return;
    }
    if (notificationChannel && notificationChannelUserId === userId) return;

    stopNotificationChannel();
    notificationChannelUserId = userId;
    notificationChannel = client
      .channel("vx-notifications-" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages"
      }, payload => {
        const message = payload.new;
        if (!message || message.sender_id === userId) return;
        if (!notificationsAreEnabled()) {
          stopNotificationChannel();
          return;
        }

        const conversation = conversationCache.get(message.conversation_id);
        const title = conversation?.listingTitle
          ? "Новое сообщение · " + conversation.listingTitle
          : "Новое сообщение в Вортекс";
        const body = String(message.body || "").trim().slice(0, 180)
          || "Откройте Вортекс, чтобы прочитать сообщение.";

        try {
          new window.Notification(title, {
            body,
            tag: "vortex-message-" + message.id
          });
        } catch (error) {
          console.warn("Не удалось показать уведомление ВОРТЕКС:", error);
        }
      })
      .subscribe();
  }
  const conversationCache = new Map();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const style = document.createElement("style");
  style.textContent = `
    .vx-chat-launch {
      position:fixed; z-index:900; right:18px;
      bottom:calc(env(safe-area-inset-bottom, 0px) + 82px);
      min-height:46px; padding:11px 16px;
      border:1px solid #f0e3c988; border-radius:999px;
      color:#17191b; background:#f0e3c9;
      box-shadow:0 8px 28px #0006;
      font:inherit; font-weight:800; cursor:pointer;
    }
    .vx-chat-dialog {
      width:min(620px,calc(100vw - 24px));
      max-width:620px; max-height:min(780px,calc(100dvh - 28px));
      padding:0; border:1px solid rgba(255,255,255,.2);
      border-radius:20px; color:#f3f0e9;
      background:#171a1d; box-shadow:0 24px 80px #0009;
    }
    .vx-chat-dialog::backdrop { background:#0009; backdrop-filter:blur(4px); }
    .vx-chat-shell { display:flex; flex-direction:column; max-height:inherit; padding:18px; }
    .vx-chat-head,.vx-chat-account,.vx-chat-list-head {
      display:flex; align-items:center; justify-content:space-between; gap:10px;
    }
    .vx-chat-head h2 { margin:3px 0 0; font-size:23px; }
    .vx-chat-eyebrow { color:#f0e3c9; font-size:10px; font-weight:800; letter-spacing:.12em; }
    .vx-chat-close,.vx-chat-secondary {
      min-height:36px; padding:7px 11px;
      border:1px solid rgba(255,255,255,.2); border-radius:10px;
      color:inherit; background:rgba(255,255,255,.07);
      font:inherit; font-weight:700; cursor:pointer;
    }
    .vx-chat-close { width:38px; font-size:20px; }
    .vx-chat-status { min-height:20px; margin:10px 0; color:#c7d4df; font-size:12px; line-height:1.5; }
    .vx-chat-explainer,.vx-chat-small { color:#a3a8ad; font-size:12px; line-height:1.5; }
    .vx-chat-field { display:grid; gap:5px; margin:12px 0; font-size:12px; font-weight:700; }
    .vx-chat-field input,.vx-chat-compose textarea {
      width:100%; box-sizing:border-box; padding:11px;
      border:1px solid rgba(255,255,255,.2); border-radius:10px;
      color:inherit; background:rgba(255,255,255,.07); font:inherit;
    }
    .vx-chat-auth-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
    .vx-chat-primary,.vx-chat-listing-button,.vx-chat-send {
      min-height:38px; padding:9px 13px; border:0; border-radius:10px;
      color:#17191b; background:#f0e3c9; font:inherit;
      font-size:13px; font-weight:800; cursor:pointer;
    }
    .vx-chat-primary:disabled,.vx-chat-send:disabled { opacity:.6; cursor:default; }
    .vx-chat-inbox[hidden],.vx-chat-auth[hidden],
    .vx-chat-thread[hidden],.vx-chat-list-panel[hidden],
    .vx-chat-listing-note[hidden] { display:none !important; }
    .vx-chat-account { margin:8px 0 14px; padding:9px 0; border-bottom:1px solid #ffffff20; }
    .vx-chat-account span { min-width:0; overflow-wrap:anywhere; font-size:12px; }
    .vx-chat-list-head { margin-bottom:8px; }
    .vx-chat-list-head h3,.vx-chat-thread h3 { margin:8px 0; font-size:16px; }
    .vx-chat-conversation {
           display:flex; align-items:center; justify-content:space-between; gap:10px;
      width:100%; margin:7px 0; padding:12px;
      border:1px solid #ffffff20; border-radius:12px;
      color:inherit; background:#ffffff09; text-align:left;
      white-space:pre-line; font:inherit; font-size:12px;
      line-height:1.5; cursor:pointer;
    }    .vx-chat-inbox-row {
      display: flex;
      align-items: stretch;
      gap: 6px;
      margin: 7px 0;
    }
    .vx-chat-inbox-row .vx-chat-conversation {
      flex: 1;
      min-width: 0;
      width: auto;
      margin: 0;
    }
        .vx-chat-conversation-text { flex:1; min-width:0; }
    .vx-chat-unread-badge {
      flex:none; min-width:22px; height:22px; padding:0 6px;
      display:inline-flex; align-items:center; justify-content:center;
      border-radius:999px; color:#17191b; background:#f0e3c9;
      font-size:11px; font-weight:800; line-height:1;
    }
    .vx-chat-hide-conversation {
      flex: none;
      padding: 0 10px;
      border: 1px solid currentColor;
      border-radius: 10px;
      color: inherit;
      background: transparent;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      opacity: .85;
    }
    .vx-chat-hide-conversation:hover {
      opacity: 1;
      background: #8882;
    }
    .vx-chat-messages {
      display:flex; flex-direction:column; gap:8px;
      min-height:100px; max-height:42vh; overflow:auto;
      padding:10px; border:1px solid #ffffff18;
      border-radius:13px; background:#0002;
    }
    .vx-chat-message {
      align-self:flex-start; max-width:88%; padding:9px 11px;
      border:1px solid #ffffff18; border-radius:12px 12px 12px 3px;
      background:#ffffff0b; overflow-wrap:anywhere;
    }
    .vx-chat-message.mine {
      align-self:flex-end; border-color:#f0e3c944;
      background:#f0e3c91a; border-radius:12px 12px 3px 12px;
    }
    .vx-chat-message-author { display:block; margin-bottom:4px; color:#f0e3c9; font-size:10px; font-weight:800; }
    .vx-chat-message-body { white-space:pre-wrap; font-size:13px; line-height:1.45; }
    .vx-chat-message-time { display:block; margin-top:5px; color:#a3a8ad; font-size:9px; text-align:right; }
    .vx-chat-compose { display:grid; gap:8px; margin-top:10px; }
    .vx-chat-compose textarea { min-height:72px; resize:vertical; }
    .vx-chat-send { justify-self:end; }
    .vx-chat-listing-button {
      display:block; width:calc(100% - 28px); margin:0 14px 12px;
      border:1px solid #f0e3c977; color:#f0e3c9;
      background:#f0e3c914; text-align:center;
    }
    .vx-chat-listing-note {
      margin-top:12px; padding:10px;
      border:1px solid rgba(255,255,255,.18);
      border-radius:11px; background:rgba(255,255,255,.05);
      color:#a3a8ad; font-size:11px; line-height:1.5;
    }
    .vx-chat-listing-note button {
      margin-top:7px; padding:6px 9px; border:1px solid #f0e3c977;
      border-radius:8px; color:#f0e3c9; background:#f0e3c914;
      font:inherit; font-weight:700; cursor:pointer;
    }
    body.light-theme .vx-chat-dialog { color:#25332b; background:#f7faf8; }
    body.light-theme .vx-chat-dialog::backdrop { background:#0007; }
    body.light-theme .vx-chat-status,
    body.light-theme .vx-chat-explainer,
    body.light-theme .vx-chat-small,
    body.light-theme .vx-chat-listing-note { color:#68756e; }
    body.light-theme .vx-chat-field input,
    body.light-theme .vx-chat-compose textarea {
      color:#25332b; border-color:#dce5de; background:#fff;
    }
    body.light-theme .vx-chat-secondary,
    body.light-theme .vx-chat-conversation,
    body.light-theme .vx-chat-messages,
    body.light-theme .vx-chat-message { color:#25332b; border-color:#dce5de; background:#fff; }
    body.light-theme .vx-chat-message.mine { background:#f1f5e9; }
    body.light-theme .vx-chat-message-author { color:#155e4b; }
    body.light-theme .vx-chat-message-time { color:#68756e; }
    body.light-theme .vx-chat-listing-button {
      color:#155e4b; border-color:#155e4b66; background:#155e4b0d;
    }
    body.light-theme .vx-chat-listing-note { border-color:#dce5de; background:#fff; }
    body.light-theme .vx-chat-listing-note button {
      color:#155e4b; border-color:#155e4b66; background:#155e4b0d;
    }
    @media(max-width:520px) {
      .vx-chat-dialog { width:100vw; max-width:none; height:100dvh; max-height:100dvh; margin:0; border-radius:0; }
      .vx-chat-shell { height:100%; max-height:100%; box-sizing:border-box; padding:14px; }
      .vx-chat-messages { max-height:46dvh; }
      .vx-chat-launch { right:12px; }
    }
  `;
  document.head.appendChild(style);

  const launchButton = document.createElement("button");
  launchButton.type = "button";
  launchButton.className = "vx-chat-launch";
  launchButton.textContent = "✉ Сообщения";
  launchButton.setAttribute("aria-label", "Открыть сообщения ВОРТЕКС");
  document.body.append(launchButton);

  const chatDialog = document.createElement("dialog");
  chatDialog.id = "vx-chat-dialog";
  chatDialog.className = "vx-chat-dialog";
  chatDialog.innerHTML = `
    <div class="vx-chat-shell">
      <header class="vx-chat-head">
        <div><span class="vx-chat-eyebrow">ВОРТЕКС</span><h2>Сообщения</h2></div>
        <button type="button" class="vx-chat-close" data-chat-close aria-label="Закрыть">×</button>
      </header>
      <p id="vx-chat-status" class="vx-chat-status" role="status" aria-live="polite"></p>

      <section id="vx-chat-auth" class="vx-chat-auth">
        <p class="vx-chat-explainer">
          Войдите или создайте аккаунт, чтобы переписываться по объявлениям.
          Сообщения хранятся внутри ВОРТЕКС и не отправляются по почте.
        </p>
        <form id="vx-chat-auth-form">
          <label class="vx-chat-field">Email для входа
            <input id="vx-chat-email" type="email" required autocomplete="username">
          </label>
          <label class="vx-chat-field">Пароль
            <input id="vx-chat-password" type="password" required minlength="8" autocomplete="current-password">
          </label>
          <div class="vx-chat-auth-actions">
            <button class="vx-chat-primary" type="submit">Войти</button>
            <button class="vx-chat-secondary" id="vx-chat-signup" type="button">Создать аккаунт</button>
          </div>
        </form>
        <small class="vx-chat-small">
          Почта используется только для входа и, если включено, подтверждения аккаунта.
        </small>
      </section>

      <section id="vx-chat-inbox" class="vx-chat-inbox" hidden>
        <div class="vx-chat-account">
          <span id="vx-chat-account-name"></span>
          <button type="button" class="vx-chat-secondary" id="vx-chat-signout">Выйти</button>
        </div>
        <section id="vx-chat-list-panel" class="vx-chat-list-panel">
          <div class="vx-chat-list-head">
            <h3>Ваши переписки</h3>
            <button type="button" class="vx-chat-secondary" id="vx-chat-refresh">Обновить</button>
          </div>
          <div id="vx-chat-list"></div>
        </section>
        <section id="vx-chat-thread" class="vx-chat-thread" hidden>
          <header class="vx-chat-thread-head">
            <button type="button" class="vx-chat-back-icon" id="vx-chat-back"
              aria-label="Все переписки" title="Все переписки">‹</button>
            <div class="vx-chat-peer-avatar" id="vx-chat-peer-avatar" aria-hidden="true">
              <span id="vx-chat-peer-initial">В</span>
              <img id="vx-chat-peer-image" alt="" hidden>
            </div>
            <div class="vx-chat-peer-info">
              <strong id="vx-chat-peer-name">Собеседник</strong>
              <span>Переписка в ВОРТЕКС</span>
            </div>
            <button type="button" class="vx-chat-thread-close" data-chat-close
              aria-label="Закрыть переписку">×</button>
          </header>
          <section class="vx-chat-listing-card" aria-label="Объявление">
            <div id="vx-chat-listing-placeholder" class="vx-chat-listing-placeholder" aria-hidden="true">◇</div>
            <img id="vx-chat-listing-image" class="vx-chat-listing-image" alt="" hidden>
            <div class="vx-chat-listing-info">
              <span>Объявление</span>
              <h3 id="vx-chat-thread-title"></h3>
              <strong id="vx-chat-listing-price" hidden></strong>
            </div>
            <span class="vx-chat-listing-arrow" aria-hidden="true">›</span>
          </section>
          <div id="vx-chat-call-mount" class="vx-chat-call-mount"></div>
          <div id="vx-chat-messages" class="vx-chat-messages" aria-live="polite"></div>
          <form id="vx-chat-send-form" class="vx-chat-compose">
            <textarea id="vx-chat-message-input" maxlength="4000" required
              placeholder="Напишите сообщение…"
              title="Enter — отправить, Shift+Enter — новая строка"
              aria-label="Текст сообщения"></textarea>
            <button type="submit" class="vx-chat-send">Отправить</button>
          </form>
        </section>
      </section>
    </div>
  `;
  document.body.append(chatDialog);

  const statusBox = document.getElementById("vx-chat-status");
  const authPanel = document.getElementById("vx-chat-auth");
  const inboxPanel = document.getElementById("vx-chat-inbox");
  const inboxListPanel = document.getElementById("vx-chat-list-panel");
  const threadPanel = document.getElementById("vx-chat-thread");
  const inboxList = document.getElementById("vx-chat-list");
  const messagesBox = document.getElementById("vx-chat-messages");
  const messageInput = document.getElementById("vx-chat-message-input");
  const peerNameElement = document.getElementById("vx-chat-peer-name");
  const peerAvatarInitial = document.getElementById("vx-chat-peer-initial");
  const peerAvatarImage = document.getElementById("vx-chat-peer-image");
  let peerProfile = { displayName: "", avatarUrl: "" };
  let peerProfileRequest = 0;
  let peerAvatarRenderRequest = 0;

  function setStatus(message) {
    statusBox.textContent = message || "";
  }

  function renderPeerProfile() {
    const displayName = peerProfile.displayName || "Собеседник";
    const initial = peerProfile.displayName
      ? Array.from(peerProfile.displayName)[0]?.toLocaleUpperCase("ru")
      : "В";

    peerNameElement.textContent = displayName;
    peerAvatarInitial.textContent = initial || "В";

    const renderRequest = ++peerAvatarRenderRequest;
    peerAvatarImage.onload = null;
    peerAvatarImage.onerror = null;

    if (!peerProfile.avatarUrl) {
      peerAvatarImage.hidden = true;
      peerAvatarImage.removeAttribute("src");
      peerAvatarInitial.hidden = false;
      return;
    }

    peerAvatarInitial.hidden = true;
    peerAvatarImage.hidden = false;
    peerAvatarImage.onerror = () => {
      if (renderRequest !== peerAvatarRenderRequest) return;
      peerAvatarImage.hidden = true;
      peerAvatarImage.removeAttribute("src");
      peerAvatarInitial.hidden = false;
    };
    peerAvatarImage.src = peerProfile.avatarUrl;
  }

  async function loadPeerProfile(conversationId, currentUserId, peerId, requestId) {
    if (!UUID_RE.test(peerId || "")) return;

    try {
      const { data, error } = await client
        .from("profiles")
        .select("id,display_name,avatar_path")
        .eq("id", peerId)
        .maybeSingle();

      if (error) throw error;
      if (requestId !== peerProfileRequest ||
          activeConversation?.id !== conversationId ||
          currentSession?.user?.id !== currentUserId) return;

      const displayName = typeof data?.display_name === "string"
        ? data.display_name.trim().slice(0, 80)
        : "";
      const expectedPath = `${peerId}/avatar.jpg`;
      let avatarUrl = "";

      if (data?.avatar_path === expectedPath) {
        try {
          const { data: imageData, error: imageError } = await client
            .storage
            .from("profile-avatars")
            .createSignedUrl(expectedPath, 3600);

          if (imageError) {
            console.warn("ВОРТЕКС: не удалось получить аватар собеседника.", imageError);
          } else {
            avatarUrl = imageData?.signedUrl || "";
          }
        } catch (imageError) {
          console.warn("ВОРТЕКС: не удалось получить аватар собеседника.", imageError);
        }
      }

      if (requestId !== peerProfileRequest ||
          activeConversation?.id !== conversationId ||
          currentSession?.user?.id !== currentUserId) return;

      peerProfile = { displayName, avatarUrl };
      renderPeerProfile();
      void loadMessages();
    } catch (error) {
      if (requestId === peerProfileRequest) {
        console.warn("ВОРТЕКС: не удалось загрузить профиль собеседника.", error);
      }
    }
  }

  function showChat() {
    if (!chatDialog.open) chatDialog.showModal();
    if (currentSession) {
      loadInbox();

      if (activeConversation && !threadPanel.hidden) {
        const currentUserId = currentSession.user.id;
        window.dispatchEvent(new CustomEvent("vortex:chat-thread-open", {
          detail: {
            conversationId: activeConversation.id,
            currentUserId,
            peerId: activeConversation.buyer_id === currentUserId
              ? activeConversation.seller_id
              : activeConversation.buyer_id
          }
        }));
      }
    } else {
      setStatus("Войдите или создайте аккаунт, чтобы открыть чат.");
    }
  }

  function stopRealtime() {
    if (realtimeChannel) {
      client.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  function updateCardButtons() {
    if (!cardsRoot) return;

    cardsRoot.querySelectorAll(":scope > .card[data-vx-listing-id]").forEach(card => {
      const listingId = card.dataset.vxListingId || "";
      if (!UUID_RE.test(listingId)) return;

      const ownerId = card.dataset.vxOwnerId || "";
      const existing = card.querySelector(".vx-chat-listing-button");

      if (currentSession?.user?.id && ownerId === currentSession.user.id) {
        existing?.remove();
        return;
      }

      if (existing) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "vx-chat-listing-button";
      button.textContent = "Написать в чат";
      button.dataset.vxListingId = listingId;
      card.append(button);
    });
  }

  function updateListingNotice() {
    const notice = document.getElementById("vx-chat-listing-note");
    if (!notice) return;

    const text = notice.querySelector("[data-chat-listing-note-text]");
    const button = notice.querySelector("[data-chat-login-from-form]");

    if (currentSession) {
      text.textContent =
        "Вы вошли. Объявление будет опубликовано на сервере; сообщения останутся внутри приложения. Фотографии пока не загружаются в Supabase.";
      button.hidden = true;
    } else {
      text.textContent =
        "Без входа объявление сохраняется только на этом устройстве. Войдите, чтобы опубликовать его для всех и пользоваться чатом.";
      button.hidden = false;
    }
  }

  async function applySession(session) {
    currentSession = session || null;
    authPanel.hidden = Boolean(currentSession);
    inboxPanel.hidden = !currentSession;

    if (currentSession) {
      document.getElementById("vx-chat-account-name").textContent =
        currentSession.user.email || "Аккаунт ВОРТЕКС";
      updateCardButtons();
      updateListingNotice();
      startNotificationChannel(currentSession.user.id);
      if (pendingListing) {
        const queued = pendingListing;
        pendingListing = null;
        startConversation(queued);
      } else {
        loadInbox();
      }
    } else {
            stopNotificationChannel();
      stopRealtime();
      chatDialog.classList.remove("vx-chat-thread-open");
      activeConversation = null;
      threadPanel.hidden = true;
      inboxListPanel.hidden = false;
      updateCardButtons();
      updateListingNotice();
    }
  }

  async function loadInbox() {
    if (!currentSession) return;

    const { data, error } = await client
      .from("conversations")
      .select("id,listing_id,buyer_id,seller_id,last_message_at,created_at")
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatus("Не удалось загрузить переписки: " + error.message);
      return;
    }

        let conversations = Array.isArray(data) ? data : [];

    const { data: hiddenRows, error: hiddenError } = await client
      .from("conversation_hides")
      .select("conversation_id,hidden_at")
      .eq("user_id", currentSession.user.id);

    if (hiddenError) {
      setStatus("Не удалось загрузить скрытые переписки: " + hiddenError.message);
      return;
    }

    const hiddenByConversation = new Map(
      (Array.isArray(hiddenRows) ? hiddenRows : []).map(item => [
        item.conversation_id,
        Date.parse(item.hidden_at)
      ])
    );

    conversations = conversations.filter(conversation => {
      const hiddenAt = hiddenByConversation.get(conversation.id);
      if (hiddenAt === undefined) return true;

      const lastMessageAt = Date.parse(conversation.last_message_at || "");
      return Number.isFinite(hiddenAt)
        && Number.isFinite(lastMessageAt)
        && lastMessageAt > hiddenAt;
    });
    conversationCache.clear();
    const unreadCounts = new Map();
    if (conversations.length) {
      const userId = currentSession.user.id;
      const conversationIds = conversations.map(item => item.id);
      const { data: readRows, error: readError } = await client
        .from("conversation_reads")
        .select("conversation_id,last_read_at")
        .eq("user_id", userId)
        .in("conversation_id", conversationIds);
      if (readError) {
        setStatus("Не удалось загрузить отметки прочтения: " + readError.message);
        return;
      }

      const savedReadAt = new Map(
        (Array.isArray(readRows) ? readRows : []).map(item => [
          item.conversation_id,
          item.last_read_at
        ])
      );
      const readAtByConversation = new Map(
        conversations.map(conversation => {
          const readAt = Date.parse(
            savedReadAt.get(conversation.id)
              || conversation.created_at
              || "1970-01-01T00:00:00.000Z"
          );
          return [
            conversation.id,
            Number.isFinite(readAt) ? readAt : 0
          ];
        })
      );

      const earliestReadAt = Math.min(...readAtByConversation.values());
      const earliestReadIso = new Date(earliestReadAt).toISOString();
      const pageSize = 1000;
      let offset = 0;

      while (true) {
        const { data: messageRows, error: messagesError } = await client
          .from("messages")
          .select("conversation_id,created_at")
          .in("conversation_id", conversationIds)
          .neq("sender_id", userId)
          .gt("created_at", earliestReadIso)
          .order("created_at", { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (messagesError) {
          setStatus(
            "Не удалось проверить непрочитанные сообщения: " + messagesError.message
          );
          return;
        }

        const page = Array.isArray(messageRows) ? messageRows : [];
        page.forEach(message => {
          const messageAt = Date.parse(message.created_at || "");
          const readAt = readAtByConversation.get(message.conversation_id) ?? 0;
          if (Number.isFinite(messageAt) && messageAt > readAt) {
            unreadCounts.set(
              message.conversation_id,
              (unreadCounts.get(message.conversation_id) || 0) + 1
            );
          }
        });

        if (page.length < pageSize) break;
        offset += pageSize;
      }
    }
    const listingIds = [...new Set(conversations.map(item => item.listing_id).filter(Boolean))];
    const listingDetails = new Map();

    if (listingIds.length) {
      const result = await client
        .from("listings")
        .select("id,title,price,image_path")
        .in("id", listingIds);
      (result.data || []).forEach(item => {
        const imageResult = item.image_path
          ? client.storage.from("listing-images").getPublicUrl(item.image_path)
          : null;
        listingDetails.set(item.id, {
          title: item.title || "",
          price: item.price || "",
          image: imageResult?.data?.publicUrl || ""
        });
      });
    }

    inboxList.replaceChildren();

    if (!conversations.length) {
      const empty = document.createElement("p");
      empty.className = "vx-chat-explainer";
      empty.textContent =
        "Переписок пока нет. Откройте опубликованное объявление другого пользователя и нажмите «Написать в чат».";
      inboxList.append(empty);
      return;
    }

    conversations.forEach(conversation => {
      const details = listingDetails.get(conversation.listing_id) || {};
      const title = details.title || "Объявление";
      conversation.listingTitle = title;
      conversation.listingPrice = details.price || "";
      conversation.listingImage = details.image || "";
      conversationCache.set(conversation.id, conversation);

            const row = document.createElement("div");
      row.className = "vx-chat-inbox-row";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vx-chat-conversation";

      const role = conversation.seller_id === currentSession.user.id
        ? "Вы — автор объявления"
        : "Диалог по объявлению";
      const date = conversation.last_message_at
        ? new Date(conversation.last_message_at).toLocaleString("ru-RU", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
          })
        : "";

            const conversationText = document.createElement("span");
      conversationText.className = "vx-chat-conversation-text";
      conversationText.textContent = `${title}\n${role}${date ? " · " + date : ""}`;
      button.append(conversationText);

      const unreadCount = unreadCounts.get(conversation.id) || 0;
      if (unreadCount > 0) {
        const badge = document.createElement("span");
        badge.className = "vx-chat-unread-badge";
        badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
        badge.setAttribute(
          "aria-label",
          `${unreadCount} непрочитанных сообщений`
        );
        button.append(badge);
      }
      button.addEventListener("click", () => openThread(conversation));
            row.append(button);

      const hideButton = document.createElement("button");
      hideButton.type = "button";
      hideButton.className = "vx-chat-hide-conversation";
      hideButton.textContent = "Скрыть";
      hideButton.title = "Скрыть только у себя; новое сообщение вернёт чат";

      hideButton.addEventListener("click", async event => {
        event.stopPropagation();
        const userId = currentSession?.user?.id;
        if (!userId) return;

        if (!window.confirm(
          `Скрыть переписку «${title}» только у себя? Новое сообщение вернёт её в список.`
        )) return;

        hideButton.disabled = true;

        try {
          const { error: deleteError } = await client
            .from("conversation_hides")
            .delete()
            .eq("user_id", userId)
            .eq("conversation_id", conversation.id);
          if (deleteError) throw deleteError;

          const { error: insertError } = await client
            .from("conversation_hides")
            .insert({
              user_id: userId,
              conversation_id: conversation.id
            });
          if (insertError) throw insertError;

          await loadInbox();
          setStatus("Переписка скрыта только у вас. Новое сообщение вернёт её в список.");
        } catch (error) {
          setStatus("Не удалось скрыть переписку: " + (error.message || "попробуйте позже"));
          hideButton.disabled = false;
        }
      });

      row.append(hideButton);
      inboxList.append(row);
    });
  }

  async function loadMessages() {
    if (!activeConversation || !currentSession) return;

    const conversationId = activeConversation.id;
    const { data, error } = await client
      .from("messages")
      .select("id,sender_id,body,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setStatus("Не удалось загрузить сообщения: " + error.message);
      return;
    }

    if (!activeConversation || activeConversation.id !== conversationId) return;

    messagesBox.replaceChildren();
    const messages = (Array.isArray(data) ? data : []).reverse();

    if (!messages.length) {
      const empty = document.createElement("p");
      empty.className = "vx-chat-explainer";
      empty.textContent = "Напишите первое сообщение в этой переписке.";
      messagesBox.append(empty);
    }

    const now = new Date();
    const makeDateKey = date => [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
    const todayKey = makeDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = makeDateKey(yesterday);
    let previousDateKey = "";

    messages.forEach(message => {
      const messageDate = message.created_at ? new Date(message.created_at) : null;
      if (messageDate && Number.isFinite(messageDate.getTime())) {
        const dateKey = makeDateKey(messageDate);
        if (dateKey !== previousDateKey) {
          const separator = document.createElement("div");
          separator.className = "vx-chat-date-separator";
          if (dateKey === todayKey) {
            separator.textContent = "Сегодня";
          } else if (dateKey === yesterdayKey) {
            separator.textContent = "Вчера";
          } else {
            const options = { day: "numeric", month: "long" };
            if (messageDate.getFullYear() !== now.getFullYear()) {
              options.year = "numeric";
            }
            separator.textContent = messageDate.toLocaleDateString("ru-RU", options);
          }
          messagesBox.append(separator);
          previousDateKey = dateKey;
        }
      }

      const isMine = message.sender_id === currentSession.user.id;
      const item = document.createElement("article");
      item.className = "vx-chat-message" + (isMine ? " mine" : " peer-message");

      const author = document.createElement("strong");
      author.className = "vx-chat-message-author";
      author.textContent = isMine
        ? "Вы"
        : (peerProfile.displayName || "Собеседник");

      const body = document.createElement("div");
      body.className = "vx-chat-message-body";
      body.textContent = message.body || "";

      const time = document.createElement("small");
      time.className = "vx-chat-message-time";
      time.textContent = messageDate && Number.isFinite(messageDate.getTime())
        ? messageDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit", minute: "2-digit"
          })
        : "";

      if (!isMine) {
        const avatar = document.createElement("span");
        avatar.className = "vx-chat-message-avatar";
        avatar.setAttribute("aria-hidden", "true");

        const initial = peerProfile.displayName
          ? Array.from(peerProfile.displayName)[0]?.toLocaleUpperCase("ru") || "В"
          : "В";
        avatar.textContent = initial;

        if (peerProfile.avatarUrl) {
          const image = document.createElement("img");
          image.alt = "";
          image.addEventListener("error", () => {
            avatar.textContent = initial;
          }, { once: true });
          avatar.append(image);
          image.src = peerProfile.avatarUrl;
        }

        item.append(avatar);
      }

      item.append(author, body, time);
      messagesBox.append(item);
    });

    messagesBox.scrollTop = messagesBox.scrollHeight;
        const latestMessage = messages[messages.length - 1];
    const userId = currentSession?.user?.id;
    if (
      userId
      && latestMessage?.created_at
      && activeConversation?.id === conversationId
    ) {
      const { error: readError } = await client
        .from("conversation_reads")
        .upsert({
          user_id: userId,
          conversation_id: conversationId,
          last_read_at: latestMessage.created_at
        }, { onConflict: "user_id,conversation_id" });

      if (readError) {
        setStatus(
          "Не удалось обновить отметку прочтения: " + readError.message
        );
      }
    }
  }

  function openThread(conversation) {
    activeConversation = conversation;
    inboxListPanel.hidden = true;
    threadPanel.hidden = false;
    chatDialog.classList.add("vx-chat-thread-open");
    document.getElementById("vx-chat-thread-title").textContent =
      conversation.listingTitle || "Объявление";
    const priceElement = document.getElementById("vx-chat-listing-price");
    const priceText = String(conversation.listingPrice || "").trim();
    if (priceElement) {
      priceElement.textContent = priceText;
      priceElement.hidden = !priceText;
    }

    const listingImageElement = document.getElementById("vx-chat-listing-image");
    const listingPlaceholder = document.getElementById("vx-chat-listing-placeholder");
    const listingImage = String(conversation.listingImage || "").trim();
    if (listingImageElement && listingPlaceholder) {
      if (listingImage) {
        listingImageElement.onerror = () => {
          listingImageElement.hidden = true;
          listingPlaceholder.hidden = false;
        };
        listingImageElement.src = listingImage;
        listingImageElement.hidden = false;
        listingPlaceholder.hidden = true;
      } else {
        listingImageElement.onerror = null;
        listingImageElement.removeAttribute("src");
        listingImageElement.hidden = true;
        listingPlaceholder.hidden = false;
      }
    }

    const currentUserId = currentSession?.user?.id || "";
    const peerId = conversation.buyer_id === currentUserId
      ? conversation.seller_id
      : conversation.buyer_id;
    const profileRequest = ++peerProfileRequest;
    peerProfile = { displayName: "", avatarUrl: "" };
    renderPeerProfile();
    void loadPeerProfile(conversation.id, currentUserId, peerId, profileRequest);

    window.dispatchEvent(new CustomEvent("vortex:chat-thread-open", {
      detail: { conversationId: conversation.id, currentUserId, peerId }
    }));

    stopRealtime();
    realtimeChannel = client
      .channel("vx-chat-" + conversation.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "conversation_id=eq." + conversation.id
      }, () => loadMessages())
      .subscribe();

    loadMessages();
  }

  async function startConversation(listing) {
    if (!currentSession) {
      pendingListing = listing;
      showChat();
      return;
    }

    if (!UUID_RE.test(listing.id)) {
      setStatus("У этого объявления нет серверного ID, поэтому чат пока недоступен.");
      return;
    }

    setStatus("Открываем переписку…");

    const { data, error } = await client.rpc("vx_start_conversation", {
      p_listing_id: listing.id
    });

    if (error) {
      const message = error.message || "Не удалось начать переписку.";
      setStatus(message.includes("со своим объявлением")
        ? "Нельзя начать чат со своего объявления."
        : message);
      return;
    }

    const conversationId = Array.isArray(data) ? data[0] : data;
    if (!UUID_RE.test(String(conversationId || ""))) {
      setStatus("Сервер не вернул ID переписки. Обновите страницу и попробуйте снова.");
      return;
    }

    const conversation = conversationCache.get(conversationId) || {
      id: conversationId,
      listing_id: listing.id,
      buyer_id: currentSession.user.id,
      listingTitle: listing.title || "Объявление",
      listingPrice: listing.price || "",
      listingImage: listing.image || ""
    };

    conversation.listingTitle = listing.title || conversation.listingTitle;
    conversation.listingPrice = listing.price || conversation.listingPrice || "";
    conversation.listingImage = listing.image || conversation.listingImage || "";
    openThread(conversation);
    loadInbox();
  }

  launchButton.addEventListener("click", showChat);

  chatDialog.querySelectorAll("[data-chat-close]").forEach(button => {
    button.addEventListener("click", () => chatDialog.close());
  });

  chatDialog.addEventListener("click", event => {
    if (event.target === chatDialog) chatDialog.close();
  });

  document.getElementById("vx-chat-auth-form").addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("vx-chat-email").value.trim();
    const password = document.getElementById("vx-chat-password").value;

    setStatus("Входим в аккаунт…");
    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(/invalid login credentials/i.test(error.message)
        ? "Не удалось войти. Проверьте email и пароль."
        : error.message);
    } else {
      setStatus("Вход выполнен.");
    }
  });

  document.getElementById("vx-chat-signup").addEventListener("click", async () => {
    const email = document.getElementById("vx-chat-email").value.trim();
    const password = document.getElementById("vx-chat-password").value;

    if (!email || password.length < 8) {
      setStatus("Введите email и пароль длиной не менее 8 символов.");
      return;
    }

    setStatus("Создаём аккаунт…");
    const redirectTo = new URL("./", window.location.href).href;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      setStatus(error.message);
    } else if (data.session) {
      setStatus("Аккаунт создан. Теперь можно пользоваться чатом.");
    } else {
      setStatus(
        "Аккаунт создан. Если Supabase попросит подтвердить email, перейдите по ссылке из письма. Переписка всё равно будет внутри ВОРТЕКС."
      );
    }
  });

  document.getElementById("vx-chat-signout").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) setStatus("Не удалось выйти: " + error.message);
  });

  document.getElementById("vx-chat-refresh").addEventListener("click", loadInbox);

  document.getElementById("vx-chat-back").addEventListener("click", () => {
    stopRealtime();
    chatDialog.classList.remove("vx-chat-thread-open");
    activeConversation = null;
    peerProfileRequest++;
    peerProfile = { displayName: "", avatarUrl: "" };
    renderPeerProfile();
    threadPanel.hidden = true;
    inboxListPanel.hidden = false;
    loadInbox();
  });

  function resizeChatMessageInput() {
    messageInput.style.height = "auto";
    const maxHeight = 120;
    const contentHeight = messageInput.scrollHeight;
    messageInput.style.height = `${Math.min(contentHeight, maxHeight)}px`;
    messageInput.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }

  messageInput.addEventListener("input", resizeChatMessageInput);
  resizeChatMessageInput();

  messageInput.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey ||
        event.ctrlKey || event.altKey || event.metaKey ||
        event.isComposing || event.keyCode === 229) return;

    event.preventDefault();
    messageInput.form?.requestSubmit();
  });

  document.getElementById("vx-chat-send-form").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentSession || !activeConversation) {
      setStatus("Войдите в аккаунт, чтобы отправить сообщение.");
      return;
    }

    const body = messageInput.value.trim();
    if (!body) return;

    const sendButton = event.currentTarget.querySelector('[type="submit"]');
    if (sendButton.disabled) return;
    sendButton.disabled = true;

      const { data: sentMessages, error } = await client
      .from("messages")
      .insert({
        conversation_id: activeConversation.id,
        sender_id: currentSession.user.id,
        body
      })
      .select("id");
    sendButton.disabled = false;

    if (error) {
      setStatus("Не удалось отправить сообщение: " + error.message);
      return;
    }

    const sentId = Array.isArray(sentMessages) ? sentMessages[0]?.id : null;
    if (sentId && window.VORTEX_PUSH?.notifyMessage) {
      Promise.resolve(window.VORTEX_PUSH.notifyMessage(sentId)).catch(pushError => {
        console.warn("Push не отправлен:", pushError?.message || pushError);
      });
    }

    messageInput.value = "";
    resizeChatMessageInput();
    setStatus("Сообщение отправлено внутри ВОРТЕКС.");
    loadMessages();
    loadInbox();
  });

  if (cardsRoot) {
    cardsRoot.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest(".vx-chat-listing-button");
      if (!button) return;

      const card = button.closest(".card");
      if (!card) return;

      const listing = {
        id: button.dataset.vxListingId || "",
        title: card.querySelector("h3")?.textContent.trim() || "Объявление",
        price: card.querySelector(".price")?.textContent.trim() || "",
        image: card.querySelector(".card-image")?.src || ""
      };

      if (!currentSession) {
        pendingListing = listing;
        showChat();
        setStatus("Войдите или создайте аккаунт, чтобы написать автору объявления.");
      } else {
        if (!chatDialog.open) chatDialog.showModal();
        startConversation(listing);
      }
    });

    new MutationObserver(updateCardButtons)
      .observe(cardsRoot, { childList: true });

    updateCardButtons();
  }

  if (listingForm) {
    const notice = document.createElement("section");
    notice.id = "vx-chat-listing-note";
    notice.className = "vx-chat-listing-note";
    notice.innerHTML = `
      <span data-chat-listing-note-text></span>
      <br>
      <button type="button" data-chat-login-from-form>Войти или создать аккаунт</button>
    `;
    listingForm.append(notice);

    notice.querySelector("[data-chat-login-from-form]").addEventListener("click", showChat);
    updateListingNotice();

    async function uploadListingPhoto(dataURL) {
      const prefix = "data:image/jpeg;base64,";
      if (typeof dataURL !== "string" || !dataURL.startsWith(prefix)) {
        throw new Error("Фото не подготовлено в формате JPEG.");
      }

      const binary = atob(dataURL.slice(prefix.length));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
      }

      const blob = new Blob([bytes], { type: "image/jpeg" });
      if (blob.size === 0 || blob.size > 512000) {
        throw new Error("Фото должно быть в формате JPEG размером до 500 КБ.");
      }

      const fileId = window.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${currentSession.user.id}/${fileId}.jpg`;
      const { error } = await client.storage
        .from("listing-images")
        .upload(path, blob, {
          cacheControl: "31536000",
          contentType: "image/jpeg",
          upsert: false
        });

      if (error) throw error;
      return path;
    }

    listingForm.addEventListener("submit", async event => {
      if (!currentSession) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const data = new FormData(listingForm);
      const get = name => String(data.get(name) || "").trim();
      const imageWasAdded = Boolean(get("image"));
      const submitButton = listingForm.querySelector('[type="submit"]');

      if (submitButton) submitButton.disabled = true;
      notice.querySelector("[data-chat-listing-note-text]").textContent =
        "Публикуем объявление на сервере…";

      try {
        const listingData = {
          owner_id: currentSession.user.id,
          category: get("category"),
          location: get("location"),
          title: get("title"),
          description: get("description"),
          price: get("price"),
          contact: get("contact"),
          highlights: data.getAll("highlights"),
rooms: get("category") === "housing" ? (get("rooms") || null) : null,
area_sqm: get("category") === "housing" && get("area_sqm") !== ""
  ? Number(get("area_sqm"))
  : null,
employment: get("category") === "jobs" ? (get("employment") || null) : null,
salary: get("category") === "jobs" && get("salary") !== ""
  ? Number(get("salary"))
  : null,
pet_kind: get("category") === "pets" ? (get("pet_kind") || null) : null,
condition: get("category") === "sales" ? (get("condition") || null) : null
        };

        if (imageWasAdded) {
          notice.querySelector("[data-chat-listing-note-text]").textContent =
            "Загружаем фото объявления…";
          try {
            listingData.image_path = await uploadListingPhoto(get("image"));
          } catch (uploadError) {
            notice.querySelector("[data-chat-listing-note-text]").textContent =
              "Не удалось загрузить фото: " +
              (uploadError.message || "попробуйте позже");
            return;
          }
        }

        notice.querySelector("[data-chat-listing-note-text]").textContent =
          "Публикуем объявление на сервере…";
        const { error } = await client
          .from("listings")
          .insert(listingData);

        if (error) {
          notice.querySelector("[data-chat-listing-note-text]").textContent =
            "Не удалось опубликовать: " + error.message
            + (listingData.image_path
              ? " Фото загружено, но не привязано к объявлению."
              : "");
          return;
        }

        listingForm.reset();
        document.getElementById("removeListingImage")?.click();
        document.getElementById("listingDialog")?.close();

        const query = document.getElementById("query");
        const city = document.getElementById("city");
        const category = document.getElementById("categoryFilter");
        if (query) query.value = "";
        if (city) city.value = "";
        if (category) category.value = "all";

        if (typeof window.VORTEX_RELOAD_LISTINGS === "function") {
          await window.VORTEX_RELOAD_LISTINGS();
        }

        alert(imageWasAdded
          ? "Объявление и фото опубликованы для всех. Теперь можно получать сообщения в чате."
          : "Объявление опубликовано для всех. Теперь можно получать сообщения в чате.");
      } catch (error) {
        notice.querySelector("[data-chat-listing-note-text]").textContent =
          "Ошибка соединения: " + (error.message || "попробуйте позже");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    }, true);
  }

    window.addEventListener("vortex:notifications-changed", event => {
    if (event.detail?.enabled === true && currentSession?.user?.id) {
      startNotificationChannel(currentSession.user.id);
    } else {
      stopNotificationChannel();
    }
  });

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => applySession(session), 0);
  });


  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      setStatus("Не удалось проверить вход в аккаунт.");
      return;
    }
    applySession(data.session);
  });

  window.setInterval(() => {
    if (chatDialog.open && currentSession && !activeConversation) loadInbox();
  }, 12000);
})();
