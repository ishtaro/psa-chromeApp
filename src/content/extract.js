window.psaExt = window.psaExt || {};

// myorders の 1 行 (tr) からサービスレベル名と PSA 到着日を取り出す。
// 行構造が注文行の形をしていない場合（「ご注文がありません」等の colspan メッセージ行、
// DOM 変更）は null を返し、その行にはセルを一切追加しない。
// 注文行の形はしているが到着日のパースに失敗した場合は arrivalDate: null で返し、
// 呼び出し側は「—」を表示する（SPEC §5）。
psaExt.extractRow = function (tr) {
  // 1 列目 (オーダー / サービスレベル) 内の最初の <p> がサービスレベル名。
  // class="mb-0.5" は "." を含むため CSS セレクタで直接指定するとパースエラーになる。
  // 代わりに「最初の p」で拾う。
  const nameEl = tr.querySelector("td:nth-child(1) p");
  const arrivalEl = tr.querySelector("td:nth-child(4) p");
  if (!nameEl || !arrivalEl) return null;

  const serviceLevel = nameEl.textContent.trim();
  if (!serviceLevel) return null;
  const arrivalDate = psaExt.parseArrivalDate(arrivalEl.textContent.trim());

  // 注文番号: href="/ja-JP/myaccount/myorders/<申込>/<注文番号>" の末尾。
  // テキストとしても表示されているが、DOM 位置に依存するのを避け href から抽出する。
  const orderLink = tr.querySelector(
    'td:nth-child(1) a[href*="/myaccount/myorders/"]'
  );
  const href = orderLink?.getAttribute("href") || "";
  const orderId = href.split("/").filter(Boolean).pop() || null;

  return { serviceLevel, arrivalDate, orderId };
};

// 「到着」列を持つテーブルだけを対象にする。DOM 変化に対する安全弁。
psaExt.findOrdersTable = function (root) {
  const tables = (root || document).querySelectorAll("table");
  for (const table of tables) {
    const ths = table.querySelectorAll("thead th");
    for (const th of ths) {
      if (th.textContent.trim() === "到着") return table;
    }
  }
  return null;
};
