function nextAch(s) {
  const t = tally(s); let best = null;
  for (const a of ACH) { const n = t[a[4]]; if (n <= 0 || n >= a[5]) continue; const r = n / a[5], left = a[5] - n; if (!best || r > best.r || (r === best.r && left < best.left)) best = { id: a[0], name: a[1], left, unit: AUNIT[a[4]] || "", r }; }
  return best;
}
