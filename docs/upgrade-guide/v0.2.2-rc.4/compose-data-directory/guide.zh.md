---
kind: upgrade-guide
description: "Compose 部署必须先将应用数据和工作区文件迁移到新的宿主机挂载目录，再重新创建 DSH 容器。"
---

# Compose 数据目录

[English](guide.md) | 中文

## 变更

Compose 部署将 `volumes/config/.dsh/` 挂载到 `/data`，将 `volumes/data/workspace/` 挂载到 `/workspace`。两个宿主机路径均相对于 `deploy/compose/`。现有部署的应用数据可能保存在 `dsh-data` 具名数据卷或 `./.dsh/` 中，工作区文件可能保存在 `./workspace/` 中。

## 迁移

1. 在移除或重新创建旧容器之前，按照[部署迁移命令](../../../../deploy/compose/README.zh.md#operate)停止服务，并将现有数据和工作区文件复制到新的宿主机目录。
2. 在 `deploy/compose/` 中执行 `docker compose up -d --wait`，启动更新后的部署。
3. 确认原账号可以登录，并检查会话和工作区文件是否可用。将全局 skill 放在 `deploy/compose/volumes/config/.dsh/skills/<skill-name>/SKILL.md` 下。
