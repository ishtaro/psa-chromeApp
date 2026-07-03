import { HARDCODED_JP_HOLIDAYS } from "./holidays-hardcoded.js";

const CSV_URL = "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv";

// 内閣府 CSV は Shift_JIS。1 行目はヘッダ、以降は "YYYY/M/D,名称" 形式。
export function parseHolidaysCsv(text) {
  const dates = [];
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const dateStr = line.split(",")[0];
    const m = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!m) continue;
    const y = m[1];
    const mo = String(Number(m[2])).padStart(2, "0");
    const d = String(Number(m[3])).padStart(2, "0");
    dates.push(`${y}-${mo}-${d}`);
  }
  return dates;
}

export async function fetchAndStoreHolidays() {
  let holidays = [...HARDCODED_JP_HOLIDAYS];
  try {
    const res = await fetch(CSV_URL, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("shift_jis").decode(buf);
    const parsed = parseHolidaysCsv(text);
    if (parsed.length > 0) holidays = parsed;
  } catch (err) {
    console.warn("[psa-ext] holidays fetch failed, using hardcoded", err);
  }
  await chrome.storage.local.set({
    holidays,
    holidaysUpdatedAt: Date.now(),
  });
}
