(() => {
  "use strict";

  const client = window.VORTEX_SUPABASE;
  const dialog = document.getElementById("vx-chat-dialog");
  const title = document.getElementById("vx-chat-thread-title");

  if (!client || !dialog || !title) {
    console.error("Звонки ВОРТЕКС: чат или Supabase не найдены.");
    return;
  }

  let thread = null;
  let channel = null;
  let channelReady = false;
  let peer = null;
  let stream = null;
  let callId = null;
  let callState = "idle";
  let pendingOffer = null;
  let queuedCandidates = [];
  let ringTimer = null;

  const style = document.createElement("style");
  style.textContent = `
    #vx-chat-dialog .vx-call-bar {
      padding:8px 12px; border-bottom:1px solid #ffffff18;
      background:#090909;
    }
    #vx-chat-dialog .vx-call-status {
      min-height:18px; margin:0 0 7px; color:#aaa;
      font-size:12px; line-height:1.4;
    }
    #vx-chat-dialog .vx-call-actions { display:flex; gap:7px; flex-wrap:wrap; }
    #vx-chat-dialog .vx-call-actions button {
      min-height:36px; padding:7px 12px; border:1px solid #383838;
      border-radius:999px; color:#fff; background:#1b1b1b;
      font:inherit; font-size:12px; cursor:pointer;
    }
    #vx-chat-dialog .vx-call-actions .vx-call-accept {
      color:#07140e; border-color:#20c997; background:#20c997;
    }
    #vx-chat-dialog .vx-call-actions .vx-call-end,
    #vx-chat-dialog .vx-call-actions .vx-call-reject {
      border-color:#773333; background:#492323;
    }
  `;
  document.head.append(style);

  const bar = document.createElement("section");
  bar.className = "vx-call-bar";
  bar.innerHTML = `
    <p class="vx-call-status" role="status" aria-live="polite"></p>
    <div class="vx-call-actions">
      <button type="button" class="vx-call-start">☎ Позвонить</button>
      <button type="button" class="vx-call-accept" hidden>Принять</button>
      <button type="button" class="vx-call-reject" hidden>Отклонить</button>
      <button type="button" class="vx-call-end" hidden>Завершить</button>
    </div>
  `;
  title.after(bar);

  const status = bar.querySelector(".vx-call-status");
  const startButton = bar.querySelector(".vx-call-start");
  const acceptButton = bar.querySelector(".vx-call-accept");
  const rejectButton = bar.querySelector(".vx-call-reject");
  const endButton = bar.querySelector(".vx-call-end");

  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.playsInline = true;
  audio.className = "vx-call-audio";
  audio.setAttribute("aria-label", "Звук собеседника");
  audio.style.width = "100%";
  audio.hidden = true;
  bar.append(audio);

  const muteButton = document.createElement("button");
  muteButton.type = "button";
  muteButton.textContent = "Выключить микрофон";
  muteButton.hidden = true;
  bar.querySelector(".vx-call-actions").append(muteButton);

  function setStatus(message) {
    status.textContent = message;
  }

  function updateControls() {
    const incoming = callState === "incoming";
    const active = callState === "outgoing" ||
      callState === "connecting" ||
      callState === "active";

    startButton.hidden = callState !== "idle";
    acceptButton.hidden = !incoming;
    rejectButton.hidden = !incoming;
    endButton.hidden = !active;

    const tracks = stream ? stream.getAudioTracks() : [];
    muteButton.hidden = tracks.length === 0 || !active;

    if (tracks.length > 0) {
      muteButton.textContent = tracks.some(track => track.enabled)
        ? "Выключить микрофон"
        : "Включить микрофон";
    }
  }

  muteButton.addEventListener("click", () => {
    const tracks = stream ? stream.getAudioTracks() : [];
    if (tracks.length === 0) return;

    const enableMic = tracks.some(track => !track.enabled);
    tracks.forEach(track => { track.enabled = enableMic; });
    updateControls();
  });

  updateControls();

  function clearRingTimer() {
    if (ringTimer !== null) {
      clearTimeout(ringTimer);
      ringTimer = null;
    }
  }

  function stopMedia() {
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
      peer = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    audio.pause();
    audio.srcObject = null;
    audio.hidden = true;
    audio.controls = false;
    queuedCandidates = [];
    pendingOffer = null;
  }

  async function requestMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Микрофон недоступен. Откройте ВОРТЕКС по HTTPS в поддерживаемом браузере.");
    }
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  function isUuid(value) {
    return typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  async function sendSignal(type, details = {}, signalCallId = callId) {
    const targetThread = thread;
    const targetChannel = channel;

    if (!targetThread || !targetChannel || !channelReady || !signalCallId) {
      return false;
    }

    const payload = {
      ...details,
      type,
      conversationId: targetThread.conversationId,
      callId: signalCallId,
      from: targetThread.currentUserId,
      to: targetThread.peerId
    };

    try {
      const result = await targetChannel.send({
        type: "broadcast",
        event: "signal",
        payload
      });
      return result === "ok";
    } catch (error) {
      console.error("Звонки ВОРТЕКС: не удалось отправить сигнал.", error);
      return false;
    }
  }

  async function finishCall(message, signalType = null) {
    const endingCallId = callId;
    clearRingTimer();

    if (callId === endingCallId) {
      stopMedia();
      if (endingCallId) earlyIceCandidates.delete(endingCallId);
      callId = null;
      callState = "idle";
      updateControls();
      setStatus(message || "Звонок завершён.");
    }

    if (signalType && endingCallId) {
      await sendSignal(signalType, {}, endingCallId);
    }
  }

  async function detachChannel() {
    const oldChannel = channel;
    channel = null;
    channelReady = false;
    if (!oldChannel) return;

    try {
      await client.removeChannel(oldChannel);
    } catch (error) {
      console.warn("Звонки ВОРТЕКС: не удалось отключить канал.", error);
    }
  }

  function createCallId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    if (!window.crypto?.getRandomValues) return null;

    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  async function flushQueuedCandidates() {
    if (!peer || !peer.remoteDescription) return;
    const candidates = queuedCandidates.splice(0);
    for (const candidate of candidates) {
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.warn("Звонки ВОРТЕКС: кандидат ICE не принят.", error);
      }
    }
  }

  function createPeer() {
    const peerCallId = callId;
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    peer = connection;

    if (stream) {
      stream.getTracks().forEach(track => connection.addTrack(track, stream));
    }

    connection.onicecandidate = event => {
      if (event.candidate) {
        void sendSignal("ice-candidate", {
          candidate: event.candidate.toJSON()
        }, peerCallId);
      }
    };

    connection.ontrack = event => {
      audio.srcObject = event.streams?.[0] || new MediaStream([event.track]);
      audio.play().catch(() => {
        audio.hidden = false;
        audio.controls = true;
        setStatus("Звонок соединён. Нажмите ▶, чтобы включить звук.");
      });
    };

    connection.onconnectionstatechange = () => {
      if (peer !== connection) return;

      if (connection.connectionState === "connected") {
        clearRingTimer();
        callState = "active";
        setStatus("Разговор идёт.");
        updateControls();
      } else if (connection.connectionState === "disconnected") {
        setStatus("Связь прервалась. Пытаемся восстановить…");
        clearRingTimer();
        ringTimer = setTimeout(() => {
          if (peer === connection && connection.connectionState === "disconnected") {
            void finishCall("Связь потеряна.", "hangup");
          }
        }, 12000);
      } else if (connection.connectionState === "failed") {
        void finishCall("Не удалось установить связь.", "hangup");
      }
    };

    return connection;
  }

  const earlyIceCandidates = new Map();

  function takeEarlyIceCandidates(id) {
    const candidates = earlyIceCandidates.get(id) || [];
    earlyIceCandidates.delete(id);
    return candidates;
  }

  function isDescription(value, type) {
    return value && value.type === type && typeof value.sdp === "string";
  }

  function isIceCandidate(value) {
    return value && typeof value.candidate === "string";
  }

  function rememberIceCandidate(id, candidate) {
    if (earlyIceCandidates.size >= 8 && !earlyIceCandidates.has(id)) {
      const oldestId = earlyIceCandidates.keys().next().value;
      earlyIceCandidates.delete(oldestId);
    }
    const list = earlyIceCandidates.get(id) || [];
    if (list.length < 64) list.push(candidate);
    earlyIceCandidates.set(id, list);
  }

  async function addIncomingCandidate(id, candidate) {
    if (id === callId && peer?.remoteDescription) {
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.warn("Звонки ВОРТЕКС: кандидат ICE не принят.", error);
      }
      return;
    }
    rememberIceCandidate(id, candidate);
  }

  async function handleSignal(payload) {
    if (!thread || !payload) return;
    if (payload.conversationId !== thread.conversationId ||
        payload.from !== thread.peerId ||
        payload.to !== thread.currentUserId ||
        !isUuid(payload.callId)) return;

    if (payload.type === "ice-candidate") {
      if (isIceCandidate(payload.candidate)) {
        await addIncomingCandidate(payload.callId, payload.candidate);
      }
      return;
    }

    if (payload.type === "offer") {
      if (!isDescription(payload.description, "offer")) return;
      if (callId === payload.callId) return;

      if (callState !== "idle") {
        await sendSignal("busy", {}, payload.callId);
        return;
      }

      const incomingId = payload.callId;
      callId = incomingId;
      pendingOffer = {
        type: "offer",
        sdp: payload.description.sdp
      };
      callState = "incoming";
      clearRingTimer();
      ringTimer = setTimeout(() => {
        if (callId === incomingId && callState === "incoming") {
          void finishCall("Пропущенный звонок.");
        }
      }, 45000);
      setStatus("Входящий голосовой звонок.");
      updateControls();
      return;
    }
    if (payload.type === "answer") {
      if (payload.callId !== callId ||
          !isDescription(payload.description, "answer") ||
          !peer ||
          !["outgoing", "connecting"].includes(callState)) return;

      try {
        await peer.setRemoteDescription(payload.description);
        queuedCandidates.push(...takeEarlyIceCandidates(callId));
        await flushQueuedCandidates();
        callState = "connecting";
        setStatus("Соединяем звонок…");
        updateControls();
      } catch (error) {
        console.error("Звонки ВОРТЕКС: не удалось принять ответ.", error);
        await finishCall("Не удалось соединить звонок.", "hangup");
      }
      return;
    }
    if (["busy", "reject", "hangup"].includes(payload.type) &&
        payload.callId === callId) {
      const messages = {
        busy: "Собеседник уже разговаривает.",
        reject: "Звонок отклонён.",
        hangup: "Собеседник завершил звонок."
      };
      await finishCall(messages[payload.type]);
    }
  }

  async function buildAnswerDescription(offer, expectedCallId) {
    const connection = createPeer();
    await connection.setRemoteDescription(offer);
    if (callId !== expectedCallId) throw new Error("Звонок уже завершён.");
    queuedCandidates.push(...takeEarlyIceCandidates(expectedCallId));
    await flushQueuedCandidates();
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    return connection.localDescription.toJSON();
  }

  async function acceptCall() {
    if (callState !== "incoming" || !callId || !pendingOffer) return;
    clearRingTimer();
    const acceptedCallId = callId;
    const offer = pendingOffer;
    callState = "connecting";
    setStatus("Запрашиваем доступ к микрофону…");
    updateControls();

    try {
      const localStream = await requestMicrophone();
      if (callId !== acceptedCallId || callState !== "connecting") {
        localStream.getTracks().forEach(track => track.stop());
        return;
      }
      stream = localStream;
      const description = await buildAnswerDescription(offer, acceptedCallId);
      if (callId !== acceptedCallId) return;

      const sent = await sendSignal("answer", { description }, acceptedCallId);
      if (!sent) throw new Error("Ответ не отправлен.");
      setStatus("Ответ отправлен. Соединяем…");
    } catch (error) {
      console.error("Звонки ВОРТЕКС: не удалось принять звонок.", error);
      if (callId === acceptedCallId) {
        const denied = ["NotAllowedError", "PermissionDeniedError"].includes(error?.name);
        await finishCall(denied ? "Нет доступа к микрофону." : "Не удалось принять звонок.", "reject");
      }
    }
  }

  async function startCall() {
    if (callState !== "idle" || !thread) return;
    if (!channelReady) {
      setStatus("Подключаем звонки… попробуйте через секунду.");
      return;
    }

    const outgoingId = createCallId();
    if (!outgoingId) {
      setStatus("Этот браузер не поддерживает безопасный звонок.");
      return;
    }

    callId = outgoingId;
    callState = "outgoing";
    setStatus("Запрашиваем доступ к микрофону…");
    updateControls();

    let offerSent = false;
    try {
      const localStream = await requestMicrophone();
      if (callId !== outgoingId || callState !== "outgoing") {
        localStream.getTracks().forEach(track => track.stop());
        return;
      }
      stream = localStream;
      const connection = createPeer();
      const offer = await connection.createOffer();
      if (callId !== outgoingId) return;
      await connection.setLocalDescription(offer);
      if (callId !== outgoingId) return;

      const localDescription = connection.localDescription;
      const description = {
        type: localDescription.type,
        sdp: localDescription.sdp
      };
      offerSent = await sendSignal("offer", { description }, outgoingId);
      if (!offerSent) throw new Error("Не удалось отправить вызов.");
      if (callState === "outgoing") setStatus("Вызываем собеседника…");
      if (callId === outgoingId &&
          ["outgoing", "connecting"].includes(callState)) {
        ringTimer = setTimeout(() => {
          if (callId !== outgoingId ||
              !["outgoing", "connecting"].includes(callState)) return;
          const reason = callState === "outgoing"
            ? "Собеседник не ответил."
            : "Не удалось соединить звонок.";
          void finishCall(reason, "hangup");
        }, 45000);
      }
    } catch (error) {
      console.error("Звонки ВОРТЕКС: не удалось начать звонок.", error);
      if (callId === outgoingId) {
        const denied = ["NotAllowedError", "PermissionDeniedError"].includes(error?.name);
        await finishCall(
          denied ? "Нет доступа к микрофону." : "Не удалось начать звонок.",
          offerSent ? "hangup" : null
        );
      }
    }
  }

  startButton.addEventListener("click", () => {
    void startCall();
  });
  acceptButton.addEventListener("click", () => {
    void acceptCall();
  });
  rejectButton.addEventListener("click", () => {
    void finishCall("Звонок отклонён.", "reject");
  });
  endButton.addEventListener("click", () => {
    void finishCall("Звонок завершён.", "hangup");
  });

  let threadRevision = 0;
  let threadClosing = false;

  async function openCallThread(detail) {
    if (!threadClosing &&
        thread &&
        detail?.conversationId === thread.conversationId &&
        channel) return;
    threadClosing = false;
    const revision = ++threadRevision;
    if (callId) await finishCall("Открыта другая переписка.", "hangup");
    if (revision !== threadRevision) return;

    await detachChannel();
    if (revision !== threadRevision) return;

    thread = null;
    earlyIceCandidates.clear();

    if (!detail ||
        !isUuid(detail.conversationId) ||
        !isUuid(detail.currentUserId) ||
        !isUuid(detail.peerId) ||
        detail.currentUserId === detail.peerId) {
      setStatus("Не удалось определить участников переписки.");
      return;
    }

    let authResult;
    try {
      authResult = await client.auth.getSession();
    } catch (error) {
      console.warn("Звонки ВОРТЕКС: не удалось проверить сессию.", error);
      setStatus("Не удалось проверить вход в ВОРТЕКС.");
      return;
    }

    if (revision !== threadRevision) return;
    if (authResult?.error ||
        authResult?.data?.session?.user?.id !== detail.currentUserId) {
      setStatus("Войдите в ВОРТЕКС, чтобы использовать звонки.");
      return;
    }

    thread = {
      conversationId: detail.conversationId,
      currentUserId: detail.currentUserId,
      peerId: detail.peerId
    };
    setStatus("Подключаем голосовые звонки…");

    const callChannel = client.channel(
      `vortex-call:${detail.conversationId}`,
      { config: { private: true } }
    );
    channel = callChannel;

    callChannel.on("broadcast", { event: "signal" }, message => {
      if (revision !== threadRevision || channel !== callChannel) return;
      const signal = message?.payload?.payload ?? message?.payload ?? message;
      void handleSignal(signal).catch(error => {
        console.warn("Звонки ВОРТЕКС: ошибка входящего сигнала.", error);
      });
    });

    callChannel.subscribe((state, error) => {
      if (revision !== threadRevision || channel !== callChannel) return;
      channelReady = state === "SUBSCRIBED";

      if (channelReady && callState === "idle") {
        setStatus("Голосовые звонки готовы.");
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(state)) {
        setStatus("Не удалось подключить голосовые звонки. Проверьте сеть.");
        if (error) console.warn("Звонки ВОРТЕКС: ошибка канала.", error);
      }
    });
  }

  window.addEventListener("vortex:chat-thread-open", event => {
    void openCallThread(event.detail).catch(error => {
      console.error("Звонки ВОРТЕКС: не удалось подключить переписку.", error);
      setStatus("Не удалось подключить голосовые звонки.");
    });
  });

  if (client.auth?.onAuthStateChange) {
    client.auth.onAuthStateChange(event => {
      if (event !== "SIGNED_OUT") return;

      const revision = ++threadRevision;
      threadClosing = true;

      window.setTimeout(() => {
        void (async () => {
          if (revision !== threadRevision) return;
          if (callId) await finishCall("Вы вышли из ВОРТЕКС.", "hangup");
          if (revision !== threadRevision) return;

          thread = null;
          earlyIceCandidates.clear();
          await detachChannel();

          if (revision === threadRevision) {
            setStatus("Войдите в ВОРТЕКС, чтобы звонить.");
          }
        })().catch(error => {
          console.warn("Звонки ВОРТЕКС: ошибка очистки после выхода.", error);
        });
      }, 0);
    });
  }

  const backButton = document.getElementById("vx-chat-back");
  if (backButton) {
    backButton.addEventListener("click", () => {
      threadClosing = true;
      const revision = ++threadRevision;
      void (async () => {
        if (callId) {
          await finishCall("Вернулись к списку переписок.", "hangup");
        }
        if (revision !== threadRevision) return;

        thread = null;
        earlyIceCandidates.clear();
        await detachChannel();

        if (revision === threadRevision) {
          setStatus("Откройте переписку, чтобы звонить.");
        }
      })().catch(error => {
        console.warn("Звонки ВОРТЕКС: ошибка при возврате к списку.", error);
      });
    });
  }

  dialog.addEventListener("close", () => {
    threadClosing = true;
    const closingRevision = ++threadRevision;

    void (async () => {
      if (callId) {
        await finishCall("Переписка закрыта.", "hangup");
      }
      if (closingRevision !== threadRevision) return;

      thread = null;
      earlyIceCandidates.clear();
      await detachChannel();

      if (closingRevision === threadRevision) {
        setStatus("Откройте переписку, чтобы звонить.");
      }
    })().catch(error => {
      console.warn("Звонки ВОРТЕКС: ошибка при закрытии переписки.", error);
    });
  });

})();
