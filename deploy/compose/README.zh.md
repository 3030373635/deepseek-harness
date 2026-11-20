---
description: "通过 Docker Compose、Nginx HTTPS 和持久化数据，在 Linux 服务器上部署定制 DSH Web。"
---

# 使用 Docker Compose 部署

[English](README.md) | 中文

## 概述

在 Linux 服务器上运行定制 Web 应用，并通过局域网 HTTPS 访问。镜像使用 `node:24-trixie` 构建当前源码；Nginx 终止 TLS，并将 HTTP 和 WebSocket 流量转发到 DSH。宿主机目录保存 skill、账号、配置、签名密钥和会话，独立目录提供 Agent 工作区。受限命令执行还需要可用的 Linux 沙箱后端。

## 目录

- [前提条件](#prerequisites)
- [部署](#deploy)
- [配置](#configuration)
- [运行与更新](#operate)
- [故障排查](#troubleshooting)
- [进一步阅读](#further-exploration)

-----

<a id="prerequisites"></a>
## 前提条件

启动服务前准备好服务器和证书。Docker 在镜像内构建 Linux 依赖，宿主机不需要安装 Node.js。

- 安装支持 BuildKit 的 Docker Engine 和 Docker Compose v2。构建需要访问 Node 和 Nginx 镜像、Debian 软件包以及所配置的 npm 仓库。
- 使用 subject alternative names 包含浏览器访问 IP 或主机名的 HTTPS 证书。浏览器必须信任签发 CA；私钥必须是无口令的 PEM 文件。
- 为受限 Shell 命令提供能实际执行限制的 Landlock 后端或可用的 bubblewrap 后端。编译启动器无法补足内核缺失的能力。

-----

<a id="deploy"></a>
## 部署

从仓库根目录开始，后续命令均在 `deploy/compose/` 中执行。

```sh
cd deploy/compose
cp .env.example .env
mkdir -p certs workspace .dsh/skills
chmod 700 .dsh
```

编辑 `.env`：把 `DSH_BIND_ADDRESS` 换成 Linux 服务器的具体局域网 IP，并把 `DSH_PUBLIC_URL` 设置为浏览器实际使用的 HTTPS 地址。`DSH_HTTPS_PORT` 不是 443 时，URL 需要包含该端口。将 `DSH_UID` 和 `DSH_GID` 设置为工作区所属普通 Linux 用户和组的 ID（通过 `id -u` 和 `id -g` 查看）；用户 ID 必须非零。入口脚本仅接受 HTTPS origin，不接受路径前缀、query、fragment 或内嵌凭据。

将证书链保存为 `certs/server.crt`，私钥保存为 `certs/server.key`。Git 忽略这些文件及 `.env`，镜像构建上下文也排除它们。仅 Nginx 发布宿主机端口；DSH 在 Compose 网络内监听容器自身的具体 IP。

构建并启动服务。commit 值记录源码版本，避免将 `.git` 复制进镜像。镜像构建会执行源码编译、汇总类型检查和定制插件测试；汇总检查串行运行。

```sh
DSH_CLIENT_COMMIT_HASH="$(git rev-parse HEAD)" docker compose build
docker compose up -d --wait
```

在交互式终端中创建本地账号，然后在浏览器中打开 `DSH_PUBLIC_URL`。命令会要求输入并确认密码，且不回显密码。[定制插件文档](../../local-plugins/dsh-web-custom/README.zh.md)说明账号权限和认证行为。

```sh
docker compose exec --user node dsh node /app/local-plugins/dsh-web-custom/lib/create-user.js operator
```

将项目放入 `workspace/`，或把 `compose.yaml` 中该绑定挂载的来源改为服务器上的现有目录。应用及其命令通过 `/workspace` 访问该目录；容器无法直接访问挂载范围以外的宿主机路径。

首次进入时，没有已登记工作区和会话历史的安装会自动创建 `/workspace/deepseek-harness/default-workspace`。Docker overlay 将 `workspace-controller.config.documentsDirectory` 设置为 `/workspace`，因此创建不依赖系统 Documents 目录。运行时 UID/GID 必须对挂载目录有写权限。

宿主机的 `.dsh/` 挂载到容器的 `/data`，即容器的 `DSH_HOME`。将全局 skill 放在 `.dsh/skills/<skill-name>/SKILL.md`，DSH 会扫描 `/data/skills/`。Git 和镜像构建上下文均排除 `.dsh/`。该目录还保存应用的私有数据，应仅允许部署账号访问。

-----

<a id="configuration"></a>
## 配置

环境文件控制部署地址、浏览器标签页标题和可选的构建仓库。Nginx 从 `/` 提供服务；代理专属设置在 [nginx.conf](nginx.conf) 中修改。上传请求体以流式转发，代理不设置独立的大小上限；DSH 拥有上传准入判断。

| 变量 | 含义 |
|---|---|
| `DSH_BIND_ADDRESS` | 必填的 HTTPS 发布地址，使用 Linux 服务器自身的局域网 IP。 |
| `DSH_HTTPS_PORT` | 发布的 HTTPS 端口，默认为 `3443`。 |
| `DSH_UID` / `DSH_GID` | 运行用户和组的 ID，均默认为 `1000`，需要匹配工作区的所有权。 |
| `DSH_PUBLIC_URL` | 必填的浏览器 HTTPS origin，其 authority 同时配置 DSH 请求信任。 |
| `DSH_CLIENT_TITLE` | 主界面浏览器标签页的产品标题；为空或缺省时使用「衡枢」。修改后需重新构建镜像。 |
| `DSH_NPM_REGISTRY` | 可选的构建仓库；为空或缺省时使用 `https://registry.npmjs.org`。 |
| `DSH_CLIENT_COMMIT_HASH` | 构建时的源码 commit，由构建命令传入。 |

入口脚本把 `node` 账号设置为所配置的 UID/GID，在需要时将私有数据卷的所有权分配给该账号，并以该账号运行 DSH。它不会修改宿主工作区的所有权。每次启动时会初始化 Web profile 并安装镜像内的本地定制包，使用已编译的 `dsh` CLI 和本目录拥有的浏览器目录选择器 overlay。镜像不包含预先创建的账号或 TLS 私钥。

-----

<a id="operate"></a>
## 运行与更新

通过 Compose 查看服务或停止服务。`down` 和 `down --volumes` 都保留宿主机目录 `.dsh/` 与 `workspace/`。替换或迁移部署前，备份这两个目录。

```sh
docker compose ps
docker compose logs --tail=100 dsh nginx
docker compose stop
```

若部署使用原来的 `dsh-data:/data` 具名数据卷，在重新创建或移除旧 DSH 容器之前复制其数据。仅在 `.dsh/` 尚不存在时执行以下命令；原数据卷会保留，可用于备份恢复。

```sh
docker compose stop
mkdir -m 700 .dsh
docker compose cp dsh:/data/. - | tar -xpf - -C .dsh
chmod 700 .dsh
mkdir -p .dsh/skills
```

更新源码后，重复[部署](#deploy)中的构建和启动命令。将 `.dsh/` 与 `workspace/` 保留在 `compose.yaml` 旁边，以复用其中的数据。替换证书文件后重启 Nginx。

```sh
docker compose restart nginx
```

-----

<a id="troubleshooting"></a>
## 故障排查

通过服务日志区分传输、认证和命令沙箱失败。

- **403：**确保浏览器使用与 `DSH_PUBLIC_URL` 一致的地址及端口。代理保留 `Host` 和 `Origin`，不要通过改写它们绕过 DSH 来源检查。
- **DSH 不健康：**查看其日志。无效的公开 URL、缺失构建产物或必需插件失败会阻止就绪；Nginx 等待 DSH 健康检查通过；自身的健康检查也会等待内部 HTTPS 和代理可用，但不验证证书链。
- **证书错误：**确认证书覆盖访问 IP 或主机名，且客户端信任签发 CA。Nginx 需要两个已配置的 PEM 文件。
- **沙箱不可用：**网页可访问并不表示命令限制可用。部分 Docker Desktop 内核缺少 Landlock，并禁止用户命名空间；依赖受限执行前需验证 Linux 服务器。不要通过特权模式或停用产品沙箱掩盖该失败。

在运行中的容器里探测已编译的 Landlock 启动器。非零退出表示该后端不可用；其他受支持后端见[沙箱提供方参考](../../packages/sandbox/sandbox-local/README.zh.md)。

```sh
docker compose exec --user node dsh node --input-type=module -e 'import { launcherPath } from "/app/native/system/packages/entry/lib/index.js"; import { spawnSync } from "node:child_process"; const result = spawnSync(launcherPath(), ["--probe"], { stdio: "inherit" }); process.exit(result.status ?? 1);'
```

-----

<a id="further-exploration"></a>
## 进一步阅读

- [公开部署](../../docs/user/guide/public-deployments.zh.md)：DSH 监听器、authority 信任和 HTTPS 代理要求。
- [Docker Compose 启动顺序](https://docs.docker.com/compose/how-tos/startup-order/)：依赖健康检查。

## 开发备注

无。
