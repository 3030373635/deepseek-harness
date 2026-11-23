---
kind: upgrade-guide
description: "The fork's Compose deployment replaces Nginx HTTPS with a direct LAN HTTP listener and renames its published-port setting."
---

# Compose serves LAN HTTP directly

English | [中文](guide.zh.md)

## Change

The fork's `deploy/compose/` deployment publishes DSH directly over HTTP. The `nginx` service, certificate mounts, and `nginx.conf` are removed. `DSH_HTTP_PORT` replaces `DSH_HTTPS_PORT` and defaults to `3080`; `DSH_PUBLIC_URL` must use `http://`. The local login plugin accepts trusted LAN HTTP authorities while retaining Host and Origin checks, one-use verification images, and HttpOnly, SameSite=Strict session cookies. HTTP does not encrypt passwords or cookies; use this deployment on a trusted LAN.

## Migration

1. From `deploy/compose/`, edit the existing `.env`: replace `DSH_HTTPS_PORT` with `DSH_HTTP_PORT=3080`, keep the server's LAN IP in `DSH_BIND_ADDRESS`, and set `DSH_PUBLIC_URL=http://<LAN-IP>:3080`. Use the same port in both settings if you choose a different one.
2. Run `DSH_CLIENT_COMMIT_HASH="$(git rev-parse HEAD)" docker compose build`. Confirm that the image builds successfully before replacing the running containers.
3. Run `docker compose down --remove-orphans` to stop the deployment and remove its Nginx container, then run `docker compose up -d --wait`. Keep `volumes/config/.dsh/` and `volumes/data/workspace/`; they contain the existing accounts, configuration, sessions, and workspace files. Certificate files are unused and can remain outside Git and the image.
4. Open the HTTP URL from the same LAN and sign in again with an existing account. Confirm that refresh preserves the login, signing out returns to `/login`, and the existing sessions and workspace files are available. The account database path is unchanged; HTTPS cookies do not authenticate the new HTTP origin.
