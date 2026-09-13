import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db.js";
import { mailReady, createMailer, escapeHtml } from "./mail.js";
import { hashToken } from "./app.js";
export function eligibleResources(resources, subscriber, db) {
  const selected = JSON.parse(subscriber.topics);
  return resources
    .filter((r) => r.topics.some((t) => selected.includes(t)))
    .filter((r) => {
      const version = r.contentChangedAt || r.addedAt;
      return !db
        .prepare(
          "SELECT 1 FROM deliveries WHERE email=? AND resource_id=? AND version=?",
        )
        .get(subscriber.email, r.id, version);
    });
}
export async function sendDigest({
  db,
  env = process.env,
  mailer,
  catalog,
} = {}) {
  if (!mailReady(env)) return { sent: 0, skipped: "发件服务尚未配置" };
  catalog ||= JSON.parse(await readFile("public/catalog.json", "utf8"));
  mailer ||= createMailer(env);
  let sent = 0,
    failed = 0;
  const subscribers = db
    .prepare("SELECT * FROM subscribers WHERE confirmed=1")
    .all();
  for (const subscriber of subscribers) {
    if (
      subscriber.last_sent &&
      Date.now() - new Date(subscriber.last_sent) < 6 * 86400000
    )
      continue;
    const resources = eligibleResources(catalog.resources, subscriber, db);
    if (!resources.length) continue;
    const unsubscribe = randomBytes(32).toString("hex");
    // 发送失败时保留旧退订链接，成功后才写入新令牌。
    const url = `${env.PUBLIC_URL}/api/unsubscribe?token=${unsubscribe}`;
    const text =
      `本周为你整理了 ${resources.length} 项学习资源。\n\n` +
      resources
        .map(
          (r) => `${r.title}\n${r.source} · ${r.topics.join("、")}\n${r.url}`,
        )
        .join("\n\n") +
      `\n\n退订并删除邮箱信息：${url}`;
    try {
      await mailer.sendMail({
        from: env.SMTP_FROM,
        to: subscriber.email,
        subject: `前沿课程 · ${resources.length} 项值得关注的学习更新`,
        text,
        html: `<h2>你的每周前沿简报</h2>${resources.map((r) => `<h3><a href="${escapeHtml(r.url)}">${escapeHtml(r.title)}</a></h3><p>${escapeHtml(r.source)} · ${escapeHtml(r.description)}</p>`).join("")}<hr><a href="${escapeHtml(url)}">退订并删除邮箱信息</a>`,
      });
      const now = new Date().toISOString();
      db.transaction(() => {
        db.prepare(
          "INSERT OR IGNORE INTO unsubscribe_links(hash,email) VALUES(?,?)",
        ).run(subscriber.unsubscribe_hash, subscriber.email);
        for (const r of resources)
          db.prepare("INSERT OR IGNORE INTO deliveries VALUES(?,?,?,?)").run(
            subscriber.email,
            r.id,
            r.contentChangedAt || r.addedAt,
            now,
          );
        db.prepare(
          "UPDATE subscribers SET last_sent=?,unsubscribe_hash=? WHERE email=?",
        ).run(now, hashToken(unsubscribe), subscriber.email);
      })();
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const db = openDatabase();
  console.log(await sendDigest({ db }));
  db.close();
}
