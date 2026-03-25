(function () {
  const PRODUCTS_KEY = "live_sales_products";
  const SALES_KEY = "live_sales_history";
  const LEGACY_SALES_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbxBRwb6PlgwWH8IZztF3nO9dCWQwmewSGCOkPE4zAGP_rOGEVwioW6kzMXOR3DVlgGt/exec";
  const config = window.LIVESELL_CONFIG || {};
  const endpoint = (config.sheetsEndpoint || "").trim();
  const debounceMs = Number(config.syncDebounceMs || 700);

  let applyingRemoteState = false;
  let productsTimer = null;
  let salesTimer = null;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseJsonSafely(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Nao foi possivel ler JSON salvo localmente.", error);
      return [];
    }
  }

  function readProducts() {
    return parseJsonSafely(localStorage.getItem(PRODUCTS_KEY));
  }

  function readSales() {
    return parseJsonSafely(localStorage.getItem(SALES_KEY));
  }

  function normalizeProductRow(row) {
    const name = normalizeText(row.name || row.Nome || row.nome);
    const barcode = normalizeText(
      row.barcode || row.Codigo || row["Código"] || row.codigo
    );

    if (!name || !barcode) {
      return null;
    }

    return {
      id: normalizeText(row.id) || Math.random().toString(36).slice(2, 11),
      name,
      barcode,
      stock: normalizeNumber(row.stock || row.Estoque || row.estoque),
      fullPrice: normalizeNumber(
        row.fullPrice || row["Preco Cheio"] || row["Preço Cheio"] || row.precoCheio
      ),
      offerPrice: normalizeNumber(
        row.offerPrice || row["Preco Live"] || row["Preço Live"] || row.precoLive
      ),
    };
  }

  function normalizeSaleRow(row) {
    const productName = normalizeText(
      row.productName || row.Produto || row.produto
    );
    const instagramHandle = normalizeText(
      row.instagramHandle || row.Instagram || row.instagram || row.Cliente || row.cliente
    );

    if (!productName || !instagramHandle) {
      return null;
    }

    return {
      id: normalizeText(row.id) || Math.random().toString(36).slice(2, 11),
      productId: normalizeText(row.productId || row.Codigo || row.codigo),
      productName,
      instagramHandle: instagramHandle.startsWith("@")
        ? instagramHandle
        : `@${instagramHandle}`,
      quantity: normalizeNumber(row.quantity || row.Quantidade || row.quantidade || 1),
      salePrice: normalizeNumber(
        row.salePrice || row["Preco Unitario"] || row["Preço Unitário"] || row.precoUnitario
      ),
      timestamp: normalizeNumber(row.timestamp || row.DataHora || row.dataHora || Date.now()),
    };
  }

  async function requestJson(action, payload) {
    if (!endpoint) {
      return null;
    }

    const iframeName = `livesell_sync_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.style.display = "none";

    const form = document.createElement("form");
    form.method = "POST";
    form.action = endpoint;
    form.target = iframeName;
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify({
      action,
      stockSheetName: config.stockSheetName || "Estoque",
      salesSheetName: config.salesSheetName || "Vendas",
      ...payload,
    });

    form.appendChild(input);
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      form.remove();
      iframe.remove();
    }, 2000);

    return { ok: true };
  }

  async function requestBootstrapViaJsonp() {
    return new Promise((resolve, reject) => {
      const callbackName = `__livesellBootstrap_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      const script = document.createElement("script");
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = (payload) => {
        cleanup();
        resolve(payload);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Falha ao carregar bootstrap da planilha."));
      };

      script.src =
        `${endpoint}?action=bootstrap&callback=${callbackName}`;
      document.head.appendChild(script);
    });
  }

  async function bootstrapFromSheets() {
    if (!endpoint) {
      console.info("Sheets endpoint nao configurado. Mantendo armazenamento local.");
      return;
    }

    try {
      const payload = await requestBootstrapViaJsonp();
      const products = Array.isArray(payload.products)
        ? payload.products.map(normalizeProductRow).filter(Boolean)
        : [];
      const sales = Array.isArray(payload.sales)
        ? payload.sales.map(normalizeSaleRow).filter(Boolean)
        : [];

      applyingRemoteState = true;
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      localStorage.setItem(SALES_KEY, JSON.stringify(sales));
      applyingRemoteState = false;
    } catch (error) {
      applyingRemoteState = false;
      console.error("Nao foi possivel carregar dados da planilha.", error);
    }
  }

  function scheduleProductsSync() {
    if (!endpoint || applyingRemoteState) {
      return;
    }

    clearTimeout(productsTimer);
    productsTimer = setTimeout(async () => {
      try {
        await requestJson("syncProducts", { products: readProducts() });
      } catch (error) {
        console.error("Falha ao sincronizar estoque.", error);
      }
    }, debounceMs);
  }

  function scheduleSalesSync() {
    if (!endpoint || applyingRemoteState) {
      return;
    }

    clearTimeout(salesTimer);
    salesTimer = setTimeout(async () => {
      try {
        await requestJson("syncSales", { sales: readSales() });
      } catch (error) {
        console.error("Falha ao sincronizar vendas.", error);
      }
    }, debounceMs);
  }

  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    originalSetItem.call(this, key, value);

    if (this !== window.localStorage) {
      return;
    }

    if (key === PRODUCTS_KEY) {
      scheduleProductsSync();
    }

    if (key === SALES_KEY) {
      scheduleSalesSync();
    }
  };

  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (key) {
    originalRemoveItem.call(this, key);

    if (this !== window.localStorage || applyingRemoteState) {
      return;
    }

    if (key === PRODUCTS_KEY) {
      scheduleProductsSync();
    }

    if (key === SALES_KEY) {
      scheduleSalesSync();
    }
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input && typeof input.url === "string"
          ? input.url
          : "";

    if (endpoint && url === LEGACY_SALES_ENDPOINT) {
      return new Response("OK", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return originalFetch(input, init);
  };

  window.__LIVESELL_BOOTSTRAP__ = bootstrapFromSheets();
})();
