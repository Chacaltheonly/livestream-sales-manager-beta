(function () {
  const BRAND_TITLE = "Sagrada Familia Live";
  const BRAND_NAME = "Sagrada Familia";
  const MARK_SRC = "./brand-mark.svg";

  function applyBranding() {
    if (document.title !== BRAND_TITLE) {
      document.title = BRAND_TITLE;
    }

    document.querySelectorAll("aside h1").forEach((title) => {
      if (title.textContent && title.textContent.trim() === "LiveSell Pro") {
        title.textContent = BRAND_NAME;
      }
    });

    document
      .querySelectorAll("aside .bg-white.p-2.rounded-lg.text-xl.flex-shrink-0")
      .forEach((container) => {
        if (container.dataset.brandApplied === "true") {
          return;
        }

        container.dataset.brandApplied = "true";
        container.classList.add("brand-mark-box");
        container.textContent = "";

        const image = document.createElement("img");
        image.src = MARK_SRC;
        image.alt = BRAND_NAME;
        image.decoding = "async";
        container.appendChild(image);
      });
  }

  window.addEventListener("load", applyBranding);
  window.setTimeout(applyBranding, 0);
  window.setTimeout(applyBranding, 400);

  const observer = new MutationObserver(() => {
    applyBranding();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
