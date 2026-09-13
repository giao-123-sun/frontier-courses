import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { filterResources, rankResources } from "../src/catalog.js";
import { discover, fingerprint } from "../scripts/collect.js";
const resources = JSON.parse(
  readFileSync(new URL("../public/catalog.json", import.meta.url)),
).resources;
test("搜索同时应用关键词、地区和类型，不修改原目录", () => {
  const original = resources.map((x) => x.id);
  const result = filterResources(resources, {
    query: "大模型",
    region: "中国",
    kind: "大学课程",
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "sjtu-intro");
  assert.deepEqual(
    resources.map((x) => x.id),
    original,
  );
});
test("收藏、空结果和英文原名搜索", () => {
  assert.equal(
    filterResources(resources, {
      savedOnly: true,
      saved: ["penn-world-models"],
    }).length,
    1,
  );
  assert.equal(filterResources(resources, { query: "不存在的课程" }).length, 0);
  assert.equal(
    filterResources(resources, { query: "World Models" })[0].id,
    "penn-world-models",
  );
});
test("兴趣推荐只包含匹配主题或学习基础的实际资源", () => {
  const ranked = rankResources(resources, {
    topics: ["生成式搜索优化"],
    level: "进阶",
  });
  assert.ok(ranked[0].topics.includes("生成式搜索优化"));
  assert.equal(new Set(ranked.map((x) => x.id)).size, ranked.length);
});
test("候选采集拒绝脚本链接和跨站链接，并去重", () => {
  const result = discover(
    '<a href="/course">世界模型课程</a><a href="/course#x">世界模型课程</a><a href="javascript:alert(1)">人工智能课程</a><a href="https://evil.test/">智能体课程</a>',
    { url: "https://school.edu/catalog", name: "大学", region: "中国" },
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].url, "https://school.edu/course");
  assert.equal(result[0].status, "待人工核验");
});
test("页面指纹忽略空白变化", () =>
  assert.equal(fingerprint("hello   world"), fingerprint("hello\nworld")));
test("收录资源具备来源、核验日期和真实开放程度", () => {
  assert.equal(new Set(resources.map((x) => x.id)).size, resources.length);
  for (const r of resources) {
    assert.equal(new URL(r.url).protocol, "https:");
    assert.ok(r.verifiedAt && r.access && r.note && r.outcomes.length);
  }
});
