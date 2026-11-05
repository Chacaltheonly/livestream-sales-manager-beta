(function () {
  const STORAGE_KEY = "livesell_report_customer_status";
  const FILTER_STORAGE_KEY = "livesell_report_customer_filter";
  let isEnhancing = false;
  let animationFrameId = 0;

  function readFilter() {
    return localStorage.getItem(FILTER_STORAGE_KEY) || "all";
  }

  function writeFilter(nextFilter) {
    localStorage.setItem(FILTER_STORAGE_KEY, nextFilter);
  }

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
    const activeFilter = readFilter();

    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "report-status-toolbar";
      headerCard.appendChild(toolbar);
    }

    toolbar.innerHTML = "";

    const filterGroup = document.createElement("div");
    filterGroup.className = "report-filter-group";

    [
      { id: "all", label: "Todos" },
      { id: "pending", label: "Pendentes" },
      { id: "warned", label: "Avisados" },
      { id: "picked", label: "Retirados" },
      { id: "hidden", label: "Ocultos" },
    ].forEach((filterItem) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `report-filter-button ${
        activeFilter === filterItem.id ? "active" : ""
      }`.trim();
      button.textContent = filterItem.label;
      button.addEventListener("click", () => {
        writeFilter(filterItem.id);
        enhanceReport();
      });
      filterGroup.appendChild(button);
    });

    toolbar.appendChild(filterGroup);

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


  function buildInstagramMessage(customerName, sales) {
    const username = String(customerName || "").trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9._]{1,30}$/.test(username)) throw new Error("O Instagram salvo não é um nome de usuário válido.");
    const items = sales.filter(sale => String(sale.instagramHandle || "").trim().replace(/^@/, "").toLowerCase() === username);
    if (!items.length) throw new Error("Nenhuma compra encontrada para este cliente.");
    const money = cents => (cents / 100).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
    let total = 0;
    const lines = items.map(item => {
      const quantity = Number(item.quantity), price = Number(item.salePrice);
      if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) throw new Error("Há uma venda com quantidade ou preço inválido. Confira o relatório.");
      const unit = Math.round(price * 100), subtotal = unit * quantity;
      if (!Number.isSafeInteger(subtotal)) throw new Error("Valor da compra inválido.");
      total += subtotal;
      return "• " + quantity + " × " + String(item.productName || "Produto").replace(/[\r\n]+/g, " ") + " — " + money(unit) + " cada | " + money(subtotal);
    });
    return {url:"https://www.instagram.com/" + encodeURIComponent(username) + "/", text:
      "Olá, @" + username + "! 🛍️\nSegue o resumo da sua compra na nossa live:\n\n" +
      lines.join("\n") + "\n\nTotal: " + money(total) + "\n\nObrigado pela compra! 💚\nSagrada Família"};
  }

  function showInstagramPurchase(customerName) {
    let purchase;
    try {
      const sales = JSON.parse(localStorage.getItem("live_sales_history") || "[]");
      if (!Array.isArray(sales)) throw new Error("Não foi possível ler o histórico de vendas.");
      purchase = buildInstagramMessage(customerName, sales);
    } catch (error) { window.alert(error.message); return; }
    document.getElementById("instagram-purchase-dialog")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "instagram-purchase-dialog";
    dialog.setAttribute("aria-labelledby", "instagram-purchase-title");
    dialog.style.cssText = "width:min(560px,94vw);max-height:90vh;overflow:auto;border:1px solid #cbeed9;border-radius:16px;padding:24px;";
    const title = document.createElement("h3");
    title.id = "instagram-purchase-title";
    title.textContent = "Enviar compra pelo Instagram";
    title.style.cssText = "font-size:20px;font-weight:700;margin-bottom:12px";
    const info = document.createElement("p");
    info.textContent = "Confira o resumo. Depois, copie e abra o perfil para colar e enviar no Direct.";
    const area = document.createElement("textarea");
    area.value = purchase.text;
    area.readOnly = true;
    area.setAttribute("aria-label", "Resumo da compra");
    area.style.cssText = "width:100%;height:260px;border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:16px 0;white-space:pre-wrap;";
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin:12px 0";
    const copy = createButton("Copiar resumo e abrir Instagram", "", async () => {
      // Open synchronously during the gesture to avoid popup blockers.
      window.open(purchase.url, "_blank", "noopener,noreferrer");
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(purchase.text);
        status.textContent = "Resumo copiado! No Instagram, abra Mensagem, cole e envie. Nenhuma mensagem foi enviada automaticamente.";
      } catch {
        area.focus(); area.select();
        status.textContent = "Não foi possível copiar automaticamente. Copie o texto selecionado e cole no Direct.";
      }
    });
    const profile = document.createElement("a");
    profile.href = purchase.url; profile.target = "_blank"; profile.rel = "noopener noreferrer";
    profile.className = "report-customer-button";
    profile.textContent = "Abrir perfil novamente";
    actions.append(copy, profile, createButton("Fechar", "", () => dialog.close()));
    dialog.append(title, info, area, actions, status);
    dialog.addEventListener("close", () => dialog.remove());
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  function shouldShowCard(customerState, activeFilter) {
    switch (activeFilter) {
      case "pending":
        return !customerState.hidden && !customerState.warned && !customerState.pickedUp;
      case "warned":
        return !customerState.hidden && !!customerState.warned;
      case "picked":
        return !customerState.hidden && !!customerState.pickedUp;
      case "hidden":
        return !!customerState.hidden;
      case "all":
      default:
        return !customerState.hidden;
    }
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
    tools.appendChild(createButton("📩 Enviar compra pelo Instagram", "", () => showInstagramPurchase(customerName)));

    if (customerState.pickedUp) {
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
    const activeFilter = readFilter();
    renderToolbar(reportRoot, state);

    getCustomerCards(reportRoot).forEach((card) => {
      const customerName = card.querySelector("h4")?.textContent || "";
      const customerKey = normalizeCustomerKey(customerName);
      if (!customerKey) {
        return;
      }

      renderCardControls(card, state, customerKey, customerName);

      const customerState = state[customerKey] || {};
      card.style.display = shouldShowCard(customerState, activeFilter) ? "" : "none";
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

