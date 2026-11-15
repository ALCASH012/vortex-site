(() => {
  const page = document.getElementById("vx-subscriptions-page");
  if (!page) {
    console.error("Страница подписок не найдена.");
    return;
  }

  const plans = {
    usual: {
      price: "Бесплатно",
      button: "Выбрать бесплатно",
      paid: false
    },
    econom: {
      price: "299 ₽ / месяц",
      button: "Оплата скоро",
      paid: true
    },
    deluxe: {
      price: "699 ₽ / месяц",
      button: "Оплата скоро",
      paid: true
    },
    premium: {
      price: "1 000 ₽ / месяц",
      button: "Оплата скоро",
      paid: true
    }
  };

  const style = document.createElement("style");
  style.textContent = `
    .vx-plan-price {
      margin: -5px 0 12px;
      color: #f0e3c9;
      font-size: 19px;
      font-weight: 800;
    }
    .vx-plan-card button:disabled {
      opacity: .62;
      cursor: not-allowed;
      transform: none !important;
      filter: none !important;
    }
    body.light-theme .vx-plan-price { color: #155e4b; }
  `;
  document.head.appendChild(style);

  let selected = "";
  try {
    selected = localStorage.getItem("vortex-subscription-demo-v1") || "";
    if (selected && !["usual", "econom", "deluxe", "premium"].includes(selected)) {
      localStorage.removeItem("vortex-subscription-demo-v1");
      selected = "";
    }
  } catch {}

  page.querySelectorAll(".vx-plan-card").forEach(card => {
    const id = card.dataset.plan;
    const plan = plans[id];
    if (!plan) return;

    const heading = card.querySelector("h3");
    const button = card.querySelector("button");

    const price = document.createElement("p");
    price.className = "vx-plan-price";
    price.textContent = plan.price;
    heading?.after(price);

    if (button) {
      button.textContent = plan.button;
      button.disabled = plan.paid;
      if (plan.paid) {
        button.title = "Приём оплаты ещё не подключён";
      }
    }

    card.classList.toggle("vx-plan-selected", id === selected);
  });

  const note = page.querySelector(".vx-plans-note");
  if (note) {
    note.textContent =
      "Обычная версия бесплатная. Цены остальных тарифов пока примерные. " +
      "Демо-версия не принимает платежи и не списывает деньги.";
  }
})();
