/* ============================================================
   charts.js — Dependency-free SVG charts (bar + donut)
   ============================================================ */
const Charts = (() => {
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  function bar(data, opts = {}) {
    // data: [{ label, value }]
    const W = opts.width || 320, H = opts.height || 160, pad = 6;
    const max = Math.max(1, ...data.map((d) => d.value));
    const n = data.length || 1;
    const bw = (W - pad * 2) / n;
    let bars = '';
    data.forEach((d, i) => {
      const bh = max > 0 ? (d.value / max) * (H - 28) : 0;
      const x = pad + i * bw + bw * 0.18;
      const w = bw * 0.64;
      const y = H - 18 - bh;
      bars += `<g class="bar-g">
        <rect x="${x}" y="${y}" width="${w}" height="${bh}" rx="${Math.min(7, w/2)}" fill="url(#barGrad)"/>
        <text x="${x + w/2}" y="${y - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.85)">${shortNum(d.value)}</text>
        <text x="${x + w/2}" y="${H - 5}" text-anchor="middle" font-size="9.5" fill="rgba(255,255,255,0.7)" font-weight="600">${d.label}</text>
      </g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-height:${H}px">
      <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c4b5fd"/><stop offset="1" stop-color="#6366f1"/>
      </linearGradient></defs>${bars}</svg>`;
  }

  function donut(data, opts = {}) {
    // data: [{ label, value, color? }]
    const size = opts.size || 140, r = size / 2 - 14, cx = size/2, cy = size/2, inner = r * 0.62;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let acc = 0, slices = '';
    data.forEach((d, i) => {
      const frac = d.value / total;
      if (frac <= 0) return;
      const a0 = acc * 2 * Math.PI - Math.PI / 2;
      acc += frac;
      const a1 = acc * 2 * Math.PI - Math.PI / 2;
      const large = frac > 0.5 ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const xi1 = cx + inner * Math.cos(a1), yi1 = cy + inner * Math.sin(a1);
      const xi0 = cx + inner * Math.cos(a0), yi0 = cy + inner * Math.sin(a0);
      const color = d.color || COLORS[i % COLORS.length];
      slices += `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z" fill="${color}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>`;
    });
    const center = opts.centerLabel || shortNum(total);
    const centerSub = opts.centerSub || 'total';
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      ${slices}
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">${center}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.65)" font-weight="600">${centerSub}</text>
    </svg>`;
  }

  function legend(data) {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    return data.map((d, i) => {
      const color = d.color || COLORS[i % COLORS.length];
      const pct = ((d.value / total) * 100).toFixed(0);
      return `<div class="legend-item">
        <span class="legend-dot" style="background:${color}"></span>
        <span>${d.label}</span>
        <span class="legend-val">${pct}%</span>
      </div>`;
    }).join('');
  }

  function sparkline(values, opts = {}) {
    const W = opts.width || 100, H = opts.height || 30;
    const max = Math.max(1, ...values), min = Math.min(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? W / (values.length - 1) : W;
    const pts = values.map((v, i) => `${(i*step).toFixed(1)},${(H - ((v-min)/range)*H).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none">
      <polyline points="${pts}" fill="none" stroke="#a5b4fc" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

  function shortNum(n) {
    n = Number(n) || 0;
    if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1) + 'k';
    return n.toFixed(0);
  }

  return { bar, donut, legend, sparkline, COLORS };
})();
