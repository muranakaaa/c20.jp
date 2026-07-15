# c20.jp — クリック２０世紀 復元ミラー

閉鎖された「クリック２０世紀」（c20.jp）を Wayback Machine から復元した公開ミラー。構造化データ + Hono SSG 構成。詳細は README.md。

## 不可侵の原則

- `original/` と `content/` は Wayback 原本とその忠実な抽出物。手で編集しない。直すべきものがあるなら、それはパイプライン（tools/）か公開時加工（src/sanitize.ts）のバグ
- 公開時の加工（スクリプト除去・mailto 剥がし・伏せ字・リンク相対化など）はすべて `src/sanitize.ts` に集約する。render や verify に加工ロジックを直書きしない
- UI・本文は原本に忠実に保つ。SEO・セキュリティ・アクセシビリティなど「見た目に出ないメタデータ」だけ現代化してよい
- 作者 taro さんへの連絡導線（mailto・生メールアドレス）を配信物に復活させない

## パイプライン

```
bun run download     # Wayback → original/（再取得時のみ。0.6s間隔のレート制限あり）
bun run postprocess  # original/ を UTF-8 化（冪等）
bun run extract      # original/ → content/（1ページ=1 JSON のブロック列）
bun run build        # content/ → dist/（+ sitemap。SITE_ORIGIN 設定時のみ canonical/JSON-LD/sitemap 出力）
bun run verify       # 原本と dist/ の可視テキスト・リンク集合を全1,595ページ比較
bun run ci           # typecheck + test + check（oxlint / oxfmt）
```

- render や sanitize を変更したら `bun run build && bun run verify` まで回す。verify が忠実性の唯一の証明
- verify の既知の許容差分（KNOWN_TEXT_DIFF）を増やすときは、理由をコメントで残す

## デプロイ

- 個人 Cloudflare アカウント専用。`CLOUDFLARE_ACCOUNT_ID` は git 管理外の `mise.local.toml` にあり、未設定なら deploy:guard が止める。ガードを迂回しない
- 本番デプロイは main への push で GitHub Actions が行う。手元からは `bun run deploy`

## コミットメッセージ

日本語1行・72字以内・種別/スコープ prefix 禁止・カッコ補足禁止・末尾句点なし。`.githooks/commit-msg` が機械的に強制する（`bun install` の prepare が `core.hooksPath` を設定）。

## 開発環境

bun（実行・テスト・パッケージ管理）+ mise（バージョン固定）+ tsgo（型チェック）+ oxc（lint/format）。oxfmt と oxlint が競合するルールはフォーマッタ優先で `.oxlintrc.json` で off にする。
