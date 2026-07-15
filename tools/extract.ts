// Original/ の各 HTML をブロック列の JSON に抽出して content/pages/ に出力する。
// ページ = 共通シェル + 型付きブロック列。意味を確定できるもの（タイトル・ナビ・年表・見出し）は
// 構造化し、それ以外は raw HTML フラグメントとして保持して忠実性を守る。
import * as cheerio from "cheerio";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { Block, PageDoc, TimelineRow } from "../src/render";
import { walk } from "../src/walk";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "original");
const OUT = join(ROOT, "content", "pages");

const TYPE_BY_CSS: [string, string][] = [
  ["top.css", "top"],
  ["a.css", "year"],
  ["b.css", "article"],
  ["c.css", "detail"],
  ["p_list.css", "person_list"],
  ["t_list.css", "text_list"],
  ["p.css", "person"],
  ["text.css", "text"],
  ["them.css", "theme"],
  ["other.css", "taro"],
];

function extract(file: string): PageDoc {
  const htmlSrc = readFileSync(file, "utf8");
  const $ = cheerio.load(htmlSrc);
  const title = $("title").text();
  const description = $('meta[name="description"]').attr("content") ?? null;
  const css = $('link[rel="stylesheet"]')
    .map((_, e) => $(e).attr("href"))
    .get();
  const cssNames = new Set(css.map((c) => c.split("/").pop() ?? c));
  const [, type] = TYPE_BY_CSS.find(([n]) => cssNames.has(n)) ?? [null, "other"];

  // シェル: body 直下に table.base/base2 が1つ以上並び、それぞれの tr > td がコンテンツコンテナ
  const tables = $("body > table").toArray();
  if (tables.length === 0) {
    throw new Error("no container");
  }
  const baseClass = $(tables[0]).attr("class") ?? "base";

  const blocks: Block[] = [];
  tables.forEach((tbl, i) => {
    if (i > 0) {
      blocks.push({ type: "base_break", cls: $(tbl).attr("class") ?? "base" });
    }
    const td = $(tbl).children("tbody").children("tr").first().children("td").first();
    for (const el of td.children().toArray()) {
      const $el = $(el);
      const cls = $el.attr("class") ?? "";
      const tag = el.tagName?.toLowerCase();

      if (tag === "div" && cls === "navi") {
        blocks.push({ type: "navi", html: $el.html() ?? "" });
      } else if (tag === "div" && cls === "title") {
        blocks.push({ type: "title", html: $el.html() ?? "" });
      } else if (tag === "div" && cls === "title2") {
        blocks.push({ type: "title2", html: $el.html() ?? "" });
      } else if (tag === "div" && cls === "navi2") {
        blocks.push({ type: "navi2", html: $el.html() ?? "" });
      } else if (tag === "table" && cls === "headline") {
        const cells = $el
          .find("td.headline")
          .toArray()
          .map((cell) => $(cell).html() ?? "");
        blocks.push({ type: "headline", cells });
      } else if (tag === "table" && cls === "line") {
        const rows: TimelineRow[] = $el
          .find("tr")
          .toArray()
          .map((tr) => {
            const $tr = $(tr);
            const cells = $tr
              .children("td")
              .toArray()
              .map((cell) => {
                const $td = $(cell);
                return {
                  id: $td.attr("id") ?? null,
                  cls: $td.attr("class") ?? null,
                  html: $td.html() ?? "",
                };
              });
            return { cls: $tr.attr("class") ?? "", cells };
          });
        blocks.push({ type: "timeline", rows });
      } else if (tag === "div" && cls === "cyu") {
        blocks.push({ type: "cyu", html: $el.html() ?? "" });
      } else if (tag === "div" && cls === "taro") {
        blocks.push({ type: "taro", html: $el.html() ?? "" });
      } else if (tag === "div" && cls === "fnavi") {
        blocks.push({ type: "fnavi", html: $el.html() ?? "" });
      } else if (tag === "div" && (cls === "e_bar" || cls === "e_data")) {
        // 編集モードの残骸（display:none）。忠実性のため中身ごと保持する
        blocks.push({ type: "edit_bar", kind: cls, html: $el.html() ?? "" });
      } else {
        blocks.push({
          type: "raw",
          tag: tag ?? "div",
          attrs: { ...el.attribs },
          html: $el.html() ?? "",
        });
      }
    }
  });

  return {
    path: relative(SRC, file).replaceAll("\\", "/"),
    type,
    title,
    description,
    css,
    baseClass,
    blocks,
  };
}

let n = 0;
const errors: string[] = [];
for (const file of walk(SRC, [".html"])) {
  try {
    const data = extract(file);
    const out = join(OUT, relative(SRC, file).replace(/\.html$/, ".json"));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(data, null, 1));
    n++;
  } catch (error) {
    errors.push(`${file}: ${(error as Error).message}`);
  }
}
console.log(`extracted ${n} pages, ${errors.length} errors`);
for (const e of errors) {
  console.error(e);
}
