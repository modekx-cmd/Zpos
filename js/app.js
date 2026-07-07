/* ============================================================
   app.js — Main controller: routing, dock, cart bar, modal, toast
   ============================================================ */
const App = (() => {
  const SCREENS = ['dashboard', 'pos', 'inventory', 'sales', 'backup', 'settings'];
  const SCREEN_META = {
    dashboard: { title: 'Dashboard', sub: 'Business overview & analytics' },
    pos: { title: 'Point of Sale', sub: 'Build a sale and checkout' },
    inventory: { title: 'Inventory', sub: 'Manage your products & stock' },
    sales: { title: 'Sales & Receipts', sub: 'View history, print & save receipts' },
    backup: { title: 'Backup & Restore', sub: 'Export or restore your data' },
    settings: { title: 'Settings', sub: 'Store info, currency, tax & receipt' }
  };
  let current = null;

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg, type = '') {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '') + ' is-visible';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = t.className.replace(' is-visible', ''); }, 2600);
  }

  // ---------- Modal (bottom sheet) ----------
  function modal({ title, sub, body, actions }) {
    return new Promise((resolve) => {
      const overlay = $('#modalOverlay');
      const box = $('#modal');
      const close = (val) => { overlay.classList.remove('is-open'); resolve(val); };
      const actionsHTML = (actions || [{ label: 'Close', kind: 'ghost', value: null }]).map((a, i) =>
        `<button class="btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : a.kind === 'success' ? 'btn-success' : 'btn-ghost'}" data-i="${i}">${escapeHtml(a.label)}</button>`
      ).join('');
      box.innerHTML = `
        <div class="modal-handle"></div>
        ${title ? `<h3 class="modal-title">${escapeHtml(title)}</h3>` : ''}
        ${sub ? `<p class="modal-sub">${escapeHtml(sub)}</p>` : ''}
        <div class="modal-body"></div>
        <div class="modal-actions" style="margin-top:16px;display:flex;flex-direction:column;gap:8px">${actionsHTML}</div>
      `;
      box.querySelector('.modal-body').appendChild(body);
      box.querySelectorAll('.modal-actions .btn').forEach((b) => {
        b.addEventListener('click', () => {
          const a = actions[+b.dataset.i];
          if (a.onClick) { const r = a.onClick(); if (r === false) return; }
          close(a.value !== undefined ? a.value : null);
        });
      });
      overlay.classList.add('is-open');
      overlay.onclick = (e) => { if (e.target === overlay) close(null); };
    });
  }
  function closeModal() { $('#modalOverlay').classList.remove('is-open'); }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- Confirm ----------
  async function confirm(msg, opts = {}) {
    return modal({
      title: opts.title || 'Please confirm',
      sub: msg,
      body: el('div'),
      actions: [
        { label: opts.cancelLabel || 'Cancel', kind: 'ghost', value: false },
        { label: opts.okLabel || (opts.danger ? 'Delete' : 'Confirm'), kind: opts.danger ? 'danger' : 'primary', value: true }
      ]
    });
  }

  // ---------- Routing ----------
  async function navigate(screen) {
    if (screen === 'more') { openMoreSheet(); return; }
    if (!SCREENS.includes(screen)) return;
    current = screen;
    document.querySelectorAll('.dock-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.screen === screen && b.id !== 'dockMore');
    });
    $('#dockMore').classList.remove('active');
    const meta = SCREEN_META[screen];
    $('#screenTitle').textContent = meta.title;
    $('#screenSub').textContent = meta.sub;
    $('#screenRoot').innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><div class="empty-title">Loading…</div></div>`;
    closeMoreSheet();
    closeModal();
    updateCartUI();
    try {
      const fn = Screens[screen];
      if (fn) await fn.render($('#screenRoot'));
    } catch (e) {
      console.error('Screen render error:', e);
      $('#screenRoot').innerHTML = `<div class="empty"><div class="empty-emoji">⚠️</div><div class="empty-title">Something went wrong</div><div class="empty-sub">${escapeHtml(e.message)}</div></div>`;
    }
  }

  function refresh() { if (current) navigate(current); }

  // ---------- More sheet ----------
  function openMoreSheet() {
    $('#sheetOverlay').classList.add('is-open');
    $('#moreSheet').classList.add('is-open');
  }
  function closeMoreSheet() {
    $('#sheetOverlay').classList.remove('is-open');
    $('#moreSheet').classList.remove('is-open');
  }

  // ---------- Cart bar ----------
  function updateCartUI() {
    const count = State.cartCount();
    const cartBtn = $('#cartBtn');
    if (count > 0) {
      cartBtn.classList.remove('is-hidden');
      $('#cartCount').textContent = count;
    } else {
      cartBtn.classList.add('is-hidden');
    }
    let bar = $('#posCartBar');
    if (current === 'pos') {
      if (!bar) {
        bar = el('div', 'cart-bar');
        bar.id = 'posCartBar';
        bar.innerHTML = `
          <div class="cb-left">
            <div class="cb-count"><span id="cbCount">0</span> items</div>
            <div class="cb-total"><span id="cbTotal">$0.00</span></div>
          </div>
          <button class="cb-btn" id="cbView">View Cart</button>`;
        document.body.appendChild(bar);
        $('#cbView').addEventListener('click', () => Screens.pos.openCart());
        setTimeout(() => bar.classList.add('show'), 10);
      }
      $('#cbCount').textContent = count;
      $('#cbTotal').textContent = FMT.money(State.cartTotal());
      bar.classList.toggle('show', count > 0);
    } else if (bar) {
      bar.remove();
    }
  }

  function updateConn() {
    const pill = $('#connPill');
    pill.textContent = navigator.onLine ? '● Online' : '● Offline';
    pill.title = navigator.onLine ? 'Online (app still works offline)' : 'Offline mode';
  }

  // ---------- Init ----------
  async function init() {
    closeModal();
    closeMoreSheet();
    await State.loadSettings();
    $('#storeNameLabel').textContent = State.settings.storeName || 'My Store';
    if (typeof applyLogo === 'function') applyLogo(State.settings.storeLogo);
    if (typeof applyPwaIcon === 'function' && State.settings.storeLogo) applyPwaIcon(State.settings.storeLogo);
    await seedIfEmpty();

    document.querySelectorAll('.dock-item').forEach((b) => {
      b.addEventListener('click', () => navigate(b.dataset.screen));
    });
    document.querySelectorAll('.sheet-item').forEach((b) => {
      b.addEventListener('click', () => navigate(b.dataset.screen));
    });
    $('#sheetOverlay').addEventListener('click', closeMoreSheet);
    $('#cartBtn').addEventListener('click', () => navigate('pos').then(() => Screens.pos.openCart()));
    State.on('cart', updateCartUI);
    window.addEventListener('online', updateConn);
    window.addEventListener('offline', updateConn);
    updateConn();
    await navigate('dashboard');
  }

  // ---------- Seed demo data ----------
  async function seedIfEmpty() {
    const products = await DB.products.all();
    const sales = await DB.sales.all();
    if (products.length === 0 && sales.length === 0) {
      const demo = [
        { name: 'Coffee', emoji: '☕', price: 3.5, stock: 40, sku: 'BEV-001', category: 'Drinks' },
        { name: 'Tea', emoji: '🍵', price: 2.5, stock: 30, sku: 'BEV-002', category: 'Drinks' },
        { name: 'Croissant', emoji: '🥐', price: 2.8, stock: 12, sku: 'BKE-001', category: 'Bakery' },
        { name: 'Sandwich', emoji: '🥪', price: 5.5, stock: 8, sku: 'FOOD-01', category: 'Food' },
        { name: 'Bottled Water', emoji: '💧', price: 1.2, stock: 60, sku: 'BEV-010', category: 'Drinks' },
        { name: 'Chocolate Bar', emoji: '🍫', price: 1.8, stock: 4, sku: 'SNK-001', category: 'Snacks' },
        { name: 'Chips', emoji: '🍟', price: 2.0, stock: 25, sku: 'SNK-002', category: 'Snacks' },
        { name: 'Orange Juice', emoji: '🧃', price: 3.0, stock: 18, sku: 'BEV-020', category: 'Drinks' }
      ];
      for (const p of demo) await DB.products.add({ id: FMT.uid('p_'), ...p, createdAt: Date.now() });
      const now = Date.now();
      const sample = [
        { d: 0, items: [{ name: 'Coffee', price: 3.5, qty: 2 }, { name: 'Croissant', price: 2.8, qty: 1 }], pm: 'cash' },
        { d: 1, items: [{ name: 'Sandwich', price: 5.5, qty: 1 }, { name: 'Bottled Water', price: 1.2, qty: 1 }], pm: 'card' },
        { d: 2, items: [{ name: 'Tea', price: 2.5, qty: 3 }], pm: 'cash' },
        { d: 3, items: [{ name: 'Chips', price: 2.0, qty: 2 }, { name: 'Chocolate Bar', price: 1.8, qty: 2 }], pm: 'cash' },
        { d: 5, items: [{ name: 'Coffee', price: 3.5, qty: 1 }, { name: 'Orange Juice', price: 3.0, qty: 1 }], pm: 'card' }
      ];
      let n = 1;
      for (const s of sample) {
        const subtotal = s.items.reduce((a, it) => a + it.price * it.qty, 0);
        const tax = subtotal * (Number(State.settings.taxRate) || 0) / 100;
        await DB.sales.add({
          id: FMT.uid('s_'),
          receiptNo: 'R-' + String(1000 + n++),
          items: s.items, subtotal, tax, discount: 0, total: subtotal + tax,
          paymentMethod: s.pm, createdAt: now - s.d * 86400000
        });
      }
    }
  }

  return { init, navigate, refresh, toast, modal, confirm, closeModal, updateCartUI, get current() { return current; } };
})();

document.addEventListener('DOMContentLoaded', App.init);
