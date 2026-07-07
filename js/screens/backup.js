/* ============================================================
   backup.js — Export/import JSON backup, restore, reset
   ============================================================ */
Screens.backup = (() => {
  let lastBackupAt = null;

  async function render(root) {
    const [products, sales] = await Promise.all([DB.products.all(), DB.sales.all()]);
    const approxKB = Math.round(JSON.stringify(await DB.exportAll()).length / 1024);
    root.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="dot"></span>Your Data</div>
        <div class="list">
          <div class="list-item"><div class="li-icon">📦</div><div class="li-body"><div class="li-title">${products.length} Products</div><div class="li-sub">in inventory</div></div></div>
          <div class="list-item"><div class="li-icon">🧾</div><div class="li-body"><div class="li-title">${sales.length} Sales</div><div class="li-sub">recorded transactions</div></div></div>
          <div class="list-item"><div class="li-icon">💾</div><div class="li-body"><div class="li-title">${approxKB} KB</div><div class="li-sub">estimated backup size</div></div></div>
        </div>
      </div>

      <div class="section-label">Export</div>
      <div class="card">
        <p class="text-sm text-soft mb-12">Download a complete backup file (JSON) containing all products, sales, and settings. Save it to your device or cloud drive. Works fully offline.</p>
        <button class="btn btn-primary" id="exportBtn">⬇️ Download Backup (.json)</button>
      </div>

      <div class="section-label">Restore</div>
      <div class="card">
        <p class="text-sm text-soft mb-12">Restore from a previous backup file. You can choose to replace all current data or merge with existing data.</p>
        <input type="file" id="restoreFile" accept=".json,application/json" hidden>
        <div class="btn-row">
          <button class="btn btn-ghost" id="restoreReplace">🔄 Replace All</button>
          <button class="btn btn-ghost" id="restoreMerge">➕ Merge</button>
        </div>
      </div>

      <div class="section-label">Danger Zone</div>
      <div class="card">
        <p class="text-sm text-soft mb-12">Permanently delete all data and start fresh. This cannot be undone — export a backup first.</p>
        <button class="btn btn-danger" id="wipeBtn">🗑️ Erase All Data</button>
      </div>

      <div style="height:30px"></div>
    `;
    root.querySelector('#exportBtn').addEventListener('click', exportBackup);
    const fileInput = root.querySelector('#restoreFile');
    fileInput.addEventListener('change', (e) => handleRestore(e.target.files[0]));
    root.querySelector('#restoreReplace').addEventListener('click', () => { restoreMode = 'replace'; fileInput.click(); });
    root.querySelector('#restoreMerge').addEventListener('click', () => { restoreMode = 'merge'; fileInput.click(); });
    root.querySelector('#wipeBtn').addEventListener('click', wipeAll);
  }

  let restoreMode = 'replace';

  async function exportBackup() {
    try {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      Receipt.downloadBlob(blob, `pocketpos-backup-${stamp}.json`);
      lastBackupAt = Date.now();
      await State.update({ lastBackupAt });
      App.toast('Backup downloaded ✓', 'success');
    } catch (e) {
      App.toast('Export failed: ' + e.message, 'error');
    }
  }

  async function handleRestore(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.products && !data.sales) throw new Error('Not a valid backup file');
      const ok = await App.confirm(
        restoreMode === 'replace'
          ? `Restore ${data.products?.length || 0} products and ${data.sales?.length || 0} sales? All current data will be erased.`
          : `Merge ${data.products?.length || 0} products and ${data.sales?.length || 0} sales into your current data?`,
        { okLabel: 'Restore' }
      );
      if (!ok) return;
      const result = await DB.importAll(data, restoreMode);
      await State.loadSettings();
      App.closeModal();
      App.toast(`Restored ${result.products} products, ${result.sales} sales`, 'success');
      App.navigate('dashboard');
    } catch (e) {
      App.closeModal();
      App.toast('Restore failed: ' + e.message, 'error');
    }
  }

  async function wipeAll() {
    const ok = await App.confirm('This will permanently delete ALL products, sales, and settings. Are you absolutely sure?', { danger: true, okLabel: 'Erase Everything' });
    if (!ok) return;
    const ok2 = await App.confirm('Last chance — this really cannot be undone. Continue?', { danger: true, okLabel: 'Yes, Erase All' });
    if (!ok2) return;
    await DB.wipeAll();
    await State.loadSettings();
    App.closeModal();
    App.toast('All data erased', 'success');
    App.navigate('dashboard');
  }

  return { render };
})();
