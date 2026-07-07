/* ============================================================
   dashboard.js — Analytics overview with charts
   ============================================================ */
Screens.dashboard = (() => {
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  async function render(root) {
    const [sales, products] = await Promise.all([DB.sales.all(), DB.products.all()]);
    const stats = computeStats(sales, products);

    root.innerHTML = `
      <div class="stat-grid">
        <div class="stat tint-revenue">
          <div class="stat-icon">💰</div>
          <div class="stat-label">Today's Revenue</div>
          <div class="stat-value">${FMT.dualPrice(stats.todayRevenue)}</div>
          <div class="stat-trend ${stats.revTrend >= 0 ? 'up' : 'down'}">${stats.revTrend >= 0 ? '▲' : '▼'} ${Math.abs(stats.revTrend).toFixed(0)}% vs yesterday</div>
        </div>
        <div class="stat tint-orders">
          <div class="stat-icon">🧾</div>
          <div class="stat-label">Today's Orders</div>
          <div class="stat-value">${stats.todayOrders}</div>
          <div class="stat-trend up">Avg ${FMT.dualPrice(stats.avgOrder)}</div>
        </div>
        <div class="stat tint-products">
          <div class="stat-icon">📦</div>
          <div class="stat-label">Products</div>
          <div class="stat-value">${products.length}</div>
          <div class="stat-trend up">${stats.totalStock} in stock</div>
        </div>
        <div class="stat tint-low">
          <div class="stat-icon">⚠️</div>
          <div class="stat-label">Low Stock</div>
          <div class="stat-value">${stats.lowStock}</div>
          <div class="stat-trend ${stats.lowStock > 0 ? 'down' : 'up'}">${stats.lowStock > 0 ? 'needs attention' : 'all good'}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="dot"></span>Revenue · Last 7 days</div>
        <div class="chart-wrap">${Charts.bar(stats.last7)}</div>
      </div>

      <div class="card">
        <div class="card-title"><span class="dot"></span>Top Products</div>
        <div class="donut-wrap">
          <div style="flex:0 0 auto">${Charts.donut(stats.topProducts, { centerLabel: FMT.usd(stats.totalRevenue).replace(/\.00$/, ''), centerSub: 'revenue' })}</div>
          <div class="donut-legend">${Charts.legend(stats.topProducts)}</div>
        </div>
      </div>

      ${stats.lowStockItems.length ? `
      <div class="section-label">Low Stock Alerts</div>
      <div class="list">
        ${stats.lowStockItems.map((p) => {
          const cur = p.priceCurrency || 'USD';
          return `<div class="list-item">
            <div class="li-icon">${p.emoji || '📦'}</div>
            <div class="li-body">
              <div class="li-title">${escapeHtml(p.name)}</div>
              <div class="li-sub">${escapeHtml(p.sku || '')} · ${FMT.dualPrice(p.price, cur)}</div>
            </div>
            <div class="li-right">
              <span class="badge danger">${p.stock} left</span>
            </div>
          </div>`;
        }).join('')}
      </div>` : ''}

      <div class="section-label">Recent Sales</div>
      ${stats.recent.length ? `
      <div class="list">
        ${stats.recent.map((s) => `
          <div class="list-item" data-sale="${s.id}">
            <div class="li-icon">🧾</div>
            <div class="li-body">
              <div class="li-title">${escapeHtml(s.receiptNo || s.id.slice(-6).toUpperCase())}</div>
              <div class="li-sub">${s.items.length} items · ${FMT.relTime(s.createdAt)} · ${s.paymentMethod}</div>
            </div>
            <div class="li-right">
              <div class="li-amount">${FMT.dualPrice(s.total)}</div>
            </div>
          </div>`).join('')}
      </div>` : `<div class="empty"><div class="empty-emoji">🛒</div><div class="empty-title">No sales yet</div><div class="empty-sub">Make your first sale from Point of Sale</div></div>`}

      <div style="margin-top:16px">
        <button class="btn btn-primary" id="goPos">＋ Start New Sale</button>
      </div>
    `;

    $('#goPos', root).addEventListener('click', () => App.navigate('pos'));
    root.querySelectorAll('[data-sale]').forEach((n) =>
      n.addEventListener('click', () => App.navigate('sales').then(() => Screens.sales.open(n.dataset.sale)))
    );
  }

  function computeStats(sales, products) {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 86400000;
    const todayRevenue = sales.filter((s) => s.createdAt >= startToday).reduce((a, s) => a + s.total, 0);
    const yRevenue = sales.filter((s) => s.createdAt >= startYesterday && s.createdAt < startToday).reduce((a, s) => a + s.total, 0);
    const todayOrders = sales.filter((s) => s.createdAt >= startToday).length;
    const revTrend = yRevenue > 0 ? ((todayRevenue - yRevenue) / yRevenue) * 100 : (todayRevenue > 0 ? 100 : 0);
    const totalRevenue = sales.reduce((a, s) => a + s.total, 0);
    const avgOrder = todayOrders > 0 ? todayRevenue / todayOrders : (sales.length ? totalRevenue / sales.length : 0);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startToday - i * 86400000);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
      const next = d.getTime() + 86400000;
      const val = sales.filter((s) => s.createdAt >= d.getTime() && s.createdAt < next).reduce((a, s) => a + s.total, 0);
      days.push({ label, value: Math.round(val) });
    }

    const prodRevenue = {};
    sales.forEach((s) => s.items.forEach((it) => {
      prodRevenue[it.name] = (prodRevenue[it.name] || 0) + it.price * it.qty;
    }));
    const topProducts = Object.entries(prodRevenue)
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    if (!topProducts.length) topProducts.push({ label: 'No data', value: 1 });

    const threshold = Number(State.settings.lowStockThreshold) || 5;
    const lowStockItems = products.filter((p) => p.stock <= threshold).sort((a, b) => a.stock - b.stock);

    const recent = [...sales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

    return {
      todayRevenue, todayOrders, revTrend, totalRevenue, avgOrder,
      totalStock: products.reduce((a, p) => a + (Number(p.stock) || 0), 0),
      lowStock: lowStockItems.length,
      lowStockItems, last7: days, topProducts, recent
    };
  }

  function $(s, root) { return (root || document).querySelector(s); }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  return { render };
})();
