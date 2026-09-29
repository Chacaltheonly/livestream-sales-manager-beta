// Kept separate because the repository contains the compiled application only.
export function parseStock(rows) {
  if (rows.length < 2) throw new Error('A planilha está vazia.');
  const normalize = value => String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const headers = rows[0].map(normalize);
  const names = ['nome', 'codigo', 'estoque', 'preco cheio', 'preco live'];
  const columns = names.map(name => {
    if (headers.filter(header => header === name).length !== 1) throw new Error(`A coluna ${name} deve aparecer exatamente uma vez.`);
    return headers.indexOf(name);
  });
  const seen = new Set();
  const products = [];
  rows.slice(1).forEach((row, index) => {
    if (row.every(value => value == null || String(value).trim() === '')) return;
    const line = index + 2;
    const values = columns.map(column => row[column]);
    const name = String(values[0] ?? '').trim();
    const barcode = String(values[1] ?? '').trim();
    if (!name || !barcode) throw new Error(`Linha ${line}: preencha Nome e Codigo.`);
    if (seen.has(barcode)) throw new Error(`Linha ${line}: código duplicado (${barcode}).`);
    seen.add(barcode);
    const numbers = values.slice(2).map((value, column) => {
      let text = String(value ?? '').trim();
      if (!text) throw new Error(`Linha ${line}: preencha ${names[column + 2]}.`);
      if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
      if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`Linha ${line}: valor inválido em ${names[column + 2]}.`);
      const number = Number(text);
      if (!Number.isFinite(number) || (column === 0 && !Number.isSafeInteger(number))) throw new Error(`Linha ${line}: estoque ou preço inválido.`);
      return number;
    });
    if (numbers[1] <= 0 || numbers[2] <= 0) throw new Error(`Linha ${line}: os preços devem ser maiores que zero.`);
    products.push({id: crypto.randomUUID(), name, barcode, stock: numbers[0], fullPrice: numbers[1], offerPrice: numbers[2]});
  });
  if (!products.length) throw new Error('Nenhum produto encontrado. O estoque atual foi mantido.');
  return products;
}

export function createReplacementControl(React, jsx, read, utils, writeFile) {
  const h = jsx.jsx;
  return function ReplacementControl({products, onReplace}) {
    const input = React.useRef(null);
    const [pending, setPending] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [backup, setBackup] = React.useState(null);
    const buttonClass = 'px-4 py-3 rounded-xl font-semibold border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100';
    async function choose(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        const workbook = read(await file.arrayBuffer(), {type: 'array', codepage: 65001, raw: true});
        if (workbook.SheetNames.length !== 1) throw new Error('Use um arquivo com apenas uma aba de produtos.');
        const rows = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: '', raw: true});
        setPending({products: parseStock(rows), filename: file.name});
        setMessage('');
      } catch (error) { setMessage(`Erro: ${error.message}`); }
    }
    function downloadBackup() {
      try {
        const snapshot = JSON.stringify(products);
        localStorage.setItem('live_sales_stock_backup', JSON.stringify({createdAt: new Date().toISOString(), products}));
        const rows = [['Nome', 'Codigo', 'Estoque', 'Preço Cheio', 'Preço Live'], ...products.map(p => [p.name, p.barcode, p.stock, p.fullPrice, p.offerPrice])];
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), 'Produtos');
        writeFile(workbook, `estoque-anterior-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`);
        setBackup(snapshot);
        setMessage('Cópia salva neste navegador e download solicitado. Guarde o arquivo para restaurar o estoque, se necessário.');
      } catch (error) { setBackup(null); setMessage(`Erro ao salvar cópia: ${error.message}`); }
    }
    async function replace() {
      if (busy || !pending) return;
      if (backup !== JSON.stringify(products)) { setMessage('O estoque mudou. Salve uma nova cópia antes de confirmar.'); return; }
      setBusy(true);
      setMessage('Salvando o novo estoque… Aguarde nesta tela.');
      try {
        await window.LiveSellStock.replace(pending.products);
        onReplace(pending.products);
        setPending(null);
        setBackup(null);
        setMessage(`Estoque substituído: ${pending.products.length} produtos. Vendas e relatórios preservados.`);
      } catch (error) { setMessage(`Erro: ${error.message}`); }
      finally { setBusy(false); }
    }
    return h(React.Fragment, {children: [
      h('button', {type: 'button', className: buttonClass, onClick: () => {setBackup(null); input.current.click();}, children: '🔄 Substituir estoque'}),
      h('input', {type: 'file', ref: input, accept: '.xlsx,.xls,.csv', onChange: choose, className: 'hidden', 'aria-label': 'Planilha do novo estoque'}),
      !pending && message && h('p', {role: 'status', className: 'w-full text-sm', children: message}),
      pending && h('div', {className: 'fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4', children:
        h('section', {role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'replace-stock-title', className: 'bg-white rounded-2xl p-6 max-w-lg w-full space-y-4', children: [
          h('h3', {id: 'replace-stock-title', className: 'text-xl font-bold', children: 'Substituir estoque pela nova planilha'}),
          h('p', {children: `${pending.filename}: ${pending.products.length} produtos substituirão os ${products.length} produtos atuais.`}),
          h('p', {children: 'As vendas e os relatórios serão mantidos. Para restaurar o estoque anterior, importe o arquivo de cópia usando este mesmo botão.'}),
          h('button', {type: 'button', disabled: busy, onClick: downloadBackup, className: buttonClass, children: '1. Salvar cópia do estoque atual'}),
          h('p', {role: 'status', children: message}),
          h('div', {className: 'flex flex-wrap gap-3', children: [
            h('button', {type: 'button', disabled: busy || backup !== JSON.stringify(products), onClick: replace, className: 'px-4 py-3 rounded-xl bg-emerald-700 text-white disabled:opacity-40', children: busy ? 'Salvando…' : '2. Confirmar substituição'}),
            h('button', {type: 'button', disabled: busy, onClick: () => {setPending(null); setMessage('Substituição cancelada.');}, className: 'px-4 py-3 rounded-xl border', children: 'Cancelar'})
          ]})
        ]})})
    ]});
  };
}


