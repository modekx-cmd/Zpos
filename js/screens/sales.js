/* ============================================================
   sales.js — Sales history, receipt view/print/save
   ============================================================ */
Screens.sales = (() => {
  let sales = [];
  let filter = 'all'; // all | today | week

  async function render(root) {
    sales = await DB.sales.all();
    sales.sort((a, b) => b.createdAt - a.createdAt);
    filter = 'all';
    draw(root);
  }

  function draw(root) {
    const total = sales.reduce((a, s) => a + s.total, 0);
    root.innerHTML = `
      <div class="stat-grid">
        <div class="stat tint-revenue"><div class="stat-icon">💰</div><div class="stat-label">Total Revenue</div><div class="stat-value">${FMT.dualPrice(total)}</div></div>
        <div class="stat tint-orders"><div class="stat-icon">🧾</div><div class="stat-label">Total Sales</div><div class="stat-value">${sales.length}</div></div>
      </div>
      <div class="row-between mb-12">
        <div class="btn-row" id="filterRow" style="flex:1">
          <button class="btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}" data-f="all">All</button>
          <button class="btn btn-sm ${filter === 'today' ? 'btn-primary' : 'btn-ghost'}" data-f="today">Today</button>
          <button class="btn btn-sm ${filter === 'week' ? 'btn-primary' : 'btn-ghost'}" data-f="week">7 days</button>
        </div>
      </div>
      <div class="list" id="salesList"></div>
    `;
    renderList(root.querySelector('#salesList'));
    root.querySelectorAll('#filterRow [data-f]').forEach((b) =>
      b.addEventListener('click', () => {
        filter = b.dataset.f;
        root.querySelectorAll('#filterRow [data-f]').forEach((x) => x.className = 'btn btn-sm ' + (x === b ? 'btn-primary' : 'btn-ghost'));
        renderList(root.querySelector('#salesList'));
      })
    );
  }

  function renderList(container) {
    const now = Date.now();
    const startToday = new Date(new Date().setHours(0,0,0,0)).getTime();
    let list = sales;
    if (filter === 'today') list = sales.filter((s) => s.createdAt >= startToday);
    if (filter === 'week') list = sales.filter((s) => s.createdAt >= now - 7 * 86400000);
    if (!list.length) {
      container.innerHTML = `<div class="empty"><div class="empty-emoji">🧾</div><div class="empty-title">No sales found</div><div class="empty-sub">Sales will appear here after checkout</div></div>`;
      return;
    }
    container.innerHTML = list.map((s) => `
      <div class="list-item" data-id="${s.id}">
        <div class="li-icon">🧾</div>
        <div class="li-body">
          <div class="li-title">${esc(s.receiptNo || s.id.slice(-6).toUpperCase())}</div>
          <div class="li-sub">${s.items.length} items · ${FMT.dateTime(s.createdAt)} · ${esc(s.paymentMethod || 'cash')}</div>
        </div>
        <div class="li-right">
          <div class="li-amount">${FMT.dualPrice(s.total)}</div>
          <span class="badge info">View</span>
        </div>
      </div>`).join('');
    container.querySelectorAll('[data-id]').forEach((n) =>
      n.addEventListener('click', () => open(n.dataset.id))
    );
  }

  async function open(id) {
    const sale = await DB.sales.get(id);
    if (!sale) { App.toast('Sale not found', 'error'); return; }
    const body = document.createElement('div');
    body.innerHTML = Receipt.buildReceiptHTML(sale);
    App.modal({
      title: '🧾 Receipt',
      sub: `${sale.receiptNo} · ${FMT.dateTime(sale.createdAt)}`,
      body,
      actions: [
        { label: 'Close', kind: 'ghost', value: null },
        { label: '🖨️ Print', kind: 'ghost', onClick: () => { Receipt.print(sale); return false; } },
        { label: '⬇️ Save PNG', kind: 'success', onClick: async () => { try { await Receipt.saveImage(sale); App.toast('Receipt saved'); } catch (e) { App.toast('Save failed — try Print instead', 'error'); } return false; } }
      ]
    });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  return { render, open };
})();
