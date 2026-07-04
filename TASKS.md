# TASKS.md — 実装タスク一覧（2026-07-02 改訂）

`SPEC.md` を実現するための作業。上から順に進める。完了したら `[x]` に更新する。

## フェーズ 0: 準備

- [x] リポジトリ初期化（`git init`、`README.md`）
- [x] `CLAUDE.md` / `SPEC.md` / `TASKS.md` の作成
- [x] `fixtures/jp/myorders.html`、`fixtures/jp/services.html` の取得
- [x] `.gitignore` の追加（`.DS_Store`, `node_modules/`, `dist/`, `*.zip`）
- [x] `develop` ブランチの作成（PR マージ先）

## フェーズ 1: 実サイト調査（完了）

- [x] 対象ページ URL: `https://www.psacard.com/ja-JP/myaccount/myorders`
- [x] TAT 参照 URL: `https://www.psacard.com/ja-JP/services`
- [x] myorders テーブルのセレクタ特定（サービスレベル・進捗・到着日）
- [x] services ページの TAT セレクタ特定
- [x] 現行プラン一覧と TAT の把握
- [x] 停止プランの TAT ヒアリング（Value 90 / Value Max 40 = 60 / Value Bulk 120 = 120 営業日）
- [x] 挿入位置決定: テーブル 5 列目「返却予定日」を追加

## フェーズ 2: 拡張機能の骨組み

- [x] `manifest.json`（Manifest V3）作成
  - `name`: "PSA 返却予定日ヘルパー"
  - `version`: "0.1.0"
  - `permissions`: `["storage", "alarms"]`
  - `host_permissions`: `["https://www.psacard.com/ja-JP/*"]`
  - `content_scripts`:
    - `matches`: `["https://www.psacard.com/ja-JP/myaccount/myorders*"]`
    - `js`: `["src/content/index.js"]`
    - `css`: `["src/styles/overlay.css"]`
    - `run_at`: `"document_idle"`
  - `background`:
    - `service_worker`: `"src/background/index.js"`
    - `type`: `"module"`
- [x] `icons/16.png`, `48.png`, `128.png` プレースホルダ配置
- [x] `src/styles/overlay.css` に `psa-ext-` プレフィックスで基本スタイル定義

## フェーズ 3: TAT 辞書

- [x] `src/background/tat-hardcoded.js` 作成（停止プラン + フォールバック）
- [x] `src/background/tat-fetcher.js` 作成
  - `fetch('https://www.psacard.com/ja-JP/services', { credentials: 'omit' })`
  - HTML パース: `div.text-subtitle2.text-secondary` を全走査、対応する `予定納期：<span>` を紐付け
  - `chrome.storage.local` に `{ tat: {...}, updatedAt: number }` 形式で保存
- [x] `src/background/index.js`
  - `chrome.runtime.onInstalled` で初回 fetch
  - `chrome.alarms.create('refresh-tat', { periodInMinutes: 60 * 24 })` で日次更新
  - `alarms.onAlarm` で TAT 再取得
- [x] fetch 失敗時はハードコード値のみでも動作継続

## フェーズ 4: content script 実装

- [x] `src/content/extract.js`
  - `parseArrivalDate(text)`: `YYYY年M月D日` → `Date`
  - `extractRow(tr)`: `{ serviceLevel, arrivalDate }` を返す
- [x] `src/content/calculator.js`
  - `addBusinessDays(date, n)`: 土日スキップ
  - `computeReturnDate({ arrivalDate, tatDays })`
  - `formatJa(date)`: `YYYY年M月D日` に整形
- [x] `src/content/tat-store.js`
  - `getTat(serviceLevel)`: `chrome.storage.local` → 見つからなければハードコード辞書へフォールバック
- [x] `src/content/ui.js`
  - `ensureHeaderColumn()`: `<thead>` に `<th class="psa-ext-th">返却予定日</th>` を 1 度だけ追加
  - `renderRow(tr, returnDate)`: 各 `<tr>` に `<td class="psa-ext-td">` を追加、既存があれば更新
  - `clearAll()`: 拡張が挿入した要素の一括削除（フェイルセーフ）
- [x] `src/content/index.js`
  - myorders テーブル出現待ち
  - 全行に対して抽出→計算→描画
  - `MutationObserver` でテーブル更新に追従

## フェーズ 5: 動作確認

- [ ] Chrome の「パッケージ化されていない拡張機能を読み込む」で読み込み
- [ ] `myorders` に返却予定日列が追加されることを確認
- [ ] 停止プラン（Value 系）で正しい TAT が使われることを確認
- [ ] 現行プランで `/services` から TAT が取れることを確認
- [ ] `/services` fetch 失敗時にフォールバック値で動作することを確認
- [ ] テーブル操作（ソート・ページ切替）後も追従することを確認
- [ ] 既存 UI の見た目・動作に影響が出ないことの目視確認

## フェーズ 6: リリース準備

- [x] `README.md` に導入手順、開発手順、動作確認手順を追記
- [ ] バージョン `0.1.0` タグ付け
- [x] `dist/psa-ext-0.1.0.zip` パッケージ生成

## v0.2: 拡張機能 ON/OFF トグル

SPEC.md §13.1 参照。v0.1 リリース後にマージ予定（現在 `feat/popup-onoff-toggle` ブランチで実装済み）。

- [x] `src/popup/index.html` 作成（トグル UI）
- [x] `src/popup/popup.css` 作成（`psa-ext-popup__*` プレフィックス）
- [x] `src/popup/popup.js` 作成（`chrome.storage.local` 読み書き）
- [x] `manifest.json` に `action.default_popup` を追加
- [x] `src/content/index.js` に `enabled` 状態判定と `chrome.storage.onChanged` 購読を追加
- [x] OFF 時に `psaExt.clearAll()` + observer 切断で追加要素を撤去
- [x] ON 時に `reattachObserver()` + `schedule()` で復帰
- [ ] 実機での動作確認（Chrome にビルド版を読み込んで ON/OFF が正常動作すること）
- [ ] popup デザイン調整（実機確認後の見た目改善が必要なら）
- [x] `manifest.json` の `version` を `0.2.0` に更新
- [x] `develop` にマージ → `main` にリリース PR

## 将来拡張（v0.2 以降）

- [x] 祝日カレンダー対応（内閣府 CSV + ハードコードフォールバック）
- [ ] PSA US（`/en-US/*`）対応
- [ ] Firefox / Edge 対応
- [ ] オプションページ（TAT 手動編集・表示位置調整）
- [ ] 通知機能（返却予定日 N 日前にリマインド）
