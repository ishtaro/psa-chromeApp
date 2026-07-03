window.psaExt = window.psaExt || {};

// background と同じ内容だが、content 側にも持たせて storage 未初期化時のフォールバックに使う。
// 更新時は src/background/tat-hardcoded.js と両方を同期させること。
psaExt.HARDCODED_TAT = {
  "Value": 90,
  "Value Max 40": 40,
  "Value Bulk 120": 120,
  "レギュラー": 60,
  "エクスプレス": 25,
  "スーパー・エクスプレス": 25,
  "ウォーク・スルー": 25,
  "プレミアム1": 25,
  "プレミアム2": 25,
  "プレミアム3": 25,
  "プレミアム5": 25,
  "プレミアム10": 15,
};

// 注文単位で TAT を保存する。キーは注文番号 (orderId)。
// orderId は PSA サイトから取得した文字列のため、プロトタイプ汚染回避のため
// hasOwnProperty ベースで参照し、書き込みは null-prototype オブジェクトへ行う。
psaExt.getUserTat = async function (orderId) {
  if (!orderId) return null;
  try {
    const { userTat } = await chrome.storage.local.get("userTat");
    if (
      userTat &&
      Object.prototype.hasOwnProperty.call(userTat, orderId) &&
      userTat[orderId] != null
    ) {
      return userTat[orderId];
    }
  } catch (err) {
    console.warn("[psa-ext] userTat read failed", err);
  }
  return null;
};

psaExt.setUserTat = async function (orderId, days) {
  if (!orderId) return;
  try {
    const { userTat: stored } = await chrome.storage.local.get("userTat");
    const userTat = Object.assign(Object.create(null), stored || {});
    userTat[orderId] = days;
    await chrome.storage.local.set({ userTat });
  } catch (err) {
    console.warn("[psa-ext] userTat write failed", err);
  }
};

// 優先順: userTat[orderId] → storage.tat[serviceLevel] → HARDCODED_TAT[serviceLevel]
// 同じサービスレベルの他行に影響を与えないよう、ユーザー設定は注文単位で管理する。
psaExt.getTatDays = async function (orderId, serviceLevel) {
  if (orderId) {
    const user = await psaExt.getUserTat(orderId);
    if (user != null) return user;
  }
  if (!serviceLevel) return null;
  try {
    const { tat } = await chrome.storage.local.get("tat");
    if (tat && Object.prototype.hasOwnProperty.call(tat, serviceLevel)) {
      return tat[serviceLevel];
    }
  } catch (err) {
    console.warn("[psa-ext] storage read failed", err);
  }
  return Object.prototype.hasOwnProperty.call(psaExt.HARDCODED_TAT, serviceLevel)
    ? psaExt.HARDCODED_TAT[serviceLevel]
    : null;
};
