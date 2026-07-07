/* ============================================================
   db.js — IndexedDB wrapper for PocketPOS
   Stores: products, sales, settings (offline-first)
   ============================================================ */
// Declared first (db.js loads before screen files) so screen
// modules can register themselves: Screens.dashboard = (() => {...})()
const Screens = {};

const DB = (() => {
  const DB_NAME = 'pocketpos';
  const DB_VERSION = 1;
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('products')) {
          const s = db.createObjectStore('products', { keyPath: 'id' });
          s.createIndex('sku', 'sku', { unique: false });
          s.createIndex('name', 'name', { unique: false });
        }
        if (!db.objectStoreNames.contains('sales')) {
          const s = db.createObjectStore('sales', { keyPath: 'id' });
          s.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(store, mode = 'readonly') {
    return open().then((db) => db.transaction(store, mode).objectStore(store));
  }

  function reqP(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic CRUD
  async function put(store, value) {
    const os = await tx(store, 'readwrite');
    return reqP(os.put(value));
  }
  async function get(store, key) {
    const os = await tx(store);
    return reqP(os.get(key));
  }
  async function getAll(store) {
    const os = await tx(store);
    return reqP(os.getAll());
  }
  async function del(store, key) {
    const os = await tx(store, 'readwrite');
    return reqP(os.delete(key));
  }
  async function clear(store) {
    const os = await tx(store, 'readwrite');
    return reqP(os.clear());
  }

  // Settings helpers (key/value)
  const settings = {
    async get(key, fallback = null) {
      const r = await get('settings', key);
      return r ? r.value : fallback;
    },
    async set(key, value) {
      return put('settings', { key, value });
    },
    async all() {
      const rows = await getAll('settings');
      const o = {};
      rows.forEach((r) => (o[r.key] = r.value));
      return o;
    }
  };

  // Products
  const products = {
    all: () => getAll('products'),
    get: (id) => get('products', id),
    add: (p) => put('products', p),
    update: (p) => put('products', p),
    remove: (id) => del('products', id)
  };

  // Sales
  const sales = {
    all: () => getAll('sales'),
    get: (id) => get('sales', id),
    add: (s) => put('sales', s),
    remove: (id) => del('sales', id),
    clear: () => clear('sales')
  };

  async function exportAll() {
    const [p, s, set] = await Promise.all([getAll('products'), getAll('sales'), getAll('settings')]);
    return {
      meta: { app: 'PocketPOS', version: DB_VERSION, exportedAt: new Date().toISOString() },
      products: p,
      sales: s,
      settings: set.map(({ key, value }) => ({ key, value }))
    };
  }

  async function importAll(data, mode = 'replace') {
    if (mode === 'replace') {
      await Promise.all([clear('products'), clear('sales'), clear('settings')]);
    }
    const ops = [];
    (data.products || []).forEach((p) => ops.push(put('products', p)));
    (data.sales || []).forEach((s) => ops.push(put('sales', s)));
    (data.settings || []).forEach((s) => ops.push(put('settings', s)));
    await Promise.all(ops);
    return { products: (data.products || []).length, sales: (data.sales || []).length };
  }

  async function wipeAll() {
    await Promise.all([clear('products'), clear('sales'), clear('settings')]);
  }

  return { open, products, sales, settings, exportAll, importAll, wipeAll, _raw: { get, getAll, put, del, clear } };
})();
