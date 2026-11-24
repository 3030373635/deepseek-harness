---
kind: upgrade-guide
description: "此 fork 的 Compose 部署用直接提供局域网 HTTP 的监听替代 Nginx HTTPS，并重命名发布端口设置。"
---

# Compose 直接提供局域网 HTTP

[English](guide.md) | 中文

## 变更

此 fork 的 `deploy/compose/` 部署通过 HTTP 直接发布 DSH。`nginx` 服务、证书挂载和 `nginx.conf` 已移除。`DSH_HTTP_PORT` 替代 `DSH_HTTPS_PORT`，默认值为 `3080`；`DSH_PUBLIC_URL` 必须使用 `http://`。本地登录插件接受受信任的局域网 HTTP authority，并保留 Host 和 Origin 校验、一次性验证码以及 HttpOnly、SameSite=Strict 会话 Cookie。HTTP 不加密密码和 Cookie；此部署用于可信局域网。

账号数据库为空时，实例从 `/login` 返回 HTTP 303，跳转到 `/register`。Compose 健康检查会跟随这次跳转。Web 表单创建首个账号后自动登录。

Compose 镜像通过启动补丁加载本地登录和界面定制。启动时会从 Web profile 移除旧的 `dsh-web-custom` 安装，「插件」页面随即移除它的开关。账号数据库仍保存在数据卷中。

## 迁移

1. 在 `deploy/compose/` 中编辑现有 `.env`：将 `DSH_HTTPS_PORT` 替换为 `DSH_HTTP_PORT=3080`，在 `DSH_BIND_ADDRESS` 中保留服务器局域网 IP，并设置 `DSH_PUBLIC_URL=http://<LAN-IP>:3080`。选择其他端口时，两处端口需保持一致。
2. 如果旧 profile 覆盖了定制设置，请将原值移入镜像的[认证](../../../../local-plugins/dsh-web-custom/auth.patch.yml)或[界面](../../../../local-plugins/dsh-web-custom/ui.patch.yml)补丁，并保留自定义的账号数据库路径。运行 `DSH_CLIENT_COMMIT_HASH="$(git rev-parse HEAD)" docker compose build`。确认镜像构建成功后，再替换运行中的容器。
3. 运行 `docker compose down --remove-orphans`，停止部署并移除其 Nginx 容器，再运行 `docker compose up -d --wait`。保留 `volumes/config/.dsh/` 和 `volumes/data/workspace/`；其中存有现有账号、配置、会话和工作区文件。证书文件不再使用，可以继续放在 Git 和镜像之外。
4. 从同一局域网打开 HTTP 地址。有账号时用现有账号重新登录，数据库为空时使用注册页。确认刷新后保留登录状态、退出后返回 `/login`，且已有的会话和工作区文件可用。账号数据库路径保持不变；HTTPS Cookie 不会用于认证新的 HTTP origin。
5. 如果你为 `/login` 设置了独立健康探针，请让其跟随到 `/register` 的站内跳转，并确认全新实例的目标页返回 HTTP 200。
6. 升级后打开「插件 → 内置插件配置 → 衡枢定制」，确认详情页只展示本地登录与品牌说明。
