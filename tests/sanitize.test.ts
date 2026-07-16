import { describe, expect, test } from "bun:test";
import {
  markLayoutTables,
  maskAuthorEmails,
  normalizeBrokenAnchors,
  openExternalLinksInNewTab,
  relativizeInternalLinks,
  sanitizeFragment,
  stripDeadEmbeds,
  unwrapMailto,
} from "../src/sanitize";

describe("sanitize", () => {
  test("script と広告ビーコンを除去し、周囲のテキストは保持する", () => {
    expect(stripDeadEmbeds("前<script>alert(1)</script>後")).toBe("前後");
    expect(
      stripDeadEmbeds('本<img src="http://www.assoc-amazon.jp/e/ir?t=x" width="1" height="1">文'),
    ).toBe("本文");
  });

  test("mailto はリンクだけ剥がしてテキストを残す", () => {
    expect(unwrapMailto('ｂｙ　<a href="mailto:uh@usleaf2001.com">ｔａｒｏ</a>')).toBe(
      "ｂｙ　ｔａｒｏ",
    );
  });

  test("本文中の作者メールアドレスを伏せ字にする", () => {
    expect(maskAuthorEmails("どうか（uh@usleaf2001.com)まで")).toBe("どうか（＊＊＊)まで");
    expect(maskAuthorEmails("taro@c20.jp 宛")).toBe("＊＊＊ 宛");
  });

  test("編集残骸の壊れリンクは属性なしの <a> に正規化する", () => {
    expect(normalizeBrokenAnchors('<a href".."="" 19.html"="">未公開</a>')).toBe("<a>未公開</a>");
  });

  test("レイアウト用リンクグリッドに role=presentation を付ける（年表は対象外）", () => {
    expect(markLayoutTables('<table class="lt"><tr>')).toBe(
      '<table role="presentation" class="lt"><tr>',
    );
    expect(markLayoutTables('<table class="line"><tr>')).toBe('<table class="line"><tr>');
  });

  test("サイト内絶対リンクは属性のみルート相対化し、本文テキストの URL は保持する", () => {
    expect(
      relativizeInternalLinks('<a href="http://www.c20.jp/1945/x.html">http://www.c20.jp/</a>'),
    ).toBe('<a href="/1945/x.html">http://www.c20.jp/</a>');
  });

  test("外部リンクは別タブで開き、内部リンクはそのまま", () => {
    expect(openExternalLinksInNewTab('<a href="https://www.amazon.co.jp/x">本</a>')).toBe(
      '<a href="https://www.amazon.co.jp/x" target="_blank" rel="noopener">本</a>',
    );
    // ルート相対化済みの内部リンクには付けない
    expect(openExternalLinksInNewTab('<a href="/1945/x.html">年表</a>')).toBe(
      '<a href="/1945/x.html">年表</a>',
    );
    // 既に target があるものは重複させない
    const withTarget = '<a href="https://example.com" target="_blank">x</a>';
    expect(openExternalLinksInNewTab(withTarget)).toBe(withTarget);
  });

  test("sanitizeFragment は全加工をまとめて適用する", () => {
    const input =
      '<a href="mailto:taro@c20.jp">taro</a>宛（taro@c20.jp）<script>x()</script><table class="lt">';
    expect(sanitizeFragment(input)).toBe('taro宛（＊＊＊）<table role="presentation" class="lt">');
    expect(sanitizeFragment(null)).toBe("");
  });
});
