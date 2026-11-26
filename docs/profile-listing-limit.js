(() => {
  "use strict";

  const page = document.getElementById("vx-profile-page");
  const actions = page?.querySelector(".vx-profile-actions");
  const db = window.VORTEX_SUPABASE;
  if (!page || !actions) return;

  const panel = document.createElement("p");
  panel.className = "vx-profile-note";
  panel.id = "vx-profile-listing-limit";
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "polite");
  panel.textContent = "Войдите в аккаунт, чтобы увидеть свои объявления.";
  actions.insertAdjacentElement("afterend", panel);

  if (!db?.auth) {
    panel.textContent = "Счётчик временно недоступен.";
    return;
  }

  const plans = {
    usual: ["Обычный", 3],
    econom: ["Эконом", 5],
    deluxe: ["Делюкс", 7],
    premium: ["Премиум", 15]
  };
  let requestId = 0;

  async function refresh() {
    const currentRequest = ++requestId;
    panel.textContent = "Загружаем счётчик объявлений…";

    try {
      const { data, error } = await db.auth.getSession();
      if (error) throw error;

      const userId = data?.session?.user?.id;
      if (!userId) {
        panel.textContent = "Войдите в аккаунт, чтобы увидеть свои объявления.";
        return;
      }

      let planId = "usual";
      try {
        planId = localStorage.getItem("vortex-subscription-demo-v1") || "usual";
      } catch {}

      const [planName, limit] = plans[planId] || plans.usual;
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error: queryError } = await db
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .gte("created_at", since);

      if (queryError) throw queryError;
      if (currentRequest !== requestId) return;

      const used = Number(count) || 0;
      panel.textContent =
        `Тариф «${planName}» (демо): за последние 7 дней — ${used} из ${limit}. ` +
        `Осталось: ${Math.max(0, limit - used)}.`;
    } catch (error) {
      console.warn("ВОРТЕКС: не удалось загрузить счётчик объявлений.", error);
      if (currentRequest === requestId) {
        panel.textContent = "Не удалось загрузить счётчик объявлений.";
      }
    }
  }

  new MutationObserver(() => {
    if (!page.hidden) refresh();
  }).observe(page, { attributes: true, attributeFilter: ["hidden"] });

  db.auth.onAuthStateChange(() => {
    if (!page.hidden) setTimeout(refresh, 0);
  });

  if (!page.hidden) refresh();
})();
