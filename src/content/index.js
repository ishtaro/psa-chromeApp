(function () {
  "use strict";

  const NO_DATA = "—";

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
    const table = psaExt.findOrdersTable();
    const desired = table ? table.parentElement || table : document.body;
    if (desired === observedTarget && desired.isConnected) return;
    observer.disconnect();
    observer.observe(desired, { childList: true, subtree: true });
    observedTarget = desired;
  }

  reattachObserver();
  schedule();
})();
