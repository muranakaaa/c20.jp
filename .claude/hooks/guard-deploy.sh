#!/usr/bin/env bash
# PreToolUse(Bash) フック: wrangler deploy の直接実行をブロックする。
# デプロイは deploy:guard（アカウント確認）を通る bun run deploy 経由のみ許可する。
set -u
input=$(cat)
command=$(printf '%s' "$input" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_input', {}).get('command', ''))" 2>/dev/null)

if printf '%s' "$command" | grep -qE '(^|[;&| ])(bunx +)?wrangler +(deploy|versions +upload)'; then
  if ! printf '%s' "$command" | grep -qE '^bun run deploy$'; then
    echo "[hook:guard-deploy] wrangler deploy の直接実行は禁止。誤アカウント防止ガード付きの bun run deploy を使うこと" >&2
    exit 2
  fi
fi
exit 0
