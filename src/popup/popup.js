// 拡張機能の ON/OFF トグル。状態は chrome.storage.local に保存する。
// content script 側は storage 変更を購読して即時に有効/無効化する。

const STORAGE_KEY = "enabled";
const DEFAULT_ENABLED = false;

const checkbox = document.getElementById("psa-ext-enabled");
const status = document.getElementById("psa-ext-status");

function showStatus(text) {
  if (!status) return;
  status.textContent = text;
  status.hidden = false;
  setTimeout(() => {
    status.hidden = true;
  }, 1500);
}

async function loadState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const enabled = result[STORAGE_KEY];
  checkbox.checked = enabled === undefined ? DEFAULT_ENABLED : Boolean(enabled);
}

async function saveState(enabled) {
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  showStatus(enabled ? "有効化しました" : "無効化しました");
}

checkbox.addEventListener("change", () => {
  saveState(checkbox.checked).catch((err) => {
    console.warn("[psa-ext] popup save failed", err);
  });
});

loadState().catch((err) => {
  console.warn("[psa-ext] popup load failed", err);
});
