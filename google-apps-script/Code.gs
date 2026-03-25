const DEFAULT_STOCK_SHEET = "Estoque";
const DEFAULT_SALES_SHEET = "Vendas";

function doGet(e) {
  const action = getParam_(e, "action");

  if (action === "bootstrap") {
    return jsonResponse_(buildBootstrapPayload_());
  }

  return jsonResponse_({
    ok: false,
    error: "Acao GET nao suportada.",
  });
}

function doPost(e) {
  const payload = parseBody_(e);
  const action = payload.action;

  if (action === "syncProducts") {
    syncProducts_(payload.products || [], payload.stockSheetName || DEFAULT_STOCK_SHEET);
    return jsonResponse_({ ok: true });
  }

  if (action === "syncSales") {
    syncSales_(payload.sales || [], payload.salesSheetName || DEFAULT_SALES_SHEET);
    return jsonResponse_({ ok: true });
  }

  return jsonResponse_({
    ok: false,
    error: "Acao POST nao suportada.",
  });
}

function buildBootstrapPayload_() {
  return {
    ok: true,
    products: readProducts_(DEFAULT_STOCK_SHEET),
    sales: readSales_(DEFAULT_SALES_SHEET),
  };
}

function readProducts_(sheetName) {
  const sheet = getOrCreateSheet_(sheetName, [
    "id",
    "Nome",
    "Codigo",
    "Estoque",
    "Preco Cheio",
    "Preco Live",
  ]);
  const values = getDataRows_(sheet);

  return values
    .filter((row) => row[1] || row[2])
    .map((row) => ({
      id: row[0] || createId_(),
      name: row[1] || "",
      barcode: row[2] || "",
      stock: Number(row[3] || 0),
      fullPrice: Number(row[4] || 0),
      offerPrice: Number(row[5] || 0),
    }));
}

function readSales_(sheetName) {
  const sheet = getOrCreateSheet_(sheetName, [
    "id",
    "timestamp",
    "Instagram",
    "productId",
    "Produto",
    "Quantidade",
    "Preco Unitario",
    "Total",
  ]);
  const values = getDataRows_(sheet);

  return values
    .filter((row) => row[2] || row[4])
    .map((row) => ({
      id: row[0] || createId_(),
      timestamp: Number(row[1] || Date.now()),
      instagramHandle: row[2] || "",
      productId: row[3] || "",
      productName: row[4] || "",
      quantity: Number(row[5] || 0),
      salePrice: Number(row[6] || 0),
    }));
}

function syncProducts_(products, sheetName) {
  const sheet = getOrCreateSheet_(sheetName, [
    "id",
    "Nome",
    "Codigo",
    "Estoque",
    "Preco Cheio",
    "Preco Live",
  ]);

  clearDataKeepHeader_(sheet);

  if (!products.length) {
    return;
  }

  const rows = products.map((product) => [
    product.id || createId_(),
    product.name || "",
    product.barcode || "",
    Number(product.stock || 0),
    Number(product.fullPrice || 0),
    Number(product.offerPrice || 0),
  ]);

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function syncSales_(sales, sheetName) {
  const sheet = getOrCreateSheet_(sheetName, [
    "id",
    "timestamp",
    "Instagram",
    "productId",
    "Produto",
    "Quantidade",
    "Preco Unitario",
    "Total",
  ]);

  clearDataKeepHeader_(sheet);

  if (!sales.length) {
    return;
  }

  const rows = sales.map((sale) => [
    sale.id || createId_(),
    Number(sale.timestamp || Date.now()),
    sale.instagramHandle || "",
    sale.productId || "",
    sale.productName || "",
    Number(sale.quantity || 0),
    Number(sale.salePrice || 0),
    Number((sale.quantity || 0) * (sale.salePrice || 0)),
  ]);

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function getOrCreateSheet_(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  return sheet;
}

function getDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

function clearDataKeepHeader_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow > 1 && lastColumn > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function getParam_(e, key) {
  return e && e.parameter ? e.parameter[key] : "";
}

function createId_() {
  return Utilities.getUuid().slice(0, 8);
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
