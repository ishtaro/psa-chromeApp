# PSA 返却予定日ヘルパー

PSA（Professional Sports Authenticator）のご注文一覧ページに、**サービスレベルの TAT（営業日）と PSA 到着日から順算した返却予定日**を追記表示する Chrome 拡張機能。

> 本拡張は非公式（unofficial）です。「PSA」は Collectors Universe, Inc. の商標です。

## 主な機能

- ご注文一覧（myorders）のテーブルに「TAT (営業日)」「返却予定日」の 2 列を追加
- TAT は PSA の `/services` ページから自動取得（取得失敗時は内蔵辞書にフォールバック）
- 営業日計算は土日 + 日本の祝日（内閣府 CSV）を除外
- TAT は注文ごとにプルダウンで手動調整可能
- 拡張アイコンのポップアップから ON/OFF を切り替え（デフォルト OFF の opt-in 方式）
- 収集した情報の外部送信は一切なし（詳細は [PRIVACY.md](PRIVACY.md)）

## インストール（開発版）

1. このリポジトリをクローンする
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパー モード」を ON にする
4. 「パッケージ化されていない拡張機能を読み込む」でリポジトリのルートディレクトリを指定する

## 使い方

1. ツールバーの拡張アイコンをクリックしてポップアップを開く
2. 「拡張機能を有効化」トグルを ON にする
3. [PSA ご注文一覧ページ](https://www.psacard.com/ja-JP/myaccount/myorders) を開くと、テーブルに TAT と返却予定日が表示される

## 開発

### ディレクトリ構成

```
├── manifest.json          # Manifest V3
├── src/
│   ├── content/           # myorders ページで動く content script
│   ├── background/        # TAT・祝日の取得／キャッシュ (service worker)
│   ├── popup/             # ON/OFF トグルのポップアップ
│   └── styles/            # psa-ext- プレフィックスの追加スタイル
├── icons/
├── fixtures/jp/           # 実ページの DOM サンプル（回帰確認用）
└── scripts/               # ビルドスクリプト
```

設計方針・仕様の詳細は [SPEC.md](SPEC.md)、作業タスクは [TASKS.md](TASKS.md) を参照。

### ストア提出用 zip の生成

```bash
node scripts/build-zip.mjs
```

`dist/psa-return-eta-vX.Y.Z.zip` が生成される（バージョンは `manifest.json` に従う）。提出手順は [STORE.md](STORE.md) を参照。

### 動作確認の要点

- myorders に「TAT (営業日)」「返却予定日」列が追加されること
- 停止プラン（Value / リホルダー系）でも TAT が解決されること
- ポップアップの ON/OFF がリロード不要で即時反映されること
- myorders 以外のページで DOM 変更が起きないこと
- コンソールに `[psa-ext]` プレフィックス以外のエラーが出ないこと

## ライセンス・連絡先

バグ報告・要望は [GitHub Issues](https://github.com/ishtaro/psa-chromeApp/issues) へ。
