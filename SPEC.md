# SPEC.md — PSA 返却予定日順算機能 仕様（2026-07-02 改訂）

## 1. 目的

PSA のご注文一覧ページで、各注文に対して **PSA 到着日 + サービスレベルの TAT** から**返却予定日**を順算し、既存 UI を壊さない形で追記表示する Chrome 拡張機能。

## 2. 対応環境

| 項目 | 内容 |
| --- | --- |
| ブラウザ | Google Chrome（Manifest V3） |
| 主対象サイト | PSA Japan ロケール（`https://www.psacard.com/ja-JP/*`） |
| 対象ページ | `https://www.psacard.com/ja-JP/myaccount/myorders` (ご注文一覧) |
| TAT 参照元 | `https://www.psacard.com/ja-JP/services` (background から fetch、キャッシュ) |
| 祝日参照元 | `https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv` (background から fetch、キャッシュ) |
| PSA US 対応 | 将来スコープ（本 MVP は含めない） |

> 備考: PSA Japan と US はドメインが同一（`www.psacard.com`）で、ロケールは URL パス `/ja-JP/` `/en-US/` で切り替わる。まずは `ja-JP` に絞る。

## 3. 入力ソースの実測

### 3.1 ご注文一覧（myorders）の DOM

```
<thead>
  <th> オーダー / サービスレベル | 進捗状況 | アイテム / 配送先 | 到着 </th>
</thead>
<tbody>
  <tr>
    <td> ... <p class="mb-0.5">Value</p> ...          </td>  <!-- サービスレベル名 -->
    <td> <p>リサーチ</p> [progress] </td>                     <!-- ステータス -->
    <td> <p>10 枚</p> <div>自分宛てに搬送</div> </td>
    <td> <p>2026年6月5日</p> </td>                            <!-- PSA 到着日 -->
  </tr>
</tbody>
```

セレクタ:

| 項目 | セレクタ |
| --- | --- |
| サービスレベル名 | `tr td:nth-child(1) p.mb-0.5` |
| 進捗ステータス | `tr td:nth-child(2) p:first-child` |
| PSA 到着日 | `tr td:nth-child(4) p` |

### 3.2 サービスレベル一覧（/services）の DOM

```
<div class="text-subtitle2 text-secondary">レギュラー</div>
...
<p>予定納期：<span class="text-body2 font-bold">60営業日</span>（日数換算：...）</p>
```

セレクタ:

| 項目 | セレクタ |
| --- | --- |
| サービスレベル名 | `div.text-subtitle2.text-secondary` |
| TAT | 同カード内の `p:contains("予定納期：") span.text-body2.font-bold` |

## 4. TAT テーブル

現行プランは `/services` から動的取得、停止プランはハードコードで補完する。すべて **営業日** ベース。

### 4.1 現行プラン（動的取得、フォールバック値）

| サービスレベル | TAT (営業日) |
| --- | --- |
| レギュラー | 60 |
| エクスプレス | 25 |
| スーパー・エクスプレス | 25 |
| ウォーク・スルー | 25 |
| プレミアム1 | 25 |
| プレミアム2 | 25 |
| プレミアム3 | 25 |
| プレミアム5 | 25 |
| プレミアム10 | 15 |

動的取得に失敗した場合は上記フォールバック値を使う。

### 4.2 停止プラン（ハードコード）

2026-02-10 のサービスレベル改定後の TAT を採用。myorders 上の表記が英語識別子か日本語か確定していないため、両方をキー登録している。

| サービスレベル (英語識別子 / 日本語) | TAT (営業日) |
| --- | --- |
| Value / バリュー | 90 |
| Value Plus 60 / バリュー・プラス | 60 |
| Value Max 40 / バリュー・マックス | 40 |
| Value Bulk 120 / バリュー・バルク | 120 |
| Reholder 30 / リホルダー30 | 60 |
| Reholder 75 / リホルダー75 | 60 |
| Reholder 300 / リホルダー300 | 30 |
| Reholder 750 / リホルダー750 | 25 |
| Reholder 1500 / リホルダー1500 | 25 |
| Reholder 4000 / リホルダー4000 | 25 |
| Reholder 7500 / リホルダー7500 | 25 |

将来別プランが停止／追加される場合はコード内のマップを更新する。辞書は `src/background/tat-hardcoded.js` と `src/content/tat-store.js` の 2 箇所にあり、**必ず両方を同期させる**。

### 4.3 マッチング方針

- サービスレベル文字列は完全一致で辞書引き。
- 未知の名前 → 表示しない（`—` を出す）。フェイルセーフ。

## 5. 計算ロジック

- 式: `返却予定日 = PSA 到着日 + TAT 営業日`
- 営業日の数え方: **到着日（当日）を 1 営業日目として数える（当日含む）**。到着日が土日祝の場合は、それ以降の最初の営業日が 1 日目。例）到着 6/5(金)・TAT 1 → 6/5、TAT 2 → 6/8(月)。
- 営業日加算: **土日 + 日本の祝日**をスキップ。
- 祝日カレンダー: 内閣府 CSV (`https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv`, Shift_JIS) を background で fetch し `chrome.storage.local` に保存、週次更新。取得失敗時はコード内のハードコード辞書 (2025-2028) にフォールバック。
- 到着日パース: `YYYY年M月D日` 形式（1〜2 桁の月／日に対応）。
- TAT 不明・到着日パース失敗 → `—` を表示、既存行はそのまま。
- 注文行の形をしていない行（「ご注文がありません」等の colspan メッセージ行）にはセルを追加しない。注文行が 1 つもないテーブルにはヘッダー列も追加しない。

## 6. 表示方法（非侵襲）

- テーブルに **2 列を追加**する形で表示する（既存 4 列は不変）:
  - **5 列目: TAT (営業日)** — 全プランでプルダウン編集可能。現在値 (辞書 or userTat) を pre-select
  - **6 列目: 返却予定日** — 到着日 + TAT を営業日順算した結果
- 具体的な DOM 追加内容:
  - `<thead><tr>` の末尾に `<th class="psa-ext-tat-th">TAT (営業日)</th>` `<th class="psa-ext-th">返却予定日</th>` を挿入
  - 各 `<tbody><tr>` の末尾に対応する `<td>` を挿入
- プルダウン選択値は `chrome.storage.local.userTat[注文番号]` に**注文単位**で保存。同じサービスレベルの他の注文には影響しない。
- 注文番号は 1 列目のリンク `href="/ja-JP/myaccount/myorders/<申込>/<注文番号>"` の末尾セグメントから取得する。
- **優先順**: `userTat[orderId]` → `storage.tat[serviceLevel]` (fetched) → `HARDCODED_TAT[serviceLevel]`。ユーザー選択が常に最優先。
- 現在値が固定候補 (10〜150) に無い場合、その値も動的にプルダウン候補へ追加する。
- 既存要素の `class` / `style` は原則変更しない。ただし表右上の角丸を維持するため、既存最終列 `<th>` から `rounded-tr-2xl` を新規最終列 `<th>` に付け替える。これ以外の class 変更は行わない。
- 拡張機能側で挿入する要素はすべて `psa-ext-` プレフィックス付き class を持つ。
- 万一 DOM 構造が変わったら、TH/TD 挿入をスキップして既存表を壊さない（フェイルセーフ）。

## 7. 更新トリガ

- ページ初回描画時
- ページ内テーブル再描画（フィルタ・ソート・ページ切替）を `MutationObserver` で検知
- TAT キャッシュ更新後（background から `chrome.runtime.sendMessage`）

## 8. 非機能要件

- 既存 UI を壊さない（追加のみ、既存書き換え無し）。
- 収集情報を外部送信しない（オフライン動作、TAT 取得のための PSA `/services` fetch のみ）。
- 拡張機能起動〜表示は 300ms 以内目標。
- 権限は最小限（`storage`, host_permissions のみ）。

## 9. アーキテクチャ

```
chrome-extension/
├── manifest.json              # MV3, content_script は myorders、
│                              # background service worker は TAT fetcher
├── src/
│   ├── content/
│   │   ├── index.js           # myorders エントリ、MutationObserver 起動
│   │   ├── extract.js         # 行 → { serviceLevel, arrivalDate }
│   │   ├── calculator.js      # 到着日 + TAT (営業日) → 返却予定日
│   │   ├── ui.js              # <th>/<td> 追加・更新・削除
│   │   ├── tat-store.js       # storage.local からの TAT 辞書取得
│   │   └── holidays-store.js  # storage.local からの祝日 Set 取得
│   ├── background/
│   │   ├── index.js           # onInstalled/alarms で TAT・祝日更新起動
│   │   ├── tat-fetcher.js     # /services を fetch → parse → storage 保存
│   │   ├── tat-hardcoded.js   # 停止プラン + 現行フォールバック値
│   │   ├── holidays-fetcher.js  # 内閣府 CSV を fetch → parse → storage 保存
│   │   └── holidays-hardcoded.js # 祝日フォールバック (2025-2028)
│   └── styles/
│       └── overlay.css        # psa-ext- プレフィックス
├── fixtures/jp/               # DOM サンプル（開発時参照）
│   ├── myorders.html
│   └── services.html
├── icons/
├── SPEC.md / TASKS.md / CLAUDE.md / README.md
```

## 10. スコープ外（MVP = v0.1.0）

- PSA US（`/en-US/*`）対応
- Firefox / Edge 対応
- オプションページ（TAT 手動編集、表示位置調整）
- 通知／リマインド機能
- 拡張機能 ON/OFF トグル → **v0.2 で対応**（§13 参照）

## 11. 想定リスク

- PSA が myorders の DOM を変更 → フェイルセーフで表を壊さない。
- `/services` fetch がブロックされる（bot 対策） → ハードコードフォールバック値で継続動作。
- 到着日フォーマット変更 → パース失敗行は `—` 表示、他行は影響なし。

## 12. 用語

- **TAT**: Turnaround Time。PSA が鑑定に要する営業日数。
- **PSA 到着日**: 対象カードが PSA に到着した日。myorders の「到着」列に表示される。
- **返却予定日**: 鑑定完了後、PSA からユーザーへ返送される予定日。順算結果。
- **現行プラン**: `/services` に掲載されている受付中のプラン。
- **停止プラン**: 過去に受付していたが現在は新規受付停止のプラン（Value 系、リホルダー系）。既存注文には残存する。

## 13. v0.2 追加機能

### 13.1 拡張機能 ON/OFF トグル

現状（v0.1）は content script が myorders ページで常時起動する。v0.2 では拡張アイコンのポップアップから ON/OFF を切り替えられるようにする。

**仕様:**

- 拡張アイコンをクリックすると popup が開き、有効化トグル（スイッチ）と myorders リンクを表示する。
- 状態は `chrome.storage.local` に `{ enabled: boolean }` で保存する。**デフォルトは `false` (OFF) の opt-in 方式**。未設定も OFF 扱い。
- 明示的に `enabled === true` が保存されたときのみ content script が起動する。それ以外（`undefined` / `false`）は何もしない。
- OFF → ON の切替瞬間:
  - `MutationObserver` を接続し、テーブルを再スキャンして表示を追加する。
- ON → OFF の切替瞬間:
  - `MutationObserver` を切断する。
  - content script が追加した `<th class="psa-ext-*">` / `<td class="psa-ext-*">` を `psaExt.clearAll()` で全撤去する。
- ページリロード不要で即時反映する。

**追加ファイル:**

| ファイル | 役割 |
| --- | --- |
| `src/popup/index.html` | popup の UI（トグル + 説明文） |
| `src/popup/popup.css` | popup 用スタイル（`psa-ext-popup__*` プレフィックス） |
| `src/popup/popup.js` | `chrome.storage.local` への読み書き |

**既存ファイル変更:**

- `manifest.json`: `action.default_popup` に `src/popup/index.html` を指定
- `src/content/index.js`: `chrome.storage.local.get(STORAGE_KEY)` で初期状態取得、`chrome.storage.onChanged` で切替を購読、有効時のみ `schedule()` / `reattachObserver()` を実行

**動作フロー:**

```
[popup] ─チェック変更→ chrome.storage.local.set({ enabled }) ─変更通知→ [content script]
                                                                          ↓
                                                            enabled=true  → startExtension()
                                                            enabled=false → stopExtension() (clearAll + disconnect)
```

**インストール直後の挙動:**

1. ユーザーが拡張機能を Chrome Web Store からインストール
2. myorders ページを開いても、拡張は自動起動しない（`enabled` 未設定 = OFF 扱い）
3. ユーザーが拡張アイコンをクリック → popup が開く
4. トグルを ON にする → その場で TAT / 返却予定日列が現れる
5. 次回以降は `enabled: true` が保存されているので、myorders を開くたびに自動起動する
