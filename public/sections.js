(() => {
  const hero = document.querySelector(".hero");
  const filters = hero?.querySelector(".filters");
  const categoryFilter = document.getElementById("categoryFilter");

  if (!hero || !filters || !categoryFilter || document.getElementById("vx-section-picker")) {
    return;
  }

  const options = [
    { id: "jobs", icon: "💼", title: "Работа", note: "Объявления и подработка" },
    { id: "housing", icon: "⌂", title: "Жильё", note: "Квартиры и комнаты" },
    { id: "pets", icon: "🐾", title: "Питомцы", note: "Найти или пристроить" },
    { id: "sales", icon: "🛍️", title: "Продажи", note: "Товары и вещи" }
  ];

  const picker = document.createElement("section");
  picker.id = "vx-section-picker";
  picker.className = "vx-section-picker";
  picker.setAttribute("aria-label", "Выбор раздела");

  picker.innerHTML = `
    <div class="vx-picker-heading">
      <div>
        <div class="vx-picker-eyebrow">БЫСТРЫЙ ВЫБОР</div>
        <h2>Выберите раздел</h2>
      </div>
      <span>Покажем подходящие объявления</span>
    </div>
    <div class="vx-picker-grid" role="group" aria-label="Разделы объявлений">
      ${options.map(option => `
        <button class="vx-category-choice" type="button"
          data-category="${option.id}" aria-pressed="false">
          <span class="vx-choice-icon" aria-hidden="true">${option.icon}</span>
          <span class="vx-choice-copy">
            <strong>${option.title}</strong>
            <small>${option.note}</small>
          </span>
          <span class="vx-choice-check" aria-hidden="true">✓</span>
        </button>
      `).join("")}
    </div>
  `;

  filters.insertAdjacentElement("afterend", picker);

  function syncSelection() {
    picker.querySelectorAll("[data-category]").forEach(button => {
      const selected = button.dataset.category === categoryFilter.value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  picker.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    categoryFilter.value = button.dataset.category;
    categoryFilter.dispatchEvent(new Event("change", { bubbles: true }));
    syncSelection();
  });

  categoryFilter.addEventListener("change", syncSelection);
  syncSelection();
})();
