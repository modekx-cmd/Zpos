/* ============================================================
   receipt.js — Receipt rendering, print, and save-as-image
   ============================================================ */
const Receipt = (() => {
  function buildReceiptHTML(sale) {
    const s = State.settings;
    const lines = (sale.items || []).map((it) => {
      const lineTotal = it.price * it.qty;
      const cur = it.priceCurrency || 'USD';
      return `<div class="r-row">
        <span>${escapeHtml(it.name)} ×${it.qty}</span>
        <span>${FMT.money(lineTotal, cur)}<br><small>${FMT.dualPrice(lineTotal, cur)}</small></span>
      </div>`;
    }).join('');
    const tax = sale.tax || 0;
    const cur = sale.items?.[0]?.priceCurrency || 'USD';
    return `<div class="receipt" id="receiptDoc">
      ${s.storeLogo ? `<div class="r-logo"><img src="${escapeHtml(s.storeLogo)}" alt="Logo"></div>` : ''}
      <h2>${escapeHtml(s.storeName || 'Store')}</h2>
      ${s.receiptAddress ? `<div class="r-center text-xs">${escapeHtml(s.receiptAddress)}</div>` : ''}
      ${s.receiptPhone ? `<div class="r-center text-xs">${escapeHtml(s.receiptPhone)}</div>` : ''}
      <div class="r-center text-xs">Exchange Rate: 1 USD = ${Number(s.exchangeRate || 89000).toLocaleString()} LBP</div>
      <div class="r-center text-xs">${FMT.dateTime(sale.createdAt)}</div>
      <div class="r-center text-xs">Receipt #: ${escapeHtml(sale.receiptNo || sale.id.slice(-6).toUpperCase())}</div>
      <div class="r-divider"></div>
      ${lines}
      <div class="r-divider"></div>
      <div class="r-row"><span>Subtotal</span><span>${FMT.money(sale.subtotal, cur)}<br><small>${FMT.dualPrice(sale.subtotal, cur)}</small></span></div>
      ${tax > 0 ? `<div class="r-row"><span>Tax (${s.taxRate}%)</span><span>${FMT.money(tax, cur)}<br><small>${FMT.dualPrice(tax, cur)}</small></span></div>` : ''}
      ${sale.discount ? `<div class="r-row"><span>Discount</span><span>- ${FMT.money(sale.discount, cur)}<br><small>${FMT.dualPrice(sale.discount, cur)}</small></span></div>` : ''}
      <div class="r-divider"></div>
      <div class="r-row r-total"><span>TOTAL</span><span>${FMT.money(sale.total, cur)}<br><small>${FMT.dualPrice(sale.total, cur)}</small></span></div>
      <div class="r-row"><span>Paid (${sale.paymentMethod || 'cash'})</span><span>${FMT.money(sale.total, cur)}</span></div>
      <div class="r-divider"></div>
      <div class="r-center text-xs">${escapeHtml(s.receiptFooter || '')}</div>
    </div>`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function renderInto(container, sale) {
    container.innerHTML = buildReceiptHTML(sale);
  }

  function print(sale) {
    const area = document.getElementById('printArea');
    renderInto(area, sale);
    window.print();
  }

  async function saveImage(sale) {
    const html = buildReceiptHTML(sale);
    const wrap = document.createElement('div');
    wrap.style.position = 'fixed'; wrap.style.left = '-9999px'; wrap.style.top = '0';
    wrap.style.width = '320px';
    wrap.innerHTML = html;
    const r = wrap.querySelector('.receipt');
    r.style.background = '#ffffff';
    r.style.padding = '20px';
    r.style.borderRadius = '0';
    document.body.appendChild(wrap);

    const w = 320, h = wrap.scrollHeight;
    const data = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: monospace;">${r.outerHTML}</div>
        </foreignObject>
      </svg>`;
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = w * 2; canvas.height = h * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      document.body.removeChild(wrap);
      canvas.toBlob((blob) => downloadBlob(blob, `receipt-${sale.receiptNo || sale.id.slice(-6)}.png`));
      return true;
    } catch (e) {
      URL.revokeObjectURL(url);
      if (wrap.parentNode) document.body.removeChild(wrap);
      throw e;
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { renderInto, print, saveImage, buildReceiptHTML, downloadBlob };
})();
