const playedDays = (s) => new Set([...Object.keys(s.days), ...Object.keys(s.adays)]).size;
