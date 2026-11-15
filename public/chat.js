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
      display:block; width:100%; margin:7px 0; padding:12px;
      border:1px solid #ffffff20; border-radius:12px;
      color:inherit; background:#ffffff09; text-align:left;
      white-space:pre-line; font:inherit; font-size:12px;
      line-height:1.5; cursor:pointer;
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
          <button type="button" class="vx-chat-secondary" id="vx-chat-back">← Все переписки</button>
          <h3 id="vx-chat-thread-title"></h3>
          <div id="vx-chat-messages" class="vx-chat-messages" aria-live="polite"></div>
          <form id="vx-chat-send-form" class="vx-chat-compose">
            <textarea id="vx-chat-message-input" maxlength="4000" required
              placeholder="Напишите сообщение…" aria-label="Текст сообщения"></textarea>
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

  function setStatus(message) {
    statusBox.textContent = message || "";
  }

  function showChat() {
    if (!chatDialog.open) chatDialog.showModal();
    if (currentSession) {
      loadInbox();
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

      if (pendingListing) {
        const queued = pendingListing;
        pendingListing = null;
        startConversation(queued);
      } else {
        loadInbox();
      }
    } else {
      stopRealtime();
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
      .select("id,listing_id,buyer_id,seller_id,last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatus("Не удалось загрузить переписки: " + error.message);
      return;
    }

    const conversations = Array.isArray(data) ? data : [];
    conversationCache.clear();

    const listingIds = [...new Set(conversations.map(item => item.listing_id).filter(Boolean))];
    const titles = new Map();

    if (listingIds.length) {
      const result = await client
        .from("listings")
        .select("id,title")
        .in("id", listingIds);
      (result.data || []).forEach(item => titles.set(item.id, item.title));
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
      const title = titles.get(conversation.listing_id) || "Объявление";
      conversation.listingTitle = title;
      conversationCache.set(conversation.id, conversation);

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

      button.textContent = `${title}\n${role}${date ? " · " + date : ""}`;
      button.addEventListener("click", () => openThread(conversation));
      inboxList.append(button);
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

    messages.forEach(message => {
      const item = document.createElement("article");
      item.className = "vx-chat-message"
        + (message.sender_id === currentSession.user.id ? " mine" : "");

      const author = document.createElement("strong");
      author.className = "vx-chat-message-author";
      author.textContent = message.sender_id === currentSession.user.id
        ? "Вы"
        : "Пользователь";

      const body = document.createElement("div");
      body.className = "vx-chat-message-body";
      body.textContent = message.body || "";

      const time = document.createElement("small");
      time.className = "vx-chat-message-time";
      time.textContent = message.created_at
        ? new Date(message.created_at).toLocaleTimeString("ru-RU", {
            hour: "2-digit", minute: "2-digit"
          })
        : "";

      item.append(author, body, time);
      messagesBox.append(item);
    });

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function openThread(conversation) {
    activeConversation = conversation;
    inboxListPanel.hidden = true;
    threadPanel.hidden = false;
    document.getElementById("vx-chat-thread-title").textContent =
      "Объявление: " + (conversation.listingTitle || "Объявление");

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
      listingTitle: listing.title || "Объявление"
    };

    conversation.listingTitle = listing.title || conversation.listingTitle;
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
    activeConversation = null;
    threadPanel.hidden = true;
    inboxListPanel.hidden = false;
    loadInbox();
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
    sendButton.disabled = true;

    const { error } = await client.from("messages").insert({
      conversation_id: activeConversation.id,
      sender_id: currentSession.user.id,
      body
    });

    sendButton.disabled = false;

    if (error) {
      setStatus("Не удалось отправить сообщение: " + error.message);
      return;
    }

    messageInput.value = "";
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
        title: card.querySelector("h3")?.textContent.trim() || "Объявление"
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
        const { error } = await client
          .from("listings")
          .insert({
            owner_id: currentSession.user.id,
            category: get("category"),
            location: get("location"),
            title: get("title"),
            description: get("description"),
            price: get("price"),
            contact: get("contact")
          });

        if (error) {
          notice.querySelector("[data-chat-listing-note-text]").textContent =
            "Не удалось опубликовать: " + error.message;
          return;
        }

        listingForm.reset();
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
          ? "Объявление опубликовано для всех. Фото пока не загружается на сервер."
          : "Объявление опубликовано для всех. Теперь можно получать сообщения в чате.");
      } catch (error) {
        notice.querySelector("[data-chat-listing-note-text]").textContent =
          "Ошибка соединения: " + (error.message || "попробуйте позже");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    }, true);
  }

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
