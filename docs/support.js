(() => {
  const supportUrl = "https://t.me/v0rtex_help";

  const style = document.createElement("style");
  style.textContent = `
    .vx-support-top,
    .vx-support-mobile {
      color: inherit;
      text-decoration: none;
    }

    .vx-support-top {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 12px;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 13px;
      color: #f0e3c9;
      background: rgba(255,255,255,.08);
      font: inherit;
      font-weight: 700;
    }

    .vx-support-mobile {
      display: flex;
      flex: 0 0 57px;
      min-width: 57px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 5px 2px;
      color: #a3a8ad;
      text-align: center;
    }

    .vx-support-mobile span { font-size: 21px; line-height: 1.1; }
    .vx-support-mobile small { font-size: 9px; }

    body.light-theme .vx-support-top { color: #155e4b; }
    body.light-theme .vx-support-mobile { color: #68756e; }

    @media (max-width: 760px) {
      .vx-support-top {
        width: 38px;
        height: 38px;
        justify-content: center;
        padding: 0;
      }
      .vx-support-top span:last-child { display: none; }
    }
  `;
  document.head.appendChild(style);

  function makeLink(className, mobile = false) {
    const link = document.createElement("a");
    link.className = className;
    link.href = supportUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Связаться с поддержкой в Telegram");

    link.innerHTML = mobile
      ? "<span aria-hidden='true'>✉</span><small>Поддержка</small>"
      : "<span aria-hidden='true'>✉</span><span>Поддержка</span>";

    return link;
  }

  const topNav = document.querySelector(".nav");
  if (topNav && !document.getElementById("vx-support-top")) {
    const topLink = makeLink("vx-support-top");
    topLink.id = "vx-support-top";

    const profileLink = document.getElementById("vx-profile-top");
    if (profileLink) profileLink.after(topLink);
    else topNav.appendChild(topLink);
  }

  const mobileNav = document.getElementById("vortex-mobile-nav");
  if (mobileNav && !mobileNav.querySelector(".vx-support-mobile")) {
    const mobileLink = makeLink("vx-support-mobile", true);
    const profileTab = mobileNav.querySelector('[data-vortex-action="profile"]');

    if (profileTab) profileTab.after(mobileLink);
    else mobileNav.appendChild(mobileLink);
  }
})();
