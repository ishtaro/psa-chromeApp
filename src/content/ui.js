window.psaExt = window.psaExt || {};

const TH_CLASS = "psa-ext-th";
const TD_CLASS = "psa-ext-td";
const TAT_TH_CLASS = "psa-ext-tat-th";
const TAT_TD_CLASS = "psa-ext-tat-td";
const SELECT_CLASS = "psa-ext-tat-select";
const ROUNDED_TR = "rounded-tr-2xl";
// 追加列でテーブル幅が枠を超えたとき、枠側に横スクロールを付与するためのマーカー。
const SCROLL_CLASS = "psa-ext-scroll-x";
// scroll-hint を二重初期化しないためのフラグ属性名（dataset キー）。
const SCROLLHINT_FLAG = "psaExtScrollhint";

// 手入力を許可する営業日候補。
const TAT_OPTIONS = [10, 15, 20, 25, 30, 40, 45, 60, 75, 90, 120, 150, 160];

// テーブルヘッダーに「返却予定日」列を 1 度だけ追加する。
// 既存の最後の <th> が持つ右上角丸クラスを新規列に移して、見た目を維持する。
psaExt.ensureHeaderColumn = function (table) {
  const headRow = table.querySelector("thead tr");
  if (!headRow) return false;
  if (headRow.querySelector(`th.${TH_CLASS}`)) return true;

  const th = document.createElement("th");
  th.className = `${TH_CLASS} px-6 py-3`;
  th.textContent = "返却予定日";

  const previouslyLast = headRow.querySelector("th:last-child");
  if (previouslyLast && previouslyLast.classList.contains(ROUNDED_TR)) {
    previouslyLast.classList.remove(ROUNDED_TR);
    th.classList.add(ROUNDED_TR);
  }
  headRow.appendChild(th);
  return true;
};

// テーブルヘッダーに「TAT (営業日)」列を返却予定日の直前に 1 度だけ追加する。
psaExt.ensureTatHeaderColumn = function (table) {
  const headRow = table.querySelector("thead tr");
  if (!headRow) return;
  if (headRow.querySelector(`th.${TAT_TH_CLASS}`)) return;

  const th = document.createElement("th");
  th.className = `${TAT_TH_CLASS} px-6 py-3`;
  th.textContent = "TAT (営業日)";

  const returnTh = headRow.querySelector(`th.${TH_CLASS}`);
  if (returnTh) {
    returnTh.before(th);
  } else {
    headRow.appendChild(th);
  }
};

// 角丸ボーダーを持つテーブル枠（table の親）に横スクロールを付与する。
// 拡張が列を追加するとテーブル幅が枠幅を超え、角丸ボーダーが本文を突き抜けて
// 崩れる。枠側を overflow-x: auto にしてテーブルを内側へ収める。
// 既存 class は変更せず、名前空間クラスの付与のみで行う（clearAll で撤去）。
psaExt.ensureScrollContainer = function (table) {
  const wrap = table.parentElement;
  if (wrap && !wrap.classList.contains(SCROLL_CLASS)) {
    wrap.classList.add(SCROLL_CLASS);
  }
};

// 横スクロール可能なことを scroll-hint ライブラリで示す。
// はみ出し判定・アイコン表示/消去・リサイズ追従はライブラリが行う。
// 二重初期化（アイコン重複・リスナー多重登録）を避けるため一度だけ適用する。
// ライブラリ未ロードや初期化失敗時は静かに諦める（フェイルセーフ）。
psaExt.ensureScrollHint = function (table) {
  const wrap = table.parentElement;
  if (!wrap) return;
  if (typeof window.ScrollHint !== "function") return;
  if (wrap.dataset[SCROLLHINT_FLAG] === "1") return;
  try {
    // suggestiveShadow: 左右端に全高シャドウを出し、ページ上部でもスクロール可否を示す。
    new window.ScrollHint(wrap, {
      suggestiveShadow: true,
      i18n: { scrollable: "スクロールできます" },
    });
    wrap.dataset[SCROLLHINT_FLAG] = "1";
  } catch (err) {
    console.warn("[psa-ext] scroll-hint init failed", err);
  }
};

// 各行に返却予定日セルを 1 つ追加／更新する。
psaExt.renderRow = function (tr, text) {
  let td = tr.querySelector(`td.${TD_CLASS}`);
  if (!td) {
    td = document.createElement("td");
    td.className = `${TD_CLASS} px-6 py-5 whitespace-nowrap xl:pr-8`;
    const p = document.createElement("p");
    td.appendChild(p);
    tr.appendChild(td);
  }
  const p = td.querySelector("p");
  p.textContent = text;
};

// TAT セルを描画する。全行でプルダウン編集可能。
// 選択は当該行の注文 (orderId) のみに反映され、同じサービスレベルの他行は影響を受けない。
psaExt.renderTatCell = function (tr, orderId, currentDays) {
  let td = tr.querySelector(`td.${TAT_TD_CLASS}`);
  if (!td) {
    td = document.createElement("td");
    td.className = `${TAT_TD_CLASS} px-6 py-5 whitespace-nowrap`;
    // TAT セル領域 (プルダウン周りの padding 含む) をクリックしても
    // 行遷移が発火しないよう、td でもクリック伝播を止める。
    td.addEventListener("click", (e) => e.stopPropagation());
    td.addEventListener("mousedown", (e) => e.stopPropagation());
    const returnTd = tr.querySelector(`td.${TD_CLASS}`);
    if (returnTd) {
      returnTd.before(td);
    } else {
      tr.appendChild(td);
    }
  }

  const values = new Set(TAT_OPTIONS.map(String));
  if (currentDays != null) values.add(String(currentDays));
  const sortedValues = [...values].sort((a, b) => Number(a) - Number(b));

  let select = td.querySelector(`select.${SELECT_CLASS}`);
  if (!select) {
    td.textContent = "";
    select = document.createElement("select");
    select.className = SELECT_CLASS;
    // 行クリックが注文詳細ページへの遷移を発火するため、プルダウン操作は伝播させない。
    const stop = (e) => e.stopPropagation();
    select.addEventListener("click", stop);
    select.addEventListener("mousedown", stop);
    select.addEventListener("mouseup", stop);
    select.addEventListener("keydown", stop);
    select.addEventListener("keyup", stop);
    select.addEventListener("focus", stop);
    select.addEventListener("change", async (e) => {
      e.stopPropagation();
      const v = Number(select.value);
      if (!Number.isFinite(v) || v <= 0) return;
      // 変更時点の dataset.orderId を参照する。行順が入れ替わっても影響を受けない。
      const currentOrderId = select.dataset.orderId;
      if (!currentOrderId) return;
      await psaExt.setUserTat(currentOrderId, v);
      if (typeof psaExt.process === "function") psaExt.process();
    });
    td.appendChild(select);
  }

  // 注文単位で保存するためのキー。fixed でなく都度更新（行が並び替えられる可能性を考慮）。
  select.dataset.orderId = orderId || "";

  // options を差分ではなく毎回作り直す（頻繁でないので単純化）。
  const targetVal = currentDays != null ? String(currentDays) : "";
  select.textContent = "";
  const nullOpt = document.createElement("option");
  nullOpt.value = "";
  nullOpt.textContent = "— 選択 —";
  nullOpt.selected = targetVal === "";
  select.appendChild(nullOpt);
  for (const v of sortedValues) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    opt.selected = v === targetVal;
    select.appendChild(opt);
  }
};

// フェイルセーフ用: 拡張が挿入した要素を一括削除する。
psaExt.clearAll = function (root) {
  const scope = root || document;
  // scroll-hint（ライブラリに destroy がないため手動で撤去）を元に戻す。
  scope
    .querySelectorAll('[data-psa-ext-scrollhint="1"]')
    .forEach((wrap) => {
      const shadowWrap = wrap.closest(".scroll-hint-shadow-wrap");
      const iconWrap = wrap.querySelector(":scope > .scroll-hint-icon-wrap");
      if (iconWrap) iconWrap.remove();
      wrap.classList.remove(
        "scroll-hint",
        "is-scrollable",
        "is-right-scrollable",
        "is-left-scrollable"
      );
      // ライブラリが付けた inline style を消す。
      wrap.style.position = "";
      wrap.style.overflow = "";
      wrap.style.webkitOverflowScrolling = "";
      delete wrap.dataset[SCROLLHINT_FLAG];
      // suggestiveShadow のラッパを外して元の親子関係へ戻す。
      if (shadowWrap && shadowWrap.parentNode) {
        shadowWrap.parentNode.insertBefore(wrap, shadowWrap);
        shadowWrap.remove();
      }
    });
  // 付与した横スクロール用マーカーを外す（既存枠を元の状態へ戻す）。
  scope.querySelectorAll(`.${SCROLL_CLASS}`).forEach((el) => {
    el.classList.remove(SCROLL_CLASS);
  });
  scope
    .querySelectorAll(
      `.${TH_CLASS}, .${TD_CLASS}, .${TAT_TH_CLASS}, .${TAT_TD_CLASS}`
    )
    .forEach((el) => {
      if (el.tagName === "TH" && el.classList.contains(ROUNDED_TR)) {
        const headRow = el.closest("tr");
        const siblings = headRow ? headRow.querySelectorAll("th") : [];
        const prev = siblings[siblings.length - 2];
        if (prev) prev.classList.add(ROUNDED_TR);
      }
      el.remove();
    });
};
