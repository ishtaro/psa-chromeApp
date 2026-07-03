# CLAUDE.md — psa_subApp プロジェクト固有指示

Claude Code がこのリポジトリで作業する際に従うべき方針をまとめる。グローバル指示（`~/.claude/CLAUDE.md`）が上位、当ファイルはプロジェクト固有事項のみを補足する。

## プロジェクト概要

- 目的: PSA（Professional Sports Authenticator）のご注文ページで、サービスレベルと PSA 到着日から返却予定日を自動計算し、既存 UI を壊さない形で表示する Chrome 拡張機能。
- 対象サイト: PSA Japan（psacard.co.jp）／ PSA US（psacard.com）両方。
- 対応ブラウザ: Google Chrome（Manifest V3）。
- 計算方向: 順算（PSA 到着日 + サービスレベルの TAT ＝ ユーザーへの返却予定日）。
- TAT 取得: 拡張機能内にハードコードせず、PSA サイト側の記載を DOM から動的に読み取る。

## 設計原則

- **非侵襲性を最優先**: 既存の HTML 構造を極力書き換えない。表示は独立コンテナへ追加する形で行い、既存要素の `class` や `id` は変更しない。
- **既存デザインへ悪影響を与えない**: サイト側の CSS と競合しないよう、拡張側 CSS は BEM または `psa-ext-` プレフィックスで完全に名前空間を分離する。`!important` の乱用は避ける。
- **フェイルセーフ**: DOM 構造が変わって取得に失敗した場合でも、静かに表示を諦めるだけで、既存サイトを壊さない。例外はコンソールに残す。
- **DOM 変更検知**: PSA のフォームは SPA 的に変化する可能性があるため、`MutationObserver` を用いて動的更新に追従する。
- **国際化**: 両サイトで文言・日付フォーマットが異なる。パーサはサイト別に分離し、共通の内部モデルへ正規化する。

## ディレクトリ構成（想定）

```
psa_subApp/
├── manifest.json          # Manifest V3
├── src/
│   ├── content/
│   │   ├── index.js       # エントリ、サイト判定と初期化
│   │   ├── parser-jp.js   # PSA Japan 用パーサ
│   │   ├── parser-us.js   # PSA US 用パーサ
│   │   ├── calculator.js  # 到着日 + TAT → 返却予定日
│   │   └── ui.js          # 非侵襲的な表示要素の生成・挿入
│   └── styles/
│       └── overlay.css    # psa-ext- プレフィックスで名前空間分離
├── icons/                 # 16 / 48 / 128 px
├── SPEC.md                # 機能仕様
├── TASKS.md               # 作業タスク
├── CLAUDE.md              # 本ファイル
└── README.md
```

## コーディング規約

- 言語: 素の JavaScript（ES2022+）。ビルドツールは MVP では不要。必要になった時点で Vite を検討する。
- モジュール形式: content script は Manifest 側で複数ファイル指定するか、単一エントリから `import` する（`type: "module"` を利用）。
- ファイル・変数の命名は英語、コメントとドキュメントは日本語。
- 例外は握りつぶさず `console.warn('[psa-ext] ...', err)` の形式で残す。ユーザーには表示しない。
- 拡張側 DOM 要素はすべて `psa-ext-` プレフィックスの class を付ける。

## 動作確認

- Chrome の「パッケージ化されていない拡張機能を読み込む」で `psa_subApp/` を指定して確認する。
- PSA Japan と PSA US の実注文ページで、少なくとも 1 サービスレベル以上の DOM を保存して回帰確認できるようにする（フィクスチャは `fixtures/` 配下に置く方針）。

## Git 運用（プロジェクト補足）

- グローバルルールに従い、`feature/`, `fix/`, `chore/` プレフィックスでブランチを切る。
- PR のマージ先は `develop`（未作成なら初回に作成する）。
- コミット・プッシュ・マージはユーザー許可を得てから実行する。
