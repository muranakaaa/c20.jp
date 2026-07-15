/* eslint-disable no-await-in-loop -- Wayback のレート制限に配慮して意図的に逐次取得する */
// Wayback Machine から c20.jp をミラーする。tools/cdx.txt の各 URL を id_ 形式（原本バイト列）で取得して
// Original ディレクトリに保存する。取得済みファイルはスキップするので中断後の再実行で続きから再開できる。
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CDX = join(ROOT, "tools", "cdx.txt");
const OUT = join(ROOT, "original");
const LOG = join(ROOT, "download.log");
const DELAY_MS = 600;
const MAX_ATTEMPTS = 4;

// アーカイブ元 URL → ミラー内の相対パス。c20.jp 以外は対象外
function localPath(original: string): string | null {
  const u = new URL(original);
  if (!u.hostname.endsWith("c20.jp")) {
    return null;
  }
  let path = decodeURIComponent(u.pathname);
  if (path.endsWith("/") || path === "") {
    path += "index.html";
  }
  path = path.replace(/^\//u, "");
  if (u.search) {
    path += `__q_${u.search.slice(1).replaceAll(/[^\w.-]/gu, "_")}`;
  }
  return path;
}

function log(line: string): void {
  appendFileSync(LOG, `${line}\n`);
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// 同一パスは新しいスナップショットを優先
const entries = new Map<string, { ts: string; original: string }>();
for (const line of readFileSync(CDX, "utf8").split("\n")) {
  const parts = line.split(/\s+/u);
  const [, ts, original, status] = parts;
  if (parts.length < 5 || status !== "200" || !ts || !original) {
    continue;
  }
  const lp = localPath(original);
  if (lp === null) {
    continue;
  }
  const prev = entries.get(lp);
  if (!prev || ts > prev.ts) {
    entries.set(lp, { ts, original });
  }
}

const items = [...entries.entries()].toSorted(([a], [b]) => a.localeCompare(b));
console.log(`total ${items.length} files`);
let ok = 0;
let skipped = 0;
let failed = 0;
let i = 0;

for (const [lp, { ts, original }] of items) {
  i += 1;
  const dest = join(OUT, lp);
  if (existsSync(dest) && statSync(dest).size > 0) {
    skipped += 1;
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  const url = `https://web.archive.org/web/${ts}id_/${original}`;
  let data: ArrayBuffer | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "personal archive mirror" } });
      if (res.ok) {
        data = await res.arrayBuffer();
        break;
      }
      if ([429, 503, 504].includes(res.status) && attempt < MAX_ATTEMPTS - 1) {
        const wait = 30_000 * (attempt + 1);
        log(`RETRY ${res.status} wait=${wait}ms ${original}`);
        await sleep(wait);
        continue;
      }
      log(`FAIL ${res.status} ${original}`);
      break;
    } catch (error) {
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(15_000 * (attempt + 1));
        continue;
      }
      log(`FAIL ${(error as Error).name} ${original}`);
      break;
    }
  }
  if (data === null) {
    failed += 1;
  } else {
    writeFileSync(dest, new Uint8Array(data));
    ok += 1;
    log(`OK ${lp}`);
  }
  if (i % 50 === 0) {
    console.log(`${i}/${items.length} ok=${ok} skip=${skipped} fail=${failed}`);
  }
  await sleep(DELAY_MS);
}

console.log(`done: total=${items.length} ok=${ok} skip=${skipped} fail=${failed}`);
