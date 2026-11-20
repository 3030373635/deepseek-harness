---
kind: upgrade-guide
description: "Compose 部署必须先将现有具名数据卷复制到宿主机的 .dsh 目录，再重新创建 DSH 容器。"
---

# Compose 数据目录

[English](guide.md) | 中文

## 变更

`deploy/compose/compose.yaml` 将宿主机目录 `./.dsh` 挂载到 `/data`，替代 `dsh-data` 具名数据卷。现有 Compose 部署必须在重新创建 DSH 容器之前迁移账号、配置、密钥和会话。容器继续使用 `DSH_HOME=/data`；全局 skill 保存在宿主机目录 `.dsh/skills/`。

## 迁移

1. 在移除或重新创建旧容器之前，按照[部署迁移命令](../../../../deploy/compose/README.zh.md#operate)停止服务，并将 `/data` 复制到新建的 `deploy/compose/.dsh/` 目录。确认复制的数据可用之前，保留原具名数据卷。
2. 在 `deploy/compose/` 中执行 `docker compose up -d --wait`，启动更新后的部署。
3. 确认原账号可以登录，且会话仍在。将全局 skill 放在 `deploy/compose/.dsh/skills/<skill-name>/SKILL.md` 下。
