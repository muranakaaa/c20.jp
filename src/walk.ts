import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// 指定拡張子のファイルを再帰列挙する
export function* walk(dir: string, exts: string[]): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      yield* walk(p, exts);
    } else if (exts.some((e) => name.endsWith(e))) {
      yield p;
    }
  }
}
