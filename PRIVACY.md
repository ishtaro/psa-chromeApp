# プライバシーポリシー — PSA 返却予定日ヘルパー

最終更新日: 2026-07-03

本拡張機能 (以下「本拡張」) は、Google Chrome 上で PSA (Professional Sports Authenticator) のご注文一覧ページに、サービスレベルの TAT (Turnaround Time) と PSA 到着日から順算した返却予定日を追記表示する目的で提供されます。本ポリシーでは、本拡張が扱うデータとその取り扱い方針を説明します。

## 1. 収集する情報

本拡張はユーザーから個人情報を能動的に収集しません。ただし、機能の実現に必要な範囲で以下のデータをブラウザ内で参照・保存します。

| 種別 | 取得元 | 保存先 | 用途 |
| --- | --- | --- | --- |
| サービスレベル名 / PSA 到着日 / 注文番号 | 現在開いている PSA ご注文一覧ページの DOM | 保存せず一時利用のみ | 返却予定日の計算 |
| ユーザーが選択した TAT (営業日数) | 拡張内 UI 上のプルダウン操作 | `chrome.storage.local` | 次回以降の再表示 |
| サービスレベル別 TAT 一覧 | `https://www.psacard.com/ja-JP/services` (公開ページ) | `chrome.storage.local` | 自動計算のためのマスタ |
| 日本の祝日 CSV | `https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv` (内閣府公開データ) | `chrome.storage.local` | 営業日換算 |

## 2. 情報の送信

- 上記データを **Anthropic / 開発者 / 第三者のサーバへ送信することは一切ありません**。
- 本拡張が行うネットワーク通信は次の 2 種類のみで、いずれも Cookie を送信しない設定 (`credentials: "omit"`) で行われます。
  - PSA サービス一覧ページ (`https://www.psacard.com/ja-JP/services`) からの TAT 情報取得
  - 内閣府祝日 CSV (`https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv`) の取得

## 3. 保存場所と保存期間

- すべてのデータはユーザーのブラウザ内 `chrome.storage.local` に保存され、ローカル環境から外に出ることはありません。
- 拡張機能をアンインストールすると保存データはブラウザによって削除されます。
- Chrome の設定から `chrome.storage.local` を任意に消去できます。

## 4. 第三者への提供

本拡張は取得情報を第三者に提供・販売しません。

## 5. 権限とその理由

| 権限 | 用途 |
| --- | --- |
| `storage` | 上記データをローカル保存するため |
| `alarms` | TAT / 祝日データの定期更新スケジューリングのため |
| `host_permissions: https://www.psacard.com/ja-JP/*` | 対象ページの読み取り・返却予定日の表示、および TAT マスタ取得のため |
| `host_permissions: https://www8.cao.go.jp/*` | 内閣府から日本の祝日 CSV を取得するため |

## 6. 対象年齢

本拡張は特定年齢層を対象とせず、個人情報を収集しません。

## 7. お問い合わせ

本ポリシーに関するご質問は下記までお問い合わせください。

- 開発者: ish
- 連絡先メール: ish.taro033@gmail.com

## 8. 改訂

本ポリシーは予告なく改訂される場合があります。改訂時は本ページの最終更新日を更新します。
