# 服务器部署

推荐使用同源网站：反向代理提供安全连接，后台只监听本机的 3017 端口。

1. 将源码放到 `~/apps/frontier-courses/app`，在 `~/apps/frontier-courses/runtime` 安装并校验 Node.js 22 的官方发行版。
2. 在项目目录执行 `npm ci` 和 `npm run build`。
3. 复制 `.env.example` 为 `.env`，设置 `PORT=3017`、`HOST=127.0.0.1`、`PUBLIC_URL=https://你的域名`、`TRUST_PROXY=1`。保持数据库在私有目录中，权限只允许服务账号读写。
4. 将 `frontier-courses.service` 复制到 `~/.config/systemd/user/`，执行 `systemctl --user daemon-reload` 和 `systemctl --user enable --now frontier-courses`。
5. 管理员执行 `loginctl enable-linger 服务账号`，让服务开机启动且不依赖交互登录。
6. 为实际域名配置独立的反向代理站点，先检测配置，再平滑加载；使用证书工具签发安全证书。不要覆盖同机已有网站配置。
7. 完善邮件和模型配置后重启该项目服务。检查 `/api/status`；没有配置时返回未启用状态。

## 更新和备份

更新前备份 `.env`、私有数据库和服务器上采集后的 `public/catalog.json`。数据库在线备份应使用数据库的备份能力，或停止本项目服务后复制数据库及其日志，不能只复制正在写入的主文件。

数据库与密钥不得加入源码压缩包。发布新源码时保留环境配置和用户数据。启动新版本后检查主页、目录接口与订阅状态接口。出现失败只回退本项目版本，不修改其他服务。

服务日志可用 `journalctl --user -u frontier-courses` 查看。采集状态还会出现在网页的“来源与更新状态”中。模型或邮件服务失败只返回概括的错误，不输出密钥或个人信息。

定时采集是服务进程内的日程，要求实例持续运行。只运行一个调度实例，避免重复采集与发送。重启不会补发错过的日程；可手动运行 `npm run collect` 或 `npm run digest`。
