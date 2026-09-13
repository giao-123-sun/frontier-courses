import cron from "node-cron";
import { createApp } from "./app.js";
import { openDatabase } from "./db.js";
import { sendDigest } from "./digest.js";
import { collect } from "../scripts/collect.js";
const db = openDatabase();
const app = createApp({ db });
const server = app.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () => console.log("前沿课程服务已启动"),
);
let collecting = false;
if (process.env.SCHEDULER_ENABLED !== "false") {
  cron.schedule(
    "17 3 * * *",
    async () => {
      if (collecting) return;
      collecting = true;
      try {
        console.log("采集完成", await collect());
      } catch {
        console.error("采集失败，保留上次目录");
      } finally {
        collecting = false;
      }
    },
    { timezone: "Asia/Shanghai" },
  );
  cron.schedule(
    "0 9 * * 1",
    async () => {
      try {
        console.log("简报发送完成", await sendDigest({ db }));
      } catch {
        console.error("简报发送失败，等待下次任务");
      }
    },
    { timezone: "Asia/Shanghai", noOverlap: true },
  );
  cron.schedule(
    "10 2 * * *",
    () => {
      db.prepare(
        "DELETE FROM subscribers WHERE confirmed=0 AND last_requested<?",
      ).run(new Date(Date.now() - 48 * 3600000).toISOString());
    },
    { timezone: "Asia/Shanghai" },
  );
}
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
