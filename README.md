# 🧾 PocketPOS — Offline Point of Sale

A **100% offline-first** Progressive Web App (PWA) for sales, inventory management,
receipts, backups, and analytics. Installable on **both Android and iOS** like a native
app — no app store, no internet, no server required.

![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-blue)
![Offline](https://img.shields.io/badge/offline-100%25-success)
![PWA](https://img.shields.io/badge/PWA-installable-purple)

---

## ✨ Features

| Area | What it does |
|------|-------------|
| 📊 **Dashboard** | Today's revenue/orders, 7-day revenue bar chart, top-products donut, low-stock alerts, recent sales |
| 🛒 **Point of Sale** | Searchable product grid, tap-to-add cart, quantity controls, tax, multi-payment checkout |
| 📦 **Inventory** | Full CRUD for products, stock value, low-stock badges, SKU/category/emoji icons |
| 🧾 **Sales & Receipts** | Filterable history, receipt preview, **print** to any printer, **save as PNG** image |
| 💾 **Backup & Restore** | Export full JSON backup, restore (replace or merge), danger-zone wipe |
| ⚙️ **Settings** | Store name/address/phone, currency symbol + position, tax rate, low-stock threshold, receipt footer |
| 🎨 **Modern UI** | Glassmorphism design, animated aurora gradient, **floating bottom dock** with raised center FAB |

---

## 🚀 Quick start

### Option A — Just open it
Double-click `index.html`. It works, but for full PWA features (install + offline
service worker) you need it served over http(s), not the `file://` protocol.

### Option B — Run a local server (recommended)
Any static server works. Pick one:

```bash
# Node (already installed if you generated icons)
npx serve .
# or
npx http-server -p 8080

# Python
python -m http.server 8080

# PHP
php -S localhost:8080
```

Then visit **http://localhost:8080** in your browser.

---

## 📱 Install as an app (Android & iOS)

### Android (Chrome / Edge)
1. Open the app URL in Chrome
2. Tap the **⋮ menu** → **Add to Home screen** (or tap the **Install** prompt)
3. Launch from your app drawer — it runs fullscreen, offline, like a native app

### iOS (Safari — required for install)
1. Open the app URL in **Safari** (Chrome/Edge on iOS *cannot* install PWAs)
2. Tap the **Share** icon → **Add to Home Screen**
3. Launch from the home screen — it runs fullscreen, offline

> Once installed, it works **completely offline** — no internet needed ever again.

---

## 🖨️ Printing & saving receipts

From **Sales & Receipts** → tap any sale:
- **🖨️ Print** — opens the system print dialog (works with any AirPrint / Wi-Fi printer, or "Save as PDF")
- **⬇️ Save PNG** — downloads a receipt image to your device

To set up a thermal/Bluetooth receipt printer, use your phone's system print dialog
to select it — PocketPOS uses standard browser printing, so any printer your phone
knows about works.

---

## 💾 Backup strategy

1. Go to **Backup & Restore**
2. **Download Backup (.json)** — saves a timestamped file to your device
3. Move it to cloud storage (Google Drive, iCloud, etc.) for safekeeping
4. To restore on a new device: **Replace All** or **Merge**, then pick the file

**Tip:** Export a backup daily or weekly depending on your sales volume. The file is
tiny (a few KB) and contains everything.

---

## 🏗️ Architecture

```
pos-app/
├── index.html              # App shell + screen mount point
├── manifest.json           # PWA manifest (install metadata)
├── sw.js                   # Service worker (offline caching)
├── css/styles.css          # Glassmorphism UI, floating dock, charts
├── make-icons.js           # PNG icon generator (run once)
├── assets/
│   ├── icon-192.png        # App icon (home screen)
│   └── icon-512.png        # App icon (high-res / maskable)
└── js/
    ├── db.js               # IndexedDB wrapper (products, sales, settings)
    ├── state.js            # Global state: settings cache + cart + events
    ├── format.js           # Money/date/ID formatting
    ├── charts.js           # Dependency-free SVG bar + donut charts
    ├── receipt.js          # Receipt HTML, print, save-as-PNG
    ├── app.js              # Router, dock, sheets, modal, toast, seeding
    └── screens/
        ├── dashboard.js    # Analytics overview
        ├── pos.js          # Product grid + cart + checkout
        ├── inventory.js    # Product CRUD + stock
        ├── sales.js        # History + receipts
        ├── backup.js       # Export/import/wipe
        └── settings.js     # Store config
```

**Zero dependencies.** No build step, no npm install, no frameworks. Pure HTML/CSS/JS
that runs in any modern browser. Data lives in **IndexedDB** on the device — private,
never sent anywhere.

---

## 🔧 Regenerate icons

```bash
node make-icons.js
```

This writes `assets/icon-192.png` and `assets/icon-512.png` using a dependency-free
PNG encoder. Edit `make-icons.js` to change the design.

---

## 🌐 Deploy to the web (optional)

The app works offline forever once installed, but hosting it lets you (or others)
install it in the first place. Any static host works:

- **GitHub Pages** — push to a repo, enable Pages
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder
- **Your own server** — copy the files to any web root

> ⚠️ Service workers require **HTTPS** (or localhost). All the hosts above provide
> HTTPS by default.

---

## ❓ FAQ

**Where is my data stored?**
In your device's browser storage (IndexedDB). It never leaves your phone. Clearing
browser data or "site data" will erase it — export a backup first.

**Does it sync between devices?**
No — by design it's fully offline and local. Use Backup & Restore to move data
between devices manually.

**Does it work on desktop?**
Yes — open the URL in any browser. The layout adapts to wider screens.

**How do I change currency / tax?**
Settings → Currency & Tax. Changes apply immediately to new sales.

---

Built as a single self-contained PWA. Enjoy! 🎉
