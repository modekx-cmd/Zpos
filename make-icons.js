// Generates simple PNG icons (192 and 512) without dependencies.
// Uses a pure-JS PNG encoder with zlib from the Node standard library.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32Table() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC_TABLE = crc32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // Add filter byte (0) at start of each row
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const bg = [15, 118, 110, 255];      // teal #0f766e
  const white = [255, 255, 255, 255];
  const paper = [253, 253, 253, 255];
  const dark = [30, 41, 59, 255];      // slate
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = c[3];
  };
  const fillRect = (x0, y0, w, h, c) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c);
  };
  const fillRounded = (x0, y0, w, h, r, c) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const dx = Math.min(x - x0, x0 + w - 1 - x);
        const dy = Math.min(y - y0, y0 + h - 1 - y);
        if (dx < r && dy < r) {
          const ddx = r - 1 - dx, ddy = r - 1 - dy;
          if (ddx * ddx + ddy * ddy > (r - 1) * (r - 1)) continue;
        }
        set(x, y, c);
      }
    }
  };

  // Background
  fillRect(0, 0, size, size, bg);

  // Receipt (white rounded rectangle, centered)
  const rw = Math.round(size * 0.52);
  const rh = Math.round(size * 0.66);
  const rx = Math.round((size - rw) / 2);
  const ry = Math.round((size - rh) / 2);
  const rad = Math.round(size * 0.08);
  fillRounded(rx, ry, rw, rh, rad, paper);

  // Receipt text lines (dark)
  const lineH = Math.round(rh * 0.09);
  const lineGap = Math.round(rh * 0.05);
  let ly = ry + Math.round(rh * 0.14);
  const lines = [
    { x: rx + Math.round(rw * 0.12), w: Math.round(rw * 0.76) },  // title
    { x: rx + Math.round(rw * 0.12), w: Math.round(rw * 0.60) },
    { x: rx + Math.round(rw * 0.12), w: Math.round(rw * 0.66) },
    { x: rx + Math.round(rw * 0.12), w: Math.round(rw * 0.40) },
    { x: rx + Math.round(rw * 0.12), w: Math.round(rw * 0.55) },
    { x: rx + Math.round(rw * 0.12), w: Math.round(rw * 0.70) },  // total
  ];
  lines.forEach((l, i) => {
    const thick = i === 0 ? Math.max(2, Math.round(lineH * 1.1)) : Math.max(2, lineH);
    fillRect(l.x, ly, l.w, thick, i === 0 ? dark : (i === 5 ? dark : [148, 163, 184, 255]));
    ly += lineH + lineGap + (i === 0 ? Math.round(size * 0.03) : 0);
  });

  // Zig-zag bottom of receipt
  const teeth = 8;
  const tw = Math.floor(rw / teeth);
  for (let t = 0; t < teeth; t++) {
    const tx = rx + t * tw;
    fillRect(tx, ry + rh - Math.round(size * 0.02), tw, Math.round(size * 0.02), bg);
  }

  // Coin (gold) bottom-right
  const cr = Math.round(size * 0.11);
  const cx = rx + rw + cr - Math.round(size * 0.06);
  const cy = ry + rh + cr - Math.round(size * 0.06);
  const gold = [234, 179, 8, 255];
  for (let y = -cr; y <= cr; y++)
    for (let x = -cr; x <= cr; x++)
      if (x * x + y * y <= cr * cr) set(cx + x, cy + y, gold);
  // $ sign on coin
  const symThick = Math.max(2, Math.round(cr * 0.28));
  set(cx, cy - cr + symThick, dark);
  fillRect(cx - Math.round(cr * 0.5), cy, cr, symThick, dark);
  fillRect(cx - Math.round(cr * 0.5), cy + Math.round(cr * 0.3), cr, symThick, dark);
  for (let i = -symThick; i <= symThick; i++) {
    set(cx + i, cy - cr + symThick, dark);
    set(cx + i, cy + cr - symThick, dark);
  }

  return makePNG(size, size, buf);
}

const outDir = path.join(__dirname, 'assets');
fs.mkdirSync(outDir, { recursive: true });
[192, 512].forEach((s) => {
  const png = drawIcon(s);
  fs.writeFileSync(path.join(outDir, `icon-${s}.png`), png);
  console.log(`Wrote icon-${s}.png (${png.length} bytes)`);
});
