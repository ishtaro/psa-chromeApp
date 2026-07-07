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

// 到着日（当日）を 1 営業日目として数え、days 営業日目に当たる日を返す（当日含む）。
// 当日が土日祝の場合は、それ以降の最初の営業日が 1 日目になる。
// 土日と祝日 (holidaySet) を除外。holidaySet 省略時は土日のみ除外。
psaExt.addBusinessDays = function (date, days, holidaySet) {
  const holidays = holidaySet || new Set();
  const d = new Date(date.getTime());
  if (days <= 0) return d;

  const isBusinessDay = (x) => {
    const dow = x.getDay();
    return dow !== 0 && dow !== 6 && !holidays.has(psaExt.formatDateKey(x));
  };

  let count = 0;
  // 当日から数え始め、days 営業日目に到達したその日を返す。
  while (true) {
    if (isBusinessDay(d)) {
      count++;
      if (count >= days) break;
    }
    d.setDate(d.getDate() + 1);
  }
  return d;
};

psaExt.formatJa = function (date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

psaExt.computeReturnDate = function ({ arrivalDate, tatDays, holidaySet }) {
  return psaExt.addBusinessDays(arrivalDate, tatDays, holidaySet);
};
