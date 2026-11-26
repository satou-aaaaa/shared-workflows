const achGot = (s) => { const t = tally(s); return ACH.filter((a) => t[a[4]] >= a[5]).map((a) => a[0]); };
