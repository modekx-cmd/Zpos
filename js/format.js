/* ============================================================
   format.js — Money/date/number formatting helpers
   ============================================================ */
const FMT = (() => {
  function usd(n) {
    const num = (Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    return '$' + num;
  }

  function lbp(n) {
    const num = Math.round(Number(n) || 0).toLocaleString(undefined);
    return num + ' LBP';
  }

  function money(n, currency) {
    const s = State.settings;
    const cur = currency || s.currency || '$';
    const rate = Number(s.exchangeRate) || 89000;
    if (cur === 'LBP') {
      const lbpVal = Math.round((Number(n) || 0) * rate);
      return lbpVal.toLocaleString() + ' LBP';
    }
    const num = (Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    return '$' + num;
  }

  function dualPrice(usdAmount, currency) {
    const s = State.settings;
    const rate = Number(s.exchangeRate) || 89000;
    const amt = Number(usdAmount) || 0;
    if (currency === 'LBP') {
      const converted = Math.round(amt / rate * rate);
      return `${lbp(amt)}  •  ${usd(amt / rate)}`;
    }
    return `${usd(amt)}  •  ${lbp(amt * rate)}`;
  }

  function num(n) {
    return (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  function date(d) {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function time(d) {
    const dt = new Date(d);
    return dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  function dateTime(d) { return `${date(d)} · ${time(d)}`; }
  function relTime(d) {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return date(d);
  }
  function uid(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  return { money, dualPrice, usd, lbp, num, date, time, dateTime, relTime, uid };
})();
