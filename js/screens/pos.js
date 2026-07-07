/* ============================================================
   pos.js — Point of Sale: product grid, cart, checkout
   ============================================================ */
Screens.pos = (() => {
  let products = [];
  let filter = '';

  async function render(root) {
    products = await DB.products.all();
    products.sort((a, b) => a.name.localeCompare(b.name));
    filter = '';
    draw(root);
    App.updateCartUI();
  }

  function draw(root) {
    root.innerHTML = `
      <div class="pos-search">
        <input class="input" id="posSearch" type="search" placeholder="🔍  Search products…" autocomplete="off">
      </div>
      <div class="card">
        <div class="card-title"><span class="dot"></span>Products · Tap to add</div>
        <div class="product-grid" id="posGrid"></div>
      </div>
      <div style="height:60px"></div>
    `;
    const grid = root.querySelector('#posGrid');
    renderGrid(grid);
    root.querySelector('#posSearch').addEventListener('input', (e) => {
      filter = e.target.value.toLowerCase();
      renderGrid(grid);
    });
  }

  function renderGrid(grid) {
    const list = products.filter((p) =>
      !filter || p.name.toLowerCase().includes(filter) || (p.sku || '').toLowerCase().includes(filter)
    );
    if (!list.length) {
      grid.innerHTML = `<div style="grid-column:1/-1" class="empty"><div class="empty-emoji">🔍</div><div class="empty-title">No products found</div></div>`;
      return;
    }
    grid.innerHTML = list.map((p) => {
      const out = p.stock <= 0;
      const cur = p.priceCurrency || 'USD';
      return `<button class="product-card ${out ? 'out' : ''}" data-id="${p.id}" ${out ? 'disabled' : ''}>
        <div class="product-emoji">${p.emoji || '📦'}</div>
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-price">${FMT.money(p.price, cur)}</div>
        <div class="product-price-alt">${FMT.dualPrice(p.price, cur)}</div>
        <div class="product-stock">${out ? 'Out of stock' : esc(p.stock) + ' in stock'}</div>
      </button>`;
    }).join('');
    grid.querySelectorAll('.product-card').forEach((c) =>
      c.addEventListener('click', () => addToCart(c.dataset.id))
    );
  }

  async function addToCart(id) {
    const p = products.find((x) => x.id === id);
    if (!p || p.stock <= 0) return;
    const inCart = State.getCart().find((c) => c.id === id);
    if (inCart && inCart.qty >= p.stock) {
      App.toast('No more stock available', 'error');
      return;
    }
    State.addToCart(p);
    App.toast(`${p.name} added`, 'success');
  }

  // Cart bottom-sheet modal
  function openCart() {
    const cart = State.getCart();
    if (!cart.length) { App.toast('Cart is empty'); return; }
    const s = State.settings;
    const body = document.createElement('div');
    const primaryCur = cart[0]?.priceCurrency || 'USD';
    body.innerHTML = `
      <div id="cartLines"></div>
      <div class="totals">
        <div class="row"><span class="lbl">Subtotal</span><span>${FMT.money(State.cartSubtotal(), primaryCur)}<br><small class="dual-sub">${FMT.dualPrice(State.cartSubtotal(), primaryCur)}</small></span></div>
        ${s.taxRate > 0 ? `<div class="row"><span class="lbl">Tax (${s.taxRate}%)</span><span>${FMT.money(State.cartTax(), primaryCur)}<br><small class="dual-sub">${FMT.dualPrice(State.cartTax(), primaryCur)}</small></span></div>` : ''}
        <div class="row grand"><span class="lbl">Total</span><span>${FMT.money(State.cartTotal(), primaryCur)}<br><small class="dual-sub">${FMT.dualPrice(State.cartTotal(), primaryCur)}</small></span></div>
      </div>
      <div class="field" style="margin-top:14px">
        <label>Payment Method</label>
        <div class="btn-row" id="pmRow">
          ${['cash', 'card', 'other'].map((m, i) =>
            `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-ghost'} btn-sm pm-btn" data-pm="${m}">${m}</button>`
          ).join('')}
        </div>
      </div>
    `;
    let paymentMethod = 'cash';
    App.modal({
      title: '🛒 Cart & Checkout',
      sub: `${State.cartCount()} item(s) in cart`,
      body,
      actions: [
        { label: 'Clear Cart', kind: 'ghost', onClick: () => { State.clearCart(); App.closeModal(); setTimeout(openCart, 50); return false; } },
        { label: 'Charge ' + FMT.money(State.cartTotal(), primaryCur), kind: 'success', onClick: () => { checkout(paymentMethod); return false; } }
      ]
    });
    renderLines(body.querySelector('#cartLines'));
    body.querySelectorAll('.pm-btn').forEach((b) => {
      b.addEventListener('click', () => {
        paymentMethod = b.dataset.pm;
        body.querySelectorAll('.pm-btn').forEach((x) => { x.className = 'btn btn-sm ' + (x === b ? 'btn-primary' : 'btn-ghost'); });
      });
    });
  }

  function renderLines(container) {
    const cart = State.getCart();
    container.innerHTML = cart.map((it) => {
      const cur = it.priceCurrency || 'USD';
      const sym = cur === 'LBP' ? 'L£' : '$';
      return `<div class="cart-line">
        <div class="cl-name">${esc(it.name)}<br>
          <div class="cl-price-edit">
            <span class="cl-price-sym">${sym}</span>
            <input class="cl-price-input" type="number" step="0.01" min="0" value="${it.price}" data-edit="${it.id}">
          </div>
        </div>
        <div class="qty-control">
          <button data-dec="${it.id}">−</button>
          <span class="q">${it.qty}</span>
          <button data-inc="${it.id}">＋</button>
        </div>
        <div class="cl-price">${FMT.money(it.price * it.qty, cur)}<br><small class="dual-sub">${FMT.dualPrice(it.price * it.qty, cur)}</small></div>
      </div>`;
    }).join('');
    container.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { State.inc(b.dataset.inc); refreshCart(); }));
    container.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => { State.dec(b.dataset.dec); refreshCart(); }));
    container.querySelectorAll('[data-edit]').forEach((inp) => {
      inp.addEventListener('change', (e) => { State.setPrice(e.target.dataset.edit, e.target.value); refreshCart(); });
    });
  }

  function refreshCart() {
    if (!State.getCart().length) { App.closeModal(); App.updateCartUI(); return; }
    App.closeModal();
    setTimeout(openCart, 30);
  }

  async function checkout(paymentMethod) {
    const cart = State.getCart();
    if (!cart.length) return;
    for (const it of cart) {
      const p = await DB.products.get(it.id);
      if (!p || p.stock < it.qty) {
        App.toast(`Not enough stock for ${it.name}`, 'error');
        return;
      }
    }
    const subtotal = State.cartSubtotal();
    const tax = State.cartTax();
    const total = State.cartTotal();
    const receiptNo = 'R-' + String(1000 + (Number(State.settings.nextReceiptNo) || 1));
    const sale = {
      id: FMT.uid('s_'),
      receiptNo,
      items: cart.map((c) => ({ name: c.name, price: c.price, priceCurrency: c.priceCurrency || 'USD', qty: c.qty })),
      subtotal, tax, discount: 0, total,
      paymentMethod,
      createdAt: Date.now()
    };
    await DB.sales.add(sale);
    await Promise.all(cart.map(async (c) => {
      const p = await DB.products.get(c.id);
      p.stock = Math.max(0, p.stock - c.qty);
      await DB.products.update(p);
    }));
    await State.update({ nextReceiptNo: (Number(State.settings.nextReceiptNo) || 1) + 1 });
    State.clearCart();
    App.closeModal();
    App.toast('Sale completed! 🎉', 'success');
    setTimeout(() => showReceipt(sale), 300);
  }

  function showReceipt(sale) {
    App.navigate('sales').then(() => Screens.sales.open(sale.id));
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  return { render, openCart };
})();
