const key = "orbit-history-v1";
export function loadHistory(storage) {
  try {
    const rows = JSON.parse(
      (storage || globalThis.localStorage).getItem(key) || "[]",
    );
    return Array.isArray(rows)
      ? rows.filter(
          (r) =>
            r &&
            typeof r.category === "string" &&
            Number.isFinite(Date.parse(r.endedAt)) &&
            ["score", "hits", "errors", "targets", "seconds"].every(
              (k) => Number.isFinite(r[k]) && r[k] >= 0,
            ) &&
            Array.isArray(r.mistakes) &&
            r.mistakes.every(
              (m) =>
                m &&
                ["word", "expected", "typed"].every(
                  (k) => typeof m[k] === "string",
                ) &&
                Number.isInteger(m.position),
            ),
        )
      : [];
  } catch {
    return [];
  }
}
export function saveHistory(rows, storage) {
  try {
    (storage || globalThis.localStorage).setItem(key, JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}
export function summarize(rows) {
  const total = rows.reduce(
    (a, r) => {
      for (const k of ["score", "hits", "errors", "targets", "seconds"])
        a[k] += r[k];
      return a;
    },
    { score: 0, hits: 0, errors: 0, targets: 0, seconds: 0 },
  );
  return {
    ...total,
    accuracy:
      total.hits + total.errors
        ? Math.round((total.hits / (total.hits + total.errors)) * 100)
        : 0,
    wpm: total.seconds ? Math.round(total.hits / 5 / (total.seconds / 60)) : 0,
  };
}
