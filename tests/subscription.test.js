import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../server/db.js";
import { createApp, hashToken } from "../server/app.js";
import { sendDigest } from "../server/digest.js";
const env = {
  SMTP_HOST: "smtp.example.test",
  SMTP_FROM: "课程 <hello@example.test>",
  SMTP_USER: "test",
  SMTP_PASS: "test",
  PUBLIC_URL: "https://courses.example.test",
};
async function setup(t, { configured = true, failMail = false } = {}) {
  const db = openDatabase(":memory:"),
    messages = [];
  const mailer = {
    sendMail: async (m) => {
      if (failMail) throw Error("smtp failed");
      messages.push(m);
    },
  };
  const app = createApp({ db, env: configured ? env : {}, mailer });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    db.close();
  });
  const post = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  return { db, messages, mailer, base, post };
}
test("未配置邮件服务时不收集邮箱，不返回成功", async (t) => {
  const { db, post } = await setup(t, { configured: false });
  assert.equal(
    (
      await post("/api/subscribe", {
        email: "me@example.test",
        topics: ["智能体"],
        consent: true,
      })
    ).status,
    503,
  );
  assert.equal(db.prepare("SELECT count(*) n FROM subscribers").get().n, 0);
});
test("确认前不发送简报；确认、每周去重、旧邮件退订和删除形成完整闭环", async (t) => {
  const s = await setup(t);
  const request = {
    email: "Learner@example.test",
    topics: ["智能体"],
    consent: true,
  };
  assert.equal((await s.post("/api/subscribe", request)).status, 200);
  let subscriber = s.db.prepare("SELECT * FROM subscribers").get();
  assert.equal(subscriber.confirmed, 0);
  assert.equal(subscriber.email, "learner@example.test");
  const confirmation = s.messages[0].text.match(/token=([a-f0-9]{64})/)[1];
  assert.notEqual(subscriber.confirm_hash, confirmation);
  const catalog = {
    resources: [
      {
        id: "agent",
        title: "智能体课程",
        source: "大学",
        description: "学习智能体",
        topics: ["智能体"],
        url: "https://example.test/course",
        addedAt: "2026-09-13",
      },
    ],
  };
  assert.equal((await sendDigest({ ...s, env, catalog })).sent, 0);
  await fetch(s.base + `/api/confirm?token=${confirmation}`);
  assert.equal(
    s.db.prepare("SELECT confirmed FROM subscribers").get().confirmed,
    0,
  );
  assert.equal(
    (await s.post("/api/confirm", { token: confirmation })).status,
    200,
  );
  assert.equal(
    (await s.post("/api/confirm", { token: confirmation })).status,
    400,
  );
  assert.equal((await sendDigest({ ...s, env, catalog })).sent, 1);
  const unsubscribe = s.messages[1].text.match(/token=([a-f0-9]{64})/)[1];
  assert.equal((await sendDigest({ ...s, env, catalog })).sent, 0);
  s.db.prepare("UPDATE subscribers SET last_sent=?").run("2026-01-01");
  catalog.resources[0].contentChangedAt = "2026-09-20";
  assert.equal((await sendDigest({ ...s, env, catalog })).sent, 1);
  await fetch(s.base + `/api/unsubscribe?token=${unsubscribe}`);
  assert.equal(s.db.prepare("SELECT count(*) n FROM subscribers").get().n, 1);
  await s.post("/api/unsubscribe", { token: unsubscribe });
  for (const table of ["subscribers", "deliveries", "unsubscribe_links"])
    assert.equal(s.db.prepare(`SELECT count(*) n FROM ${table}`).get().n, 0);
});
test("拒绝未同意、未知主题和过期确认", async (t) => {
  const s = await setup(t);
  assert.equal(
    (
      await s.post("/api/subscribe", {
        email: "a@example.test",
        topics: ["智能体"],
        consent: false,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await s.post("/api/subscribe", {
        email: "a@example.test",
        topics: ["其他"],
        consent: true,
      })
    ).status,
    400,
  );
  await s.post("/api/subscribe", {
    email: "a@example.test",
    topics: ["智能体"],
    consent: true,
  });
  const confirmation = s.messages[0].text.match(/token=([a-f0-9]{64})/)[1];
  s.db.prepare("UPDATE subscribers SET confirm_expires=?").run("2000-01-01");
  assert.equal(
    (await s.post("/api/confirm", { token: confirmation })).status,
    400,
  );
});
test("邮件失败不遗留待确认邮箱", async (t) => {
  const s = await setup(t, { failMail: true });
  assert.equal(
    (
      await s.post("/api/subscribe", {
        email: "a@example.test",
        topics: ["智能体"],
        consent: true,
      })
    ).status,
    502,
  );
  assert.equal(s.db.prepare("SELECT count(*) n FROM subscribers").get().n, 0);
});
test("非本站来源不能提交订阅", async (t) => {
  const s = await setup(t);
  const r = await fetch(s.base + "/api/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.test",
    },
    body: JSON.stringify({
      email: "a@example.test",
      topics: ["智能体"],
      consent: true,
    }),
  });
  assert.equal(r.status, 403);
});
