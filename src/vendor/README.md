# src/vendor — 第三者ライブラリ（同梱物）

Chrome 拡張 (Manifest V3) は CSP によりリモートスクリプトの読み込みを禁止しているため、
外部ライブラリは CDN 参照ではなくローカルに同梱（vendoring）してバージョンを固定する。
このディレクトリのファイルは編集せず、更新時は下記手順で入れ替え、本 README の版・ハッシュを更新する。

## scroll-hint

- 用途: 注文テーブルが横スクロール可能なことを示すヒント（横スクロール対応時に使用）。
- バージョン: `1.2.9`
- ライセンス: MIT（作者: steelydylan）
- リポジトリ: https://github.com/appleple/scroll-hint
- 取得元:
  - `https://cdn.jsdelivr.net/npm/scroll-hint@1.2.9/js/scroll-hint.min.js`
  - `https://cdn.jsdelivr.net/npm/scroll-hint@1.2.9/css/scroll-hint.css`

### 同梱ファイルと整合性 (sha256)

| ファイル | バイト数 | sha256 |
|---|---|---|
| `scroll-hint.min.js` | 8684 | `cc0fc1699febeec233cae2a691a545db0fae1d71827407f45831e9bccff54d8e` |
| `scroll-hint.css` | 9159 | `c0f4baab789dfd8b48608c7a1c8e69e62e9149cca61d6c66f349517d506e20a5` |

検証:

```sh
sha256sum src/vendor/scroll-hint.min.js src/vendor/scroll-hint.css
```

### セキュリティ監査メモ（同梱時点で目視・grep 確認）

- `eval` / `Function` / 動的コード実行: なし
- `fetch` / `XMLHttpRequest` などの通信: なし
- `chrome.*` API・cookie・localStorage / sessionStorage 参照: なし
- script 要素の注入・`document.write`: なし
- `innerHTML`: 1 箇所のみ。静的テンプレート（クラス名と `i18n.scrollable` 定数）を挿入するだけで、
  ページやユーザー入力は流し込まない（XSS 経路なし）。
- 実際の動作: DOM 操作と scroll / resize リスナー登録のみ。

補足: 同梱コードは content script の isolated world で拡張の権限と同じ土俵で動作する。
本ライブラリは chrome.* を参照しないが、バージョンを上げる際は上記観点で再監査すること。

### 更新手順

1. 目的バージョンのファイルを上記 URL 形式で取得する。
2. `sha256sum` でハッシュを算出し、本 README の表を更新する。
3. 上記「セキュリティ監査メモ」の観点で差分を確認する。
4. `manifest.json` の `content_scripts` 参照パスが変わる場合は併せて更新する。
