function lateDays(s, k = todayKey()) { const out = []; let d = k; for (let i = 0; i < LATE; i++) { d = prevDay(d); if (d < EPOCH) break; if (!s.days[d] && !s.adays[d]) out.push(d); } return out; }
