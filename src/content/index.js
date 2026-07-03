(function () {
  "use strict";

  const NO_DATA = "—";
  const STORAGE_KEY = "enabled";
  // 未設定時は無効扱い（opt-in）。popup 側の DEFAULT_ENABLED と一致させる。
  let enabled = false;

  async function processRow(tr, holidaySet) {
    const data = psaExt.extractRow(tr);
    if (!data) {
      psaExt.renderTatCell(tr, null, null);
      psaExt.renderRow(tr, NO_DATA);
      return;
    }

    const tatDays = await psaExt.getTatDays(data.orderId, data.serviceLevel);
    psaExt.renderTatCell(tr, data.orderId, tatDays);

    if (tatDays == null) {
      psaExt.renderRow(tr, NO_DATA);
      return;
    }
    const returnDate = psaExt.computeReturnDate({
      arrivalDate: data.arrivalDate,
      tatDays,
      holidaySet,
    });
    psaExt.renderRow(tr, psaExt.formatJa(returnDate));
  }

  async function processTable(table, holidaySet) {
    psaExt.ensureTatHeaderColumn(table);
    if (!psaExt.ensureHeaderColumn(table)) return;
    const rows = table.querySelectorAll("tbody tr");
    for (const tr of rows) {
      try {
        await processRow(tr, holidaySet);
      } catch (err) {
        console.warn("[psa-ext] row render failed", err);
      }
    }
  }

  async function process() {
    if (!enabled) return;
    const table = psaExt.findOrdersTable();
    if (!table) return;
    const holidaySet = await psaExt.getHolidaySet();
    await processTable(table, holidaySet);
  }

  // TAT プルダウン変更時などに ui.js から呼び戻せるよう露出する。
  psaExt.process = process;

  // 短時間の連続 mutation をまとめて 1 回実行する。
  let scheduled = false;
  function schedule() {
    if (!enabled) return;
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      process()
        .then(reattachObserver)
        .catch((err) => console.warn("[psa-ext] process failed", err));
    }, 100);
  }

  const observer = new MutationObserver(() => schedule());
  let observedTarget = null;

  // 監視範囲は「テーブルが載っているコンテナ」に絞る。
  // テーブル未発見時は body に広げ、SPA 再描画でテーブルが差し替わっても追従する。
  function reattachObserver() {
    if (!enabled) return;
    const table = psaExt.findOrdersTable();
    const desired = table ? table.parentElement || table : document.body;
    if (desired === observedTarget && desired.isConnected) return;
    observer.disconnect();
    observer.observe(desired, { childList: true, subtree: true });
    observedTarget = desired;
  }

  // 拡張を停止する: observer 切断 + 追加した DOM 要素を全撤去。
  function stopExtension() {
    observer.disconnect();
    observedTarget = null;
    if (typeof psaExt.clearAll === "function") psaExt.clearAll();
  }

  // 拡張を起動する: observer 接続 + 初回スキャン実行。
  function startExtension() {
    reattachObserver();
    schedule();
  }

  // popup 側で ON/OFF 切替時に即時反映する。
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(STORAGE_KEY in changes)) return;
    // 明示的に true が入ったときだけ有効化。undefined / false は無効。
    const next = changes[STORAGE_KEY].newValue === true;
    if (next === enabled) return;
    enabled = next;
    if (enabled) startExtension();
    else stopExtension();
  });

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    enabled = result[STORAGE_KEY] === true;
    if (enabled) startExtension();
  });
})();
