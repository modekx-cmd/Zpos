/* ============================================================
   state.js — Global app state (settings cache, cart, emitter)
   ============================================================ */
const State = (() => {
  const settings = {
    storeName: 'My Store',
    currency: '$',
    currencyPosition: 'before',   // before | after
    taxRate: 0,                   // percent
    lowStockThreshold: 5,
    receiptFooter: 'Thank you for your business!',
    receiptAddress: '',
    receiptPhone: '',
    nextReceiptNo: 1,
    language: 'en',
    exchangeRate: 89000           // 1 USD = 89000 LBP
  };
  let cart = []; // [{ id, name, price, priceCurrency, qty, stock }]
  const listeners = {};

  function loadSettings() {
    return DB.settings.all().then((rows) => {
      Object.assign(settings, rows);
      return settings;
    });
  }
  async function save() { await DB.settings.set('storeName', settings.storeName); }

  async function update(partial) {
    Object.assign(settings, partial);
    await Promise.all(Object.keys(partial).map((k) => DB.settings.set(k, partial[k])));
    emit('settings', settings);
  }

  // Cart
  function getCart() { return cart; }
  function addToCart(product) {
    const existing = cart.find((c) => c.id === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + 1, product.stock || 9999);
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        priceCurrency: product.priceCurrency || 'USD',
        qty: 1,
        stock: product.stock
      });
    }
    emit('cart', cart);
  }
  function setQty(id, qty) {
    const it = cart.find((c) => c.id === id);
    if (!it) return;
    it.qty = Math.max(0, Math.min(qty, it.stock || 9999));
    if (it.qty === 0) cart = cart.filter((c) => c.id !== id);
    emit('cart', cart);
  }
  function inc(id) { const it = cart.find((c) => c.id === id); if (it) setQty(id, it.qty + 1); }
  function dec(id) { const it = cart.find((c) => c.id === id); if (it) setQty(id, it.qty - 1); }
  function setPrice(id, price) {
    const it = cart.find((c) => c.id === id);
    if (!it) return;
    it.price = Math.max(0, parseFloat(price) || 0);
    emit('cart', cart);
  }
  function clearCart() { cart = []; emit('cart', cart); }
  function cartCount() { return cart.reduce((s, c) => s + c.qty, 0); }
  function cartSubtotal() { return cart.reduce((s, c) => s + c.price * c.qty, 0); }
  function cartTax() { return cartSubtotal() * (Number(settings.taxRate) || 0) / 100; }
  function cartTotal() { return cartSubtotal() + cartTax(); }

  // Emitter
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, data) { (listeners[evt] || []).forEach((fn) => fn(data)); }

  return {
    settings,
    loadSettings, update,
    getCart, addToCart, setQty, setPrice, inc, dec, clearCart,
    cartCount, cartSubtotal, cartTax, cartTotal,
    on, emit
  };
})();
