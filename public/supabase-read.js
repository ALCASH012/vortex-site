(() => {
  "use strict";

  const cardsRoot = document.getElementById("cards");
  const status = document.createElement("p");
  status.className = "vx-supabase-status";
  status.style.cssText =
    "margin:10px 0;padding:9px 12px;border-radius:11px;font-size:12px;";
  status.setAttribute("role", "status");
  status.textContent = "Подключаемся к серверу ВОРТЕКС…";

  if (cardsRoot?.parentNode) {
    cardsRoot.parentNode.insertBefore(status, cardsRoot);
  }

  const config = window.VORTEX_SUPABASE_CONFIG;
  const sdk = window.supabase;

  if (!config?.url || !config?.anonKey || typeof sdk?.createClient !== "function") {
    status.textContent =
      "Не удалось загрузить настройки Supabase. Локальные объявления доступны.";
    console.error("Supabase: не загружены конфигурация или библиотека.");
    return;
  }

  const client = sdk.createClient(config.url, config.anonKey);
  window.VORTEX_SUPABASE = client;

  async function loadListings() {
    const { data, error } = await client
      .from("listings")
      .select("id,owner_id,category,location,title,description,price,created_at,expires_at")
      .eq("status", "published")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const listings = (Array.isArray(data) ? data : []).map(item => ({
      id: item.id,
      ownerId: item.owner_id,
      category: item.category,
      location: item.location,
      title: item.title,
      description: item.description,
      price: item.price || "",
      contact: "",
      image: "",
      createdAt: item.created_at,
      expiresAt: item.expires_at
    }));

    window.dispatchEvent(new CustomEvent("vortex:supabase-listings", {
      detail: { listings }
    }));

    status.textContent = listings.length
      ? `С сервера загружено общих объявлений: ${listings.length}.`
      : "Соединение с Supabase работает. Общих объявлений пока нет.";
  }

  window.VORTEX_RELOAD_LISTINGS = loadListings;

  loadListings().catch(error => {
    console.error("Ошибка загрузки объявлений из Supabase:", error);
    status.textContent =
      "Не удалось загрузить объявления с сервера. Локальные объявления доступны.";
  });
})();
