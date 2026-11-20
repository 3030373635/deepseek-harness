---
kind: upgrade-guide
description: "Compose deployments must copy existing named-volume data into the host .dsh directory before recreating the DSH container."
---

# Compose data directory

English | [中文](guide.zh.md)

## Change

`deploy/compose/compose.yaml` mounts the host directory `./.dsh` at `/data` instead of the `dsh-data` named volume. Existing Compose deployments must migrate accounts, configuration, keys, and sessions before recreating the DSH container. The container continues to use `DSH_HOME=/data`; global skills are stored in the host directory `.dsh/skills/`.

## Migration

1. Before removing or recreating the old container, follow the [deployment migration commands](../../../../deploy/compose/README.md#operate) to stop services and copy `/data` into a new `deploy/compose/.dsh/` directory. Keep the original named volume until the copied data has been verified.
2. Start the updated deployment with `docker compose up -d --wait` from `deploy/compose/`.
3. Confirm that the existing account can sign in and its sessions are present. Add global skills under `deploy/compose/.dsh/skills/<skill-name>/SKILL.md`.
