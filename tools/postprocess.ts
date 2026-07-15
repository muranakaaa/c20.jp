// Original ミラーの後処理。cp932（Shift_JIS の Windows 拡張）→ UTF-8 変換と meta charset の書き換えのみ。
// リンクや本文には手を加えない。再実行しても安全（変換済みファイルはそのまま通る）。
// Workers static assets が charset=utf-8 ヘッダーで配信するため、原本エンコーディングのままだと文字化けする。
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { walk } from "../src/walk";

const SITE = join(import.meta.dirname, "..", "original");
const META_CHARSET = /charset\s*=\s*(?:shift_jis|x-sjis|shift-jis)/giu;
// WHATWG の shift_jis デコーダは windows-31j（cp932）互換
const sjis = new TextDecoder("shift_jis", { fatal: true });
const utf8 = new TextDecoder("utf-8", { fatal: true });

let total = 0;
let changed = 0;
for (const path of walk(SITE, [".html", ".css", ".js", ".txt"])) {
  total += 1;
  const data = readFileSync(path);
  // UTF-8 判定を先にする。変換済みファイルは shift_jis としても「正常に」デコードできてしまい、
  // 逆順だと再実行時に二重変換で壊れるため。UTF-8 で通れば変換済みか純 ASCII
  let text = "";
  try {
    text = utf8.decode(data);
  } catch {
    try {
      text = sjis.decode(data);
    } catch {
      console.error(`SKIP undecodable: ${path}`);
      continue;
    }
  }
  const out = text.replaceAll(META_CHARSET, "charset=utf-8");
  const encoded = Buffer.from(out, "utf8");
  if (!encoded.equals(data)) {
    writeFileSync(path, encoded);
    changed += 1;
  }
}
console.log(`processed ${total} files, changed ${changed}`);
