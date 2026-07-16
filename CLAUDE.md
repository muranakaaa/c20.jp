# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

プロジェクトの概要・技術スタック・ディレクトリ構成・パイプラインは README.md を参照してください。このファイルには、コードを変更するうえで守るべき固有のルールだけを記載します。

## 不可侵の原則

ミラーの忠実性と原作者への配慮を守るための絶対条件です。一部は設定（`.claude/settings.json` の deny ルール）でも機械的に禁止しています。

- `original/` と `content/` は Wayback 原本とその忠実な抽出物です。手で編集しません。直すべきものがあれば、それはパイプライン（`tools/`）か公開時加工（`src/sanitize.ts`）のバグです
- 公開時の加工（スクリプト・広告除去、mailto 剥がし、伏せ字、リンク相対化など）はすべて `src/sanitize.ts` に集約します。`render.ts` や `verify.ts` に加工ロジックを直書きしません
- UI・本文は原本に忠実に保ちます。SEO・セキュリティ・アクセシビリティなど「見た目に出ないメタデータ」だけを現代化します
- 原作者への連絡導線（mailto・生メールアドレス）を配信物に復活させません

## 変更時の検証

- `render.ts` や `sanitize.ts` を変更したら `bun run build && bun run verify` まで回します。verify（原本と生成物を全ページ比較）が忠実性の唯一の証明です
- oxfmt と oxlint が競合するルールは、フォーマッタ優先で `.oxlintrc.json` の rules で off にします

## デプロイ

- デプロイ先の Cloudflare アカウント ID は git 管理外の `mise.local.toml`（`[env]` の `CLOUDFLARE_ACCOUNT_ID`）に置きます。未設定なら `deploy:guard` が止め、意図しないアカウントへの誤デプロイを防ぎます。ガードを迂回しません
- サイト固有の値（`SITE_ORIGIN` / `GA_MEASUREMENT_ID` / `GSC_VERIFICATION`）は環境変数で注入します。CI では GitHub Variables、手元では `mise.toml` の `[env]` に置きます

## コミットメッセージ

日本語 1 行・72字以内・種別/スコープ prefix 禁止・カッコ補足禁止・末尾句点なしです。`.githooks/commit-msg` が機械的に強制します。
