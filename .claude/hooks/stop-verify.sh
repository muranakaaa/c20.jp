#!/usr/bin/env bash
# Stop フック: コード（src/tools/tests/設定）に未コミットの変更があるとき、bun run ci が通るまで完了させない。
# original/ と content/ の変更ではトリガーしない（原本データはパイプライン再実行で変わるだけのため）。
set -u
cd "$(dirname "$0")/../.." || exit 0

changed=$(git status --porcelain -- src tools tests public package.json tsconfig.json wrangler.jsonc .oxlintrc.json 2>/dev/null)
if [ -z "$changed" ]; then
  exit 0
fi

if ! output=$(bun run ci 2>&1); then
  echo "[hook:stop-verify] コード変更があり bun run ci が失敗しています。修正してから完了してください。" >&2
  echo "$output" | tail -20 >&2
  exit 2
fi

# 忠実性ゲート: 描画・加工・抽出に触れたら全ページ一致検証まで要求する
fidelity=$(git status --porcelain -- src/render.ts src/sanitize.ts tools/extract.ts tools/build.ts 2>/dev/null)
if [ -n "$fidelity" ]; then
  if ! output=$(bun run build 2>&1 && bun run verify 2>&1); then
    echo "[hook:stop-verify] render/sanitize/extract の変更に対して build + verify が通っていません。原本との一致を確認してから完了してください。" >&2
    echo "$output" | tail -10 >&2
    exit 2
  fi
fi
exit 0
