import { HARDCODED_TAT } from "./tat-hardcoded.js";

const SERVICES_URL = "https://www.psacard.com/ja-JP/services";

// /services ページ HTML からサービスレベル → TAT (営業日) を抽出する。
// DOM 順で「サービスレベル名 → 直後の 予定納期：」を素朴に紐付ける。
// 変更に弱い実装だが、失敗時はハードコード辞書へフォールバックするので致命的ではない。
export function parseTatFromHtml(html) {
  const result = {};
  const nameRegex = /<div class="text-subtitle2 text-secondary">([^<]+)<\/div>/g;
  const tatRegex = /予定納期：<span[^>]*>(\d+)営業日<\/span>/g;

  const names = [];
  let m;
  while ((m = nameRegex.exec(html))) {
    names.push({ pos: m.index, name: m[1] });
  }
  const tats = [];
  while ((m = tatRegex.exec(html))) {
    tats.push({ pos: m.index, days: Number(m[1]) });
  }

  for (let i = 0; i < names.length; i++) {
    const start = names[i].pos;
    const end = i + 1 < names.length ? names[i + 1].pos : Infinity;
    const tat = tats.find((t) => t.pos > start && t.pos < end);
    if (tat) result[names[i].name] = tat.days;
  }
  return result;
}

export async function fetchAndStoreTat() {
  const merged = { ...HARDCODED_TAT };
  try {
    const res = await fetch(SERVICES_URL, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const parsed = parseTatFromHtml(html);
    Object.assign(merged, parsed);
  } catch (err) {
    console.warn("[psa-ext] TAT fetch failed, using hardcoded", err);
  }
  await chrome.storage.local.set({
    tat: merged,
    tatUpdatedAt: Date.now(),
  });
}
