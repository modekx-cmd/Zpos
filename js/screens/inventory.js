/* ============================================================
   inventory.js — Product CRUD, low-stock alerts, stock adjust
   ============================================================ */
Screens.inventory = (() => {
  let products = [];
  let filter = '';

  async function render(root) {
    products = await DB.products.all();
    products.sort((a, b) => a.name.localeCompare(b.name));
    filter = '';
    draw(root);
  }

  function draw(root) {
    const threshold = Number(State.settings.lowStockThreshold) || 5;
    const totalValue = products.reduce((a, p) => a + p.price * (p.stock || 0), 0);
    const lowCount = products.filter((p) => p.stock <= threshold).length;
    root.innerHTML = `
      <div class="stat-grid">
        <div class="stat tint-products"><div class="stat-icon">📦</div><div class="stat-label">Products</div><div class="stat-value">${products.length}</div></div>
        <div class="stat tint-revenue"><div class="stat-icon">💵</div><div class="stat-label">Stock Value</div><div class="stat-value">${FMT.dualPrice(totalValue)}</div></div>
      </div>
      <div class="row-between mb-12">
        <input class="input" id="invSearch" type="search" placeholder="🔍 Search…" style="flex:1;margin:0" autocomplete="off">
        <button class="btn btn-primary btn-sm" id="addBtn" style="margin-left:8px;white-space:nowrap">＋ Add</button>
      </div>
      ${lowCount ? `<div class="badge warning" style="margin-bottom:12px">⚠️ ${lowCount} item(s) at or below low-stock (${threshold})</div>` : ''}
      <div class="list" id="invList"></div>
    `;
    renderList(root.querySelector('#invList'));
    root.querySelector('#invSearch').addEventListener('input', (e) => { filter = e.target.value.toLowerCase(); renderList(root.querySelector('#invList')); });
    root.querySelector('#addBtn').addEventListener('click', () => editProduct(null));
  }

  function renderList(container) {
    const threshold = Number(State.settings.lowStockThreshold) || 5;
    const list = products.filter((p) =>
      !filter || p.name.toLowerCase().includes(filter) || (p.sku || '').toLowerCase().includes(filter) || (p.category || '').toLowerCase().includes(filter)
    );
    if (!list.length) {
      container.innerHTML = `<div class="empty"><div class="empty-emoji">📦</div><div class="empty-title">No products</div><div class="empty-sub">Tap "Add" to create your first product</div></div>`;
      return;
    }
    container.innerHTML = list.map((p) => {
      const low = p.stock <= threshold;
      const out = p.stock <= 0;
      const badge = out ? 'danger' : (low ? 'warning' : 'success');
      const label = out ? 'Out' : (low ? 'Low' : 'OK');
      const cur = p.priceCurrency || 'USD';
      return `<div class="list-item" data-id="${p.id}">
        <div class="li-icon">${p.emoji || '📦'}</div>
        <div class="li-body">
          <div class="li-title">${esc(p.name)}</div>
          <div class="li-sub">${esc(p.sku || 'no SKU')} · ${esc(p.category || 'uncategorized')}</div>
          <div class="li-dual">${FMT.dualPrice(p.price, cur)}</div>
        </div>
        <div class="li-right">
          <div class="li-amount">${FMT.money(p.price, cur)}</div>
          <span class="badge ${badge}">${p.stock} · ${label}</span>
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('[data-id]').forEach((n) =>
      n.addEventListener('click', () => editProduct(n.dataset.id))
    );
  }

  function editProduct(id) {
    const p = id ? products.find((x) => x.id === id) : null;
    const cur = p?.priceCurrency || 'USD';
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field">
        <label>Product Name *</label>
        <input class="input" id="fName" value="${escAttr(p?.name)}" placeholder="e.g. Coffee">
      </div>
      <div class="input-row">
        <div class="field">
          <label>Price *</label>
          <input class="input" id="fPrice" type="number" step="0.01" min="0" value="${p?.price ?? ''}" placeholder="0.00">
        </div>
        <div class="field">
          <label>Currency</label>
          <select class="select" id="fCurrency">
            <option value="USD" ${cur === 'USD' ? 'selected' : ''}>USD ($)</option>
            <option value="LBP" ${cur === 'LBP' ? 'selected' : ''}>LBP (L£)</option>
          </select>
        </div>
      </div>
      <div class="input-row">
        <div class="field">
          <label>Stock Qty</label>
          <input class="input" id="fStock" type="number" step="1" min="0" value="${p?.stock ?? 0}">
        </div>
        <div class="field">
          <label>SKU / Code</label>
          <input class="input" id="fSku" value="${escAttr(p?.sku)}" placeholder="optional">
        </div>
      </div>
      <div class="input-row">
        <div class="field">
          <label>Category</label>
          <input class="input" id="fCat" value="${escAttr(p?.category)}" placeholder="optional">
        </div>
        <div class="field">
          <label>Icon (emoji)</label>
          <input class="input" id="fEmoji" value="${escAttr(p?.emoji)}" placeholder="📦" maxlength="4">
        </div>
      </div>
    `;
    const actions = [
      { label: 'Cancel', kind: 'ghost', value: null },
      { label: p ? 'Save Changes' : 'Add Product', kind: 'primary', onClick: () => { save(p); return false; } }
    ];
    if (p) actions.splice(1, 0, { label: 'Delete', kind: 'danger', onClick: () => { remove(p); return false; } });
    App.modal({
      title: p ? '✏️ Edit Product' : '➕ New Product',
      sub: p ? esc(p.name) : 'Fill in the details below',
      body, actions
    });
  }

  async function save(existing) {
    const name = document.getElementById('fName').value.trim();
    const price = parseFloat(document.getElementById('fPrice').value);
    if (!name) { App.toast('Name is required', 'error'); return; }
    if (isNaN(price) || price < 0) { App.toast('Valid price required', 'error'); return; }
    const rec = {
      id: existing ? existing.id : FMT.uid('p_'),
      name,
      price,
      priceCurrency: document.getElementById('fCurrency').value,
      stock: parseInt(document.getElementById('fStock').value, 10) || 0,
      sku: document.getElementById('fSku').value.trim(),
      category: document.getElementById('fCat').value.trim(),
      emoji: document.getElementById('fEmoji').value.trim() || '📦',
      createdAt: existing ? existing.createdAt : Date.now()
    };
    await DB.products.update(rec);
    App.closeModal();
    App.toast(existing ? 'Product updated' : 'Product added', 'success');
    App.refresh();
  }

  async function remove(p) {
    const ok = await App.confirm(`Delete "${p.name}"? This cannot be undone.`, { danger: true, okLabel: 'Delete' });
    if (!ok) return;
    await DB.products.remove(p.id);
    App.closeModal();
    App.toast('Product deleted', 'success');
    App.refresh();
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  return { render };
})();
