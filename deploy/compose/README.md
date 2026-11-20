---
description: "Deploy the customized DSH Web application on a Linux server with Docker Compose, Nginx HTTPS, and persistent data."
---

# Deploy with Docker Compose

English | [中文](README.zh.md)

## Summary

Run the customized Web application on a Linux server and access it over LAN HTTPS. The image builds this checkout with `node:24-trixie`; Nginx terminates TLS and forwards HTTP and WebSocket traffic to DSH. A named volume preserves accounts, configuration, signing keys, and sessions, while a separate directory supplies the agent workspace. Restricted command execution also requires a usable Linux sandbox backend.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deploy](#deploy)
- [Configuration](#configuration)
- [Operate and update](#operate)
- [Troubleshooting](#troubleshooting)
- [Further exploration](#further-exploration)

-----

<a id="prerequisites"></a>
## Prerequisites

Prepare the server and certificate before starting the services. Docker builds the Linux dependencies inside the image; a host Node.js installation is unnecessary.

- Install Docker Engine and Docker Compose v2 with BuildKit support. The build needs access to the Node and Nginx images, Debian packages, and the configured npm registry.
- Use an HTTPS certificate whose subject alternative names include the browser-facing IP or hostname. Browsers must trust its issuing CA; the private key must be an unencrypted PEM file.
- Provide an enforced Landlock backend or a usable bubblewrap backend for restricted shell commands. Compiling the launcher does not add missing kernel capabilities.

-----

<a id="deploy"></a>
## Deploy

Start from the repository root. Keep the following commands in `deploy/compose/`.

```sh
cd deploy/compose
cp .env.example .env
mkdir -p certs workspace
```

Edit `.env`: replace `DSH_BIND_ADDRESS` with a concrete LAN IP of the Linux server, and set `DSH_PUBLIC_URL` to the HTTPS address browsers will use. Include `DSH_HTTPS_PORT` in the URL when it is not 443. Set `DSH_UID` and `DSH_GID` to the ordinary Linux user and group that own the workspace (`id -u` and `id -g`); the user ID must be nonzero. The entrypoint accepts only an HTTPS origin without a path prefix, query, fragment, or embedded credentials.

Place the certificate chain at `certs/server.crt` and its private key at `certs/server.key`. These files and `.env` are ignored by Git and excluded from the image build context. Only Nginx publishes a host port; DSH listens on its concrete container IP inside the Compose network.

Build and start the services. The commit value records the source revision without copying `.git` into the image. Source compilation, aggregate type checks, and the custom plugin tests run during the image build; aggregate checks run serially.

```sh
DSH_CLIENT_COMMIT_HASH="$(git rev-parse HEAD)" docker compose build
docker compose up -d --wait
```

Create a local account in an interactive terminal, then open `DSH_PUBLIC_URL` in your browser. The command requests and confirms the password without echoing it. The [custom plugin documentation](../../local-plugins/dsh-web-custom/README.md) describes account permissions and authentication.

```sh
docker compose exec --user node dsh node /app/local-plugins/dsh-web-custom/lib/create-user.js operator
```

Place projects under `workspace/`, or change its bind-mount source in `compose.yaml` to an existing server directory. The application and its commands see that directory as `/workspace`; host paths outside the mounts are not available inside the container.

-----

<a id="configuration"></a>
## Configuration

The environment file controls the deployment address, browser-tab title, and optional build registry. Nginx serves from `/`; edit [nginx.conf](nginx.conf) for proxy-specific settings. Upload request bodies are streamed without a separate proxy size cap; DSH owns upload admission.

| Variable | Value |
|---|---|
| `DSH_BIND_ADDRESS` | Required host IP for publishing HTTPS; use the Linux server's own LAN IP. |
| `DSH_HTTPS_PORT` | Published HTTPS port; defaults to `3443`. |
| `DSH_UID` / `DSH_GID` | Runtime user and group IDs; both default to `1000` and must match workspace ownership. |
| `DSH_PUBLIC_URL` | Required browser-facing HTTPS origin; its authority also configures DSH request trust. |
| `DSH_CLIENT_TITLE` | Main interface browser-tab product title; empty or absent uses `衡枢`. Rebuild the image after changing it. |
| `DSH_NPM_REGISTRY` | Optional build registry; empty or absent uses `https://registry.npmjs.org`. |
| `DSH_CLIENT_COMMIT_HASH` | Build-time source commit, supplied by the build command. |

The entrypoint sets the `node` account to the configured UID/GID, assigns the private data volume to that account when necessary, and runs DSH as that account. It leaves host workspace ownership unchanged. It initializes the Web profile and installs the bundled local customization on each start. It uses the compiled `dsh` CLI and an owned browser-directory-picker overlay. The image does not include a pre-created account or a TLS private key.

-----

<a id="operate"></a>
## Operate and update

Inspect the services or stop them with Compose. `down` preserves the `dsh-data` volume; adding `--volumes` deletes its accounts, configuration, keys, and sessions. Back up this volume and the workspace before replacing or moving a deployment.

```sh
docker compose ps
docker compose logs --tail=100 dsh nginx
docker compose down
```

After updating the checkout, repeat the build and start commands from [Deploy](#deploy). Keep the same Compose project name to reuse its volume; the default project name is `dsh-web`. Restart Nginx after replacing its certificate files.

```sh
docker compose restart nginx
```

-----

<a id="troubleshooting"></a>
## Troubleshooting

Use service logs to distinguish transport, authentication, and command-sandbox failures.

- **403:** ensure the browser uses exactly `DSH_PUBLIC_URL`, including its port. The proxy preserves `Host` and `Origin`; do not rewrite them to bypass DSH source checks.
- **Unhealthy DSH:** inspect its logs. An invalid public URL, missing build artifacts, or a failed required plugin prevents readiness; Nginx waits for the DSH health check; its own health check also waits for internal HTTPS and proxying, without verifying the certificate chain.
- **Certificate error:** verify that the certificate covers the access IP or hostname and its issuing CA is trusted on the client. Nginx requires both configured PEM files.
- **Sandbox unavailable:** a working Web page does not establish command confinement. Some Docker Desktop kernels lack Landlock and deny user namespaces; validate the Linux server before relying on restricted execution. Do not add privileged mode or disable the product sandbox to hide this failure.

Probe the compiled Landlock launcher in the running container. A nonzero exit reports an unavailable backend; use the [sandbox provider reference](../../packages/sandbox/sandbox-local/README.md) to assess other supported backends.

```sh
docker compose exec --user node dsh node --input-type=module -e 'import { launcherPath } from "/app/native/system/packages/entry/lib/index.js"; import { spawnSync } from "node:child_process"; const result = spawnSync(launcherPath(), ["--probe"], { stdio: "inherit" }); process.exit(result.status ?? 1);'
```

-----

<a id="further-exploration"></a>
## Further exploration

- [Public deployments](../../docs/user/guide/public-deployments.md): DSH listener, authority trust, and HTTPS proxy requirements.
- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/): dependency health checks.

## Dev Note

None.
