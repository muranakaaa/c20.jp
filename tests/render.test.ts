import { describe, expect, test } from "bun:test";
import { buildTitle, type PageDoc, renderPage } from "../src/render";

const doc: PageDoc = {
  path: "1945/08hiros.html",
  type: "article",
  title: "アメリカ軍、広島に原爆投下　／ クリック ２０世紀",
  description: "説明文",
  css: ["../all.css", "../b.css"],
  baseClass: "base",
  blocks: [
    { type: "title", html: "アメリカ軍、広島に原爆投下" },
    { type: "title2", html: "1945/08/06" },
    {
      type: "timeline",
      rows: [
        {
          cls: "b",
          cells: [{ id: "l", cls: null, html: '1945/08/06　　<a href="08hiros.html">広島</a>' }],
        },
      ],
    },
    {
      type: "raw",
      tag: "div",
      attrs: { class: "tx" },
      html: "本文<script>alert(1)</script>テキスト",
    },
    { type: "base_break", cls: "base2" },
    { type: "fnavi", html: '<a href="../index.html">トップ</a>' },
  ],
};

describe("renderPage", () => {
  test("旧サイトと同じシェルとブロック markup を再生成する", async () => {
    const out = (await renderPage(doc)).toString();
    expect(out).toContain(
      "<title>アメリカ軍、広島に原爆投下（1945/08/06）｜クリック２０世紀</title>",
    );
    expect(out).toContain('<link rel="stylesheet" href="/all.css">');
    expect(out).toContain('<div class="title">アメリカ軍、広島に原爆投下</div>');
    expect(out).toContain('<tr class="b"><td id="l">');
    expect(out).toContain('<table role="presentation" align="center" class="base2">');
  });

  test("script タグは除去し、周囲のテキストは保持する", async () => {
    const out = (await renderPage(doc)).toString();
    expect(out).not.toContain("<script");
    expect(out).toContain("本文テキスト");
  });

  test("meta charset と viewport を持つ HTML5 で出力する", async () => {
    const out = (await renderPage(doc)).toString();
    expect(out).toContain("<!DOCTYPE html>");
    expect(out).toContain('<meta charset="utf-8"');
    expect(out).toContain('<meta name="viewport"');
  });
});

const base = { path: "", description: null, css: [], baseClass: "base", blocks: [] };
const t2 = (s: string) => [{ type: "title2", html: s } as const];

describe("buildTitle", () => {
  test("型別テンプレートで SEO タイトルを組み立てる", () => {
    expect(buildTitle({ ...base, type: "top", title: "クリック ２０世紀", blocks: [] })).toBe(
      "クリック２０世紀｜世界と日本の近現代史年表",
    );
    expect(
      buildTitle({
        ...base,
        type: "year",
        title: "１９４５年　／ クリック ２０世紀",
        blocks: t2("昭和２０年"),
      }),
    ).toBe("1945年の年表（昭和20年）｜クリック２０世紀");
    expect(
      buildTitle({
        ...base,
        type: "article",
        title: "アメリカ軍、広島に原爆投下　／ クリック ２０世紀",
        blocks: t2("1945/08/06"),
      }),
    ).toBe("アメリカ軍、広島に原爆投下（1945/08/06）｜クリック２０世紀");
    expect(
      buildTitle({
        ...base,
        type: "person",
        title: "アドルフ・ヒトラー　／ クリック ２０世紀",
        blocks: t2("1889 － 1945"),
      }),
    ).toBe("アドルフ・ヒトラー｜人物ファイル｜クリック２０世紀");
    expect(
      buildTitle({
        ...base,
        type: "person_list",
        title: "人物ファイル一覧　（サ）　／ クリック ２０世紀",
        blocks: [],
      }),
    ).toBe("人物ファイル一覧（サ行）｜クリック２０世紀");
    expect(
      buildTitle({
        ...base,
        type: "text",
        title: "「坂の上の雲（４）」　／ クリック ２０世紀",
        blocks: [],
      }),
    ).toBe("「坂の上の雲（4）」｜参考書籍｜クリック２０世紀");
  });
});
