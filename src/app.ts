// Content/pages/ の全 JSON をルートとして登録する Hono アプリ。tools/build.ts が toSSG で静的化する。
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { type PageDoc, renderPage } from "./render";
import { walk } from "./walk";

const ROOT = join(import.meta.dirname, "..");
const PAGES = join(ROOT, "content", "pages");

export const app = new Hono();

for (const file of walk(PAGES, [".json"])) {
  const doc = JSON.parse(readFileSync(file, "utf8")) as PageDoc;
  const route = `/${relative(PAGES, file)
    .replaceAll("\\", "/")
    .replace(/\.json$/, ".html")}`;
  app.get(route, (c) => c.html(renderPage(doc)));
}
