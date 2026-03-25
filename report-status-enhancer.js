(function () {
  const STORAGE_KEY = "livesell_report_customer_status";
  let isEnhancing = false;
  let animationFrameId = 0;

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  function normalizeCustomerKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getReportRoot() {
    const title = Array.from(document.querySelectorAll("h3")).find(
      (element) => element.textContent && element.textContent.trim() === "Vendas por Comprador"
    );

    return title ? title.closest(".space-y-8") : null;
  }

  function getCustomerCards(reportRoot) {
    return Array.from(reportRoot.querySelectorAll("div.bg-white.rounded-2xl.shadow-sm.border"))
      .filter((card) => card.querySelector("h4"));
  }

  function createChip(text, type) {
    const chip = document.createElement("span");
    chip.className = `report-status-chip ${type}`;
    chip.textContent = text;
    return chip;
  }

  function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `report-customer-button ${className || ""}`.trim();
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function createSwitch(label, activeClassName, isActive, onClick) {
    const wrapper = document.createElement("div");
    wrapper.className = "report-switch-group";

    const text = document.createElement("span");
    text.className = "report-switch-label";
    text.textContent = label;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `report-switch ${isActive ? activeClassName : ""}`.trim();
    button.setAttribute("role", "switch");
    button.setAttribute("aria-checked", isActive ? "true" : "false");
    button.setAttribute("aria-label", label);
    button.addEventListener("click", onClick);

    wrapper.appendChild(text);
    wrapper.appendChild(button);
    return wrapper;
  }

  function renderToolbar(reportRoot, state) {
    const headerCard = reportRoot.firstElementChild;
    if (!headerCard) {
      return;
    }

    let toolbar = headerCard.querySelector(".report-status-toolbar");
    const hiddenKeys = Object.keys(state).filter((key) => state[key] && state[key].hidden);

    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "report-status-toolbar";
      headerCard.appendChild(toolbar);
    }

    toolbar.innerHTML = "";

    if (hiddenKeys.length === 0) {
      return;
    }

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "report-status-reset";
    resetButton.textContent = `Mostrar ocultados (${hiddenKeys.length})`;
    resetButton.addEventListener("click", () => {
      const nextState = readState();
      hiddenKeys.forEach((key) => {
        if (nextState[key]) {
          nextState[key].hidden = false;
        }
      });
      writeState(nextState);
      enhanceReport();
    });
    toolbar.appendChild(resetButton);
  }

  function renderCardControls(card, state, customerKey, customerName) {
    const headerRow = card.querySelector(".p-6.bg-slate-50");
    const titleWrap = headerRow ? headerRow.querySelector("h4")?.parentElement : null;
    if (!headerRow || !titleWrap) {
      return;
    }

    const customerState = state[customerKey] || {};
    let tools = titleWrap.querySelector(".report-customer-tools");

    if (!tools) {
      tools = document.createElement("div");
      tools.className = "report-customer-tools";
      titleWrap.appendChild(tools);
    }

    tools.innerHTML = "";

    if (customerState.warned) {
      tools.appendChild(createChip("Avisado", "warned"));
    }

    if (customerState.pickedUp) {
      tools.appendChild(createChip("Retirou", "picked"));
      card.classList.add("report-card-muted");
    } else {
      card.classList.remove("report-card-muted");
    }

    tools.appendChild(
      createSwitch("Avisado", "active-warned", !!customerState.warned, () => {
        const nextState = readState();
        const current = nextState[customerKey] || {};
        nextState[customerKey] = {
          ...current,
          customerName,
          warned: !current.warned,
          updatedAt: Date.now(),
        };
        writeState(nextState);
        enhanceReport();
      })
    );

    tools.appendChild(
      createSwitch("Retirou", "active-picked", !!customerState.pickedUp, () => {
        const nextState = readState();
        const current = nextState[customerKey] || {};
        nextState[customerKey] = {
          ...current,
          customerName,
          pickedUp: !current.pickedUp,
          updatedAt: Date.now(),
        };
        writeState(nextState);
        enhanceReport();
      })
    );

    tools.appendChild(
      createButton(
        customerState.hidden ? "Mostrar no relatório" : "Ocultar cliente",
        "danger",
        () => {
          const nextState = readState();
          const current = nextState[customerKey] || {};
          nextState[customerKey] = {
            ...current,
            customerName,
            hidden: !current.hidden,
            updatedAt: Date.now(),
          };
          writeState(nextState);
          enhanceReport();
        }
      )
    );
  }

  function enhanceReport() {
    const reportRoot = getReportRoot();
    if (!reportRoot) {
      return;
    }

    const state = readState();
    renderToolbar(reportRoot, state);

    getCustomerCards(reportRoot).forEach((card) => {
      const customerName = card.querySelector("h4")?.textContent || "";
      const customerKey = normalizeCustomerKey(customerName);
      if (!customerKey) {
        return;
      }

      renderCardControls(card, state, customerKey, customerName);

      const customerState = state[customerKey] || {};
      card.style.display = customerState.hidden ? "none" : "";
    });
  }

  const observer = new MutationObserver(() => {
    scheduleEnhance();
  });

  function runEnhanceSafely() {
    if (isEnhancing) {
      return;
    }

    isEnhancing = true;
    observer.disconnect();

    try {
      enhanceReport();
    } finally {
      isEnhancing = false;
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  }

  function scheduleEnhance() {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = window.requestAnimationFrame(() => {
      animationFrameId = 0;
      runEnhanceSafely();
    });
  }

  window.addEventListener("load", scheduleEnhance);
  window.setTimeout(scheduleEnhance, 0);
  window.setTimeout(scheduleEnhance, 600);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
