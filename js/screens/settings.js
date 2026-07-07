/* ============================================================
   settings.js — Store info, currency, tax, receipt footer, logo
   ============================================================ */
Screens.settings = (() => {
  async function render(root) {
    const s = State.settings;
    const logoSrc = s.storeLogo || '';
    root.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="dot"></span>Store Information</div>
        <div class="field">
          <label>Store Name</label>
          <input class="input" id="sStoreName" value="${escAttr(s.storeName)}">
        </div>
        <div class="field">
          <label>Store Logo</label>
          <div class="logo-upload-area" id="logoArea">
            ${logoSrc
              ? `<div class="logo-preview"><img src="${logoSrc}" alt="Store logo" id="logoPreview"><button class="logo-remove" id="logoRemove" title="Remove logo">✕</button></div>`
              : `<div class="logo-placeholder" id="logoPlaceholder">🏪</div>`
            }
            <input type="file" id="logoFile" accept="image/*" hidden>
            <button class="btn btn-ghost btn-sm" id="logoPickBtn" style="margin-top:8px">${logoSrc ? 'Change Logo' : 'Upload Logo'}</button>
          </div>
        </div>
        <div class="field">
          <label>Address (shown on receipt)</label>
          <textarea class="textarea" id="sAddress">${esc(s.receiptAddress)}</textarea>
        </div>
        <div class="field">
          <label>Phone</label>
          <input class="input" id="sPhone" value="${escAttr(s.receiptPhone)}">
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="dot"></span>Currency & Tax</div>
        <div class="field">
          <label>Default Currency</label>
          <select class="select" id="sCurrency">
            <option value="USD" ${s.currency !== 'LBP' ? 'selected' : ''}>USD ($)</option>
            <option value="LBP" ${s.currency === 'LBP' ? 'selected' : ''}>LBP (L£)</option>
          </select>
        </div>
        <div class="field">
          <label>Exchange Rate (1 USD = ? LBP)</label>
          <input class="input" id="sExchangeRate" type="number" step="1" min="1" value="${s.exchangeRate || 89000}">
        </div>
        <div class="field">
          <label>Tax Rate (%)</label>
          <input class="input" id="sTax" type="number" step="0.01" min="0" max="100" value="${s.taxRate}">
        </div>
        <div class="field">
          <label>Low-Stock Threshold</label>
          <input class="input" id="sLowStock" type="number" min="0" value="${s.lowStockThreshold}">
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="dot"></span>Receipt</div>
        <div class="field">
          <label>Receipt Footer Message</label>
          <textarea class="textarea" id="sFooter">${esc(s.receiptFooter)}</textarea>
        </div>
        <div class="field">
          <label>Next Receipt Number</label>
          <input class="input" id="sNextNo" type="number" min="1" value="${s.nextReceiptNo}">
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="dot"></span>About</div>
        <div class="list">
          <div class="list-item"><div class="li-body"><div class="li-title">PocketPOS</div><div class="li-sub">Version 1.2.0</div></div><span class="badge success">Offline</span></div>
          <div class="list-item"><div class="li-body"><div class="li-title">Storage</div><div class="li-sub">IndexedDB (device only)</div></div><span class="badge info">Private</span></div>
          <div class="list-item"><div class="li-body"><div class="li-title">Install as App</div><div class="li-sub">Use browser menu → "Add to Home Screen"</div></div><span class="badge">PWA</span></div>
        </div>
      </div>

      <button class="btn btn-success" id="saveBtn" style="margin-bottom:30px">💾 Save Settings</button>
    `;
    root.querySelector('#saveBtn').addEventListener('click', save);

    // Logo upload logic
    const fileInput = root.querySelector('#logoFile');
    const pickBtn = root.querySelector('#logoPickBtn');
    pickBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleLogoPick(e.target.files[0]));

    const removeBtn = root.querySelector('#logoRemove');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pendingLogo = '';
        document.querySelector('.logo-upload-area').innerHTML = `
          <div class="logo-placeholder" id="logoPlaceholder">🏪</div>
          <input type="file" id="logoFile" accept="image/*" hidden>
          <button class="btn btn-ghost btn-sm" id="logoPickBtn" style="margin-top:8px">Upload Logo</button>
        `;
        rebindLogo(root);
      });
    }
  }

  let pendingLogo = '';

  function rebindLogo(root) {
    const fileInput = root.querySelector('#logoFile');
    const pickBtn = root.querySelector('#logoPickBtn');
    pickBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleLogoPick(e.target.files[0]));
  }

  function handleLogoPick(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { App.toast('Please select an image file', 'error'); return; }
    if (file.size > 500 * 1024) { App.toast('Image must be under 500KB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      // Resize to max 192px wide for storage efficiency
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 192;
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        pendingLogo = canvas.toDataURL('image/png');
        // Update preview
        const area = document.querySelector('.logo-upload-area');
        area.innerHTML = `
          <div class="logo-preview"><img src="${pendingLogo}" alt="Store logo" id="logoPreview"><button class="logo-remove" id="logoRemove" title="Remove logo">✕</button></div>
          <input type="file" id="logoFile" accept="image/*" hidden>
          <button class="btn btn-ghost btn-sm" id="logoPickBtn" style="margin-top:8px">Change Logo</button>
        `;
        const root = document.querySelector('#screenRoot');
        rebindLogo(root);
        document.querySelector('#logoRemove').addEventListener('click', (e) => {
          e.stopPropagation();
          pendingLogo = '';
          area.innerHTML = `
            <div class="logo-placeholder" id="logoPlaceholder">🏪</div>
            <input type="file" id="logoFile" accept="image/*" hidden>
            <button class="btn btn-ghost btn-sm" id="logoPickBtn" style="margin-top:8px">Upload Logo</button>
          `;
          rebindLogo(root);
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    const partial = {
      storeName: document.getElementById('sStoreName').value.trim() || 'My Store',
      receiptAddress: document.getElementById('sAddress').value.trim(),
      receiptPhone: document.getElementById('sPhone').value.trim(),
      currency: document.getElementById('sCurrency').value,
      exchangeRate: parseFloat(document.getElementById('sExchangeRate').value) || 89000,
      taxRate: parseFloat(document.getElementById('sTax').value) || 0,
      lowStockThreshold: parseInt(document.getElementById('sLowStock').value, 10) || 0,
      receiptFooter: document.getElementById('sFooter').value.trim(),
      nextReceiptNo: parseInt(document.getElementById('sNextNo').value, 10) || 1
    };
    if (pendingLogo) {
      partial.storeLogo = pendingLogo;
    } else if (pendingLogo === '' && !document.querySelector('.logo-preview')) {
      partial.storeLogo = '';
    }
    await State.update(partial);
    document.getElementById('storeNameLabel').textContent = partial.storeName;
    applyLogo(partial.storeLogo || State.settings.storeLogo);
    applyPwaIcon(partial.storeLogo || State.settings.storeLogo);
    pendingLogo = '';
    App.toast('Settings saved ✓', 'success');
    App.refresh();
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  return { render };
})();

// Global helpers for logo
function applyLogo(logoData) {
  const brandLogo = document.querySelector('.brand-logo');
  if (!brandLogo) return;
  if (logoData) {
    brandLogo.innerHTML = `<img src="${logoData}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:inherit">`;
  } else {
    brandLogo.innerHTML = '🧾';
  }
}

function applyPwaIcon(logoData) {
  if (!logoData) return;
  // Update browser favicon
  let favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = logoData;
  // Update apple touch icon
  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleIcon) appleIcon.href = logoData;
  // Update meta theme icon for some browsers
  const metaIcon = document.querySelector('link[rel="mask-icon"]');
  if (metaIcon) metaIcon.href = logoData;
}
