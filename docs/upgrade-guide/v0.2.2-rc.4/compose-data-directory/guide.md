---
kind: upgrade-guide
description: "Compose deployments must migrate application data and workspace files to the new host mount directories before recreating the DSH container."
---

# Compose data directory

English | [中文](guide.zh.md)

## Change

The Compose deployment mounts `volumes/config/.dsh/` at `/data` and `volumes/data/workspace/` at `/workspace`. Both host paths are relative to `deploy/compose/`. Existing deployments may have application data in the `dsh-data` named volume or `./.dsh/`, and workspace files in `./workspace/`.

## Migration

1. Before removing or recreating the old container, follow the [deployment migration commands](../../../../deploy/compose/README.md#operate) to stop services and copy the existing data and workspace files into the new host directories.
2. Start the updated deployment with `docker compose up -d --wait` from `deploy/compose/`.
3. Confirm that the existing account can sign in and its sessions and workspace files are present. Add global skills under `deploy/compose/volumes/config/.dsh/skills/<skill-name>/SKILL.md`.
