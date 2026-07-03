// content script は複数 .js を manifest.json で列挙して同一グローバルスコープに載せる方式。
// 名前空間衝突を避けるため window.psaExt に集約する。
window.psaExt = window.psaExt || {};

// "YYYY年M月D日" → Date | null
psaExt.parseArrivalDate = function (text) {
  if (!text) return null;
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

// Date → "YYYY-MM-DD" (ローカルタイム基準)
psaExt.formatDateKey = function (date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// 土日と祝日 (holidaySet) を除いた営業日を加算する。
// holidaySet 省略時は土日のみ除外。
psaExt.addBusinessDays = function (date, days, holidaySet) {
  const holidays = holidaySet || new Set();
  const d = new Date(date.getTime());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    if (holidays.has(psaExt.formatDateKey(d))) continue;
    added++;
  }
  return d;
};

psaExt.formatJa = function (date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

psaExt.computeReturnDate = function ({ arrivalDate, tatDays, holidaySet }) {
  return psaExt.addBusinessDays(arrivalDate, tatDays, holidaySet);
};
