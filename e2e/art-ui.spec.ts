import { test, expect, type Page } from "@playwright/test";
import { expectImageLoaded } from "./helpers/images";

const origin = "http://127.0.0.1:3100";

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("R3 calligraphy stays in the hero; responsive entry points remain usable", async ({
  page,
}, testInfo) => {
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expectImageLoaded(page.locator(".hero-image"));
    const poem = page.locator(".hero-poem");
    await expect(poem).toContainText("以代码为剑");
    await expect(poem).toContainText("以测试为眼");
    await expect(poem.locator("span")).toHaveCount(2);
    await expect(poem).toHaveCSS("font-weight", "400");
    await expect(poem).toHaveCSS("font-synthesis", "none");
    await expect(poem).toHaveCSS("text-shadow", "none");
    const type = await page.evaluate(() => {
      const style = (selector: string) =>
        getComputedStyle(document.querySelector(selector)!);
      return {
        art: style(".hero-poem").fontFamily,
        ui: style("body").fontFamily,
        brandSize: parseFloat(style(".hero h1").fontSize),
        artSize: parseFloat(style(".hero-poem").fontSize),
        letterSpacing: style(".hero-note").letterSpacing,
      };
    });
    expect(type.art).toContain("STXingkai");
    expect(type.ui).toContain("Noto Sans SC");
    expect(type.ui).not.toMatch(/Xingkai|行楷|KaiTi/);
    expect(type.artSize).toBeGreaterThan(type.brandSize * 1.7);
    expect(type.letterSpacing).toBe("normal");
    const cta = page.getByRole("link", { name: "查看学习路线", exact: true });
    await expect(cta).toHaveAttribute("href", "/roadmap#task-start");
    await expect(cta).toBeInViewport();
    expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(46);
    await expect(page.getByLabel("GitHub 登录（登录未配置）")).toBeInViewport();
    await expectNoOverflow(page);
    if (width >= 768) {
      await expect(
        page.getByRole("region", { name: "当前学习入口" }),
      ).toBeInViewport();
    } else {
      const visual = await page.locator(".hero-visual").boundingBox();
      const copy = await page.locator(".hero-copy").boundingBox();
      expect(copy!.y).toBeGreaterThanOrEqual(visual!.y + visual!.height);
    }
    await page.screenshot({
      path: testInfo.outputPath("home-" + width + ".png"),
    });
  }
  expect(fontRequests).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".hero-copy")).toHaveCSS("animation-name", "none");
  await page.getByRole("link", { name: "查看学习路线", exact: true }).click();
  await expect(page).toHaveURL(/\/roadmap#task-start$/);

  // A 1440px viewport at 200% browser zoom has 720 CSS px available.
  // CSS style.zoom does not update media queries and is not browser zoom.
  // This is a reflow check, not a claim of native browser zoom automation.
  await page.setViewportSize({ width: 720, height: 500 });
  await page.goto("/");
  await expectNoOverflow(page);
  await page
    .getByRole("link", { name: "查看学习路线", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "查看学习路线", exact: true }),
  ).toBeInViewport();
});

test("reading typography handles long mixed content without changing owner/public controls", async ({
  page,
  browser,
}, testInfo) => {
  expect(
    (
      await page.request.post("/api/test-session", {
        headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
      })
    ).ok(),
  ).toBe(true);
  const response = await page.request.post("/api/notes", {
    headers: { origin },
    data: {
      title:
        "隔离排版验收：Python 与 pytest 的测试边界，以及一个不会被截断的长标题",
      stageId: "stage-02",
      tags: ["ui-r3-fixture", "仅用于排版验收"],
      body: [
        "## 问题与边界",
        "这是一段合成的排版验收内容，不是真实学习笔记。Python 3.12、pytest、HTTP 401：英文缩写、数字与中文标点应当自然衔接。",
        "## 实践与证据",
        "```python\ndef test_registration_boundary():\n    assert register_user('example@example.com', 'password-for-test-only') is not None\n```",
        "| 检查对象 | 预期结果 | 边界说明 |\n| --- | --- | --- |\n| 长文本与混合内容 | 不让整个页面横向滚动 | 代码和表格可以局部滚动 |",
        "[长链接](https://example.com/" + "long-reading-path/".repeat(16) + ")",
      ].join("\n\n"),
      showInPortfolio: true,
      acknowledgedPublic: true,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const id = (await response.json()).id;
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/notes/" + id);
    const prose = page.locator(".reading-article .markdown");
    await expect(prose).toBeVisible();
    await expect(prose).toHaveCSS("font-size", width < 768 ? "16px" : "17px");
    await expect(prose).toHaveCSS("line-height", width < 768 ? "28px" : "30px");
    await expect(prose.locator("p").first()).toHaveCSS(
      "color",
      "rgb(44, 40, 33)",
    );
    expect((await prose.boundingBox())!.width).toBeLessThanOrEqual(720);
    await expect(page.locator(".hero-poem")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "编辑笔记", exact: true }),
    ).toBeVisible();
    await expectNoOverflow(page);
    if (width < 768) {
      const toc = page.getByRole("button", {
        name: "目录与元信息",
        exact: true,
      });
      await expect(toc).toBeVisible();
      await expect(
        page.getByRole("dialog", { name: "目录与元信息" }),
      ).not.toBeVisible();
      await expect(prose.locator("p").first()).toBeInViewport();
    }
    await page.screenshot({
      path: testInfo.outputPath("reading-" + width + ".png"),
    });
  }
  const tocTrigger = page.getByRole("button", {
    name: "目录与元信息",
    exact: true,
  });
  await tocTrigger.click();
  const tocDialog = page.getByRole("dialog", {
    name: "目录与元信息",
    exact: true,
  });
  await expect(tocDialog).toBeVisible();
  await tocDialog.press("Escape");
  await expect(tocTrigger).toBeFocused();
  await tocTrigger.click();
  await page
    .getByRole("navigation", { name: "文章目录" })
    .getByRole("link", { name: "实践与证据" })
    .click();
  await expect(page).toHaveURL(/#section-5$/);
  await expect(tocDialog).not.toBeVisible();
  await page.getByRole("link", { name: "编辑笔记", exact: true }).click();
  const input = page.getByLabel("Markdown 正文");
  await expect(input).toBeVisible();
  await expect(input).toHaveCSS("font-size", "16px");
  await expect(input).toHaveCSS("line-height", "28px");
  const anonymous = await browser.newContext({ baseURL: origin });
  try {
    const reader = await anonymous.newPage();
    await reader.goto("/notes/" + id);
    await expect(reader.locator(".reading-article")).toBeVisible();
    await expect(
      reader.getByRole("link", { name: "编辑笔记", exact: true }),
    ).toHaveCount(0);
    await expect(
      reader.getByRole("button", { name: "移入回收站" }),
    ).toHaveCount(0);
  } finally {
    await anonymous.close();
  }
});
