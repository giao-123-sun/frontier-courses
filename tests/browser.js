import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.CI ? undefined : "chrome",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.TEST_URL || "http://127.0.0.1:3001";
try {
  await page.goto(base);
  await page.locator(".resource-card").first().waitFor();
  assert.equal(await page.locator(".resource-card").count(), 9);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.getByLabel("搜索课程或项目").fill("World Models");
  assert.equal(await page.locator(".resource-card").count(), 1);
  await page.getByLabel("清空搜索").click();
  await page
    .getByLabel("收藏世界模型：让人工智能理解物理世界", { exact: true })
    .click();
  await page.getByRole("button", { name: "我的收藏" }).click();
  assert.equal(await page.locator(".resource-card").count(), 1);
  await page.reload();
  await page.getByRole("button", { name: "我的收藏" }).click();
  assert.equal(await page.locator(".resource-card").count(), 1);
  await page
    .getByRole("button", {
      name: "世界模型：让人工智能理解物理世界",
      exact: true,
    })
    .click();
  await page.locator("dialog").waitFor();
  assert.ok(
    (
      await page
        .getByRole("link", { name: "前往原始资源" })
        .getAttribute("href")
    ).startsWith("https://"),
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").count(), 0);
  await page.getByLabel("设置学习兴趣").click();
  await page
    .locator("dialog")
    .getByRole("button", { name: "生成式搜索优化", exact: true })
    .click();
  await page.getByRole("button", { name: "保存并查看推荐" }).click();
  assert.ok(
    (await page.locator(".resource-card").first().textContent()).includes(
      "搜索",
    ),
  );
  await page.getByRole("button", { name: "订阅更新" }).click();
  assert.equal(
    await page.getByRole("button", { name: "发送订阅确认邮件" }).isDisabled(),
    true,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "发现", exact: true }).click();
  await page.getByLabel("来源地区").selectOption("中国");
  assert.equal(await page.locator(".resource-card").count(), 2);
  await page.getByLabel("资源类型").selectOption("大学课程");
  assert.equal(await page.locator(".resource-card").count(), 1);
  await page.getByRole("button", { name: "发现", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByLabel("打开导航").click();
  await page.getByRole("button", { name: "我的收藏" }).click();
  assert.equal(await page.locator(".resource-card").count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    "桌面与移动端检查通过：搜索、筛选、收藏持久化、详情、兴趣推荐、订阅状态、无横向溢出。",
  );
} finally {
  await browser.close();
}
