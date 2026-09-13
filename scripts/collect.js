import { readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
const root = fileURLToPath(new URL("../", import.meta.url));
const catalogFile = resolve(root, "public/catalog.json");
const agent = "FrontierCoursesBot";
const headers = {
  "User-Agent": `${agent}/0.1 (+https://github.com/giao-123-sun/frontier-courses)`,
};
export function fingerprint(text) {
  return createHash("sha256")
    .update(text.replace(/\s+/g, " ").trim())
    .digest("hex");
}
export function discover(html, source) {
  const $ = cheerio.load(html),
    seen = new Set();
  const results = [];
  $("a[href]").each((_, el) => {
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (
      title.length < 5 ||
      title.length > 180 ||
      !/world model|language model|agent|generative|robot|人工智能|大模型|智能体|具身|世界模型/i.test(
        title,
      )
    )
      return;
    try {
      const url = new URL($(el).attr("href"), source.url);
      if (
        url.protocol !== "https:" ||
        url.origin !== new URL(source.url).origin
      )
        return;
      url.hash = "";
      if (seen.has(url.href)) return;
      seen.add(url.href);
      results.push({
        id: fingerprint(url.href).slice(0, 16),
        title,
        url: url.href,
        source: source.name,
        region: source.region,
        status: "待人工核验",
      });
    } catch {}
  });
  return results.slice(0, 40);
}
async function boundedText(res, limit = 2_000_000) {
  if (!res.ok) throw Error(`来源返回 ${res.status}`);
  const reader = res.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw Error("页面过大，跳过采集");
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks).toString("utf8");
}
const robotsCache = new Map();
async function fetchPage(url) {
  const u = new URL(url);
  let robot = robotsCache.get(u.origin);
  if (!robot) {
    const robotUrl = new URL("/robots.txt", u);
    const response = await fetch(robotUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) robot = robotsParser(robotUrl.href, "");
    else if (response.ok)
      robot = robotsParser(robotUrl.href, await boundedText(response, 500000));
    else throw Error("无法核验抓取规则，暂时跳过");
    robotsCache.set(u.origin, robot);
  }
  if (robot.isAllowed(url, agent) === false) throw Error("来源限制自动访问");
  const delay = Math.max(1, Math.min(10, robot.getCrawlDelay(agent) || 1));
  await new Promise((r) => setTimeout(r, delay * 1000));
  return boundedText(
    await fetch(url, { headers, signal: AbortSignal.timeout(20000) }),
  );
}
export async function collect() {
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  const sources = JSON.parse(
    await readFile(resolve(root, "data/sources.json"), "utf8"),
  );
  const now = new Date().toISOString();
  const checks = [];
  const oldChecks = new Map((catalog.checks || []).map((x) => [x.id, x]));
  for (const source of [
    ...sources,
    ...catalog.resources.map((r) => ({
      id: r.id,
      name: r.source + " · " + r.title,
      url: r.url,
      repo: r.repo,
    })),
  ]) {
    try {
      let html = "",
        hash,
        upstreamUpdatedAt;
      if (source.repo) {
        const response = await fetch(
          `https://api.github.com/repos/${source.repo}/commits?per_page=1`,
          {
            headers: {
              ...headers,
              Accept: "application/vnd.github+json",
              ...(process.env.GITHUB_TOKEN
                ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
                : {}),
            },
            signal: AbortSignal.timeout(20000),
          },
        );
        const commits = JSON.parse(await boundedText(response));
        if (!commits[0]?.sha) throw Error("项目暂无可读提交");
        hash = commits[0].sha;
        upstreamUpdatedAt = commits[0].commit.committer.date;
      } else {
        html = await fetchPage(source.url);
        const $ = cheerio.load(html);
        $("script,style,nav,footer,header,noscript").remove();
        const main = $("main").length ? $("main").text() : $("body").text();
        if (
          main.trim().length < 100 ||
          /verify that you.re not a robot|enable javascript and cookies|just a moment/i.test(
            main,
          )
        )
          throw Error("来源需要浏览器验证");
        hash = fingerprint(main);
      }
      const previous = oldChecks.get(source.id);
      const changed = Boolean(previous?.hash && previous.hash !== hash);
      checks.push({
        id: source.id,
        name: source.name,
        ok: true,
        checkedAt: now,
        hash,
        changed,
        lastChangedAt: changed ? now : previous?.lastChangedAt || null,
      });
      const resource = catalog.resources.find((r) => r.id === source.id);
      if (resource) {
        resource.lastCheckedAt = now;
        resource.upstreamUpdatedAt =
          upstreamUpdatedAt || resource.upstreamUpdatedAt;
        if (changed) resource.contentChangedAt = now;
      }
      if (source.discover) {
        for (const item of discover(html, source)) {
          if (
            !catalog.resources.some((r) => r.url === item.url) &&
            !catalog.candidates.some((r) => r.url === item.url)
          )
            catalog.candidates.push({ ...item, discoveredAt: now });
        }
      }
      console.log(`已检查：${source.name}${changed ? "（发现变化）" : ""}`);
    } catch (error) {
      checks.push({
        ...oldChecks.get(source.id),
        id: source.id,
        name: source.name,
        ok: false,
        checkedAt: now,
        message: error.message,
      });
      console.log(`暂未检查：${source.name}；${error.message}`);
    }
  }
  catalog.checks = checks;
  catalog.collectedAt = now;
  catalog.candidates = catalog.candidates.slice(-300);
  await writeFile(
    catalogFile + ".tmp",
    JSON.stringify(catalog, null, 2) + "\n",
  );
  await rename(catalogFile + ".tmp", catalogFile);
  return {
    checked: checks.filter((x) => x.ok).length,
    total: checks.length,
    candidates: catalog.candidates.length,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(await collect());
}
