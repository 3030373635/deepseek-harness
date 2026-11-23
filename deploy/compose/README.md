---
description: "Deploy the customized DSH Web application on a Linux server with Docker Compose, LAN HTTP, and persistent data."
---

# Deploy with Docker Compose

English | [中文](README.zh.md)

## Summary

Run the customized Web application on a Linux server and access it over LAN HTTP. The image builds this checkout with `node:24-trixie` and serves HTTP and WebSocket traffic directly. A host directory preserves skills, accounts, configuration, signing keys, and sessions, while a separate directory supplies the agent workspace. Restricted command execution also requires a usable Linux sandbox backend.

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

Prepare the server and its LAN address before starting the service. Docker builds the Linux dependencies inside the image; a host Node.js installation is unnecessary.

- Install Docker Engine and Docker Compose v2 with BuildKit support. The build needs access to the Node image, Debian packages, the configured npm registry, and PyPI.
- Use a trusted LAN: HTTP does not encrypt passwords or session cookies. Publish the service on the server’s LAN IP.
- Provide an enforced Landlock backend or a usable bubblewrap backend for restricted shell commands. Compiling the launcher does not add missing kernel capabilities.

-----

<a id="deploy"></a>
## Deploy

Start from the repository root. Keep the following commands in `deploy/compose/`.

```sh
cd deploy/compose
cp .env.example .env
mkdir -p volumes/data/workspace volumes/config/.dsh/skills
chmod 700 volumes/config/.dsh
```

Edit `.env`: replace `DSH_BIND_ADDRESS` with a concrete LAN IP of the Linux server, and set `DSH_PUBLIC_URL` to the HTTP address browsers will use, for example `http://192.168.3.86:3080`. Set `DSH_HTTP_PORT` to that published port; it defaults to `3080`. Set `DSH_UID` and `DSH_GID` to the ordinary Linux user and group that own the workspace (`id -u` and `id -g`); the user ID must be nonzero. The entrypoint accepts only an HTTP origin without a path prefix, query, fragment, or embedded credentials.

Compose publishes the DSH container’s port `3080` on the configured host IP and port. DSH listens on its concrete container IP and admits the public authority through its request-source policy.

Build and start the service. The commit value records the source revision without copying `.git` into the image. Source compilation, aggregate type checks, and the custom plugin tests run during the image build; aggregate checks run serially.

```sh
DSH_CLIENT_COMMIT_HASH="$(git rev-parse HEAD)" docker compose build
docker compose up -d --wait
```

Open `DSH_PUBLIC_URL` in your browser. On a fresh deployment, the registration page creates the first local account and signs you in. Complete this step before making the service reachable by other users. If the deployment already has an account, sign in with your existing credentials. See the [custom plugin documentation](../../local-plugins/dsh-web-custom/README.md) for account permissions and authentication.

Place projects under `volumes/data/workspace/`, or change its bind-mount source in `compose.yaml` to an existing server directory. The application and its commands see that directory as `/workspace` and access host files through the configured mounts.

Agent commands can run `python` or `python3` with the preinstalled libraries to work with Word, Excel, PowerPoint, PDF, and images, analyze data, and parse HTML and XML. Edit [requirements.txt](requirements.txt) and rebuild the image to change those libraries.

Use `soffice --headless --convert-to pdf example.docx` inside the container to convert an Office document to PDF. Run the command from a writable directory to save the PDF there.

On first entry, an installation with no registered workspaces or session history automatically creates `/workspace/deepseek-harness/default-workspace`. The Docker overlay sets `workspace-controller.config.documentsDirectory` to `/workspace`, so creation does not require a system Documents directory. The runtime UID/GID must have write access to the mounted directory.

The host directory `volumes/config/.dsh/` is mounted at `/data`, the container's `DSH_HOME`. Add global skills at `volumes/config/.dsh/skills/<skill-name>/SKILL.md` for DSH to scan under `/data/skills/`. Git and the image build context exclude `volumes/`. Keep `volumes/config/.dsh/` accessible only to the deployment account because it holds private application data.

-----

<a id="configuration"></a>
## Configuration

The environment file controls the deployment address, the workspace picker's starting directory, the browser-tab title, and the optional build registry. DSH serves from `/` and owns request trust and upload admission.

| Variable | Value |
|---|---|
| `DSH_BIND_ADDRESS` | Required host IP for publishing HTTP; use the Linux server's own LAN IP. |
| `DSH_HTTP_PORT` | Published HTTP port; defaults to `3080`. |
| `DSH_UID` / `DSH_GID` | Runtime user and group IDs; both default to `1000` and must match workspace ownership. |
| `DSH_PUBLIC_URL` | Required browser-facing HTTP origin; its authority also configures DSH request trust. |
| `DSH_WEB_HOME` | `HOME` for the Web process and the starting directory for the workspace picker. Defaults to `/workspace`. Use an absolute path the runtime user can read and traverse inside the container. |
| `DSH_CLIENT_TITLE` | Main interface browser-tab product title; empty or absent uses `衡枢`. Rebuild the image after changing it. |
| `DSH_BUILD_CHECK_HEAP_MB` | Node heap limit in MiB for each serial aggregate type check. Empty or absent uses `8192`, matching the repository build checks. Docker also needs memory for allocations outside the Node heap. |
| `DSH_NPM_REGISTRY` | Optional build registry; empty or absent uses `https://registry.npmjs.org`. |
| `DSH_CLIENT_COMMIT_HASH` | Build-time source commit, supplied by the build command. |

The entrypoint sets the `node` account to the configured UID/GID, assigns the private data volume to that account when necessary, and runs DSH as that account. It leaves host workspace ownership unchanged. It initializes the Web profile and installs the bundled local customization on each start. It uses the compiled `dsh` CLI and an owned browser-directory-picker overlay. The image does not include a pre-created account.

-----

<a id="operate"></a>
## Operate and update

Inspect the service or stop it with Compose. Both `down` and `down --volumes` preserve the host directories under `volumes/`. Back up those directories before replacing or moving a deployment.

```sh
docker compose ps
docker compose logs --tail=100 dsh
docker compose stop
```

To migrate an existing deployment, stop it before copying its data. Run the applicable copy commands from `deploy/compose/` before recreating or removing the old container. Start with absent destination directories so the copy cannot merge with data from another deployment.

```sh
docker compose stop
mkdir -p volumes/config volumes/data
```

If the old workspace is in `./workspace/`, copy it to the new location.

```sh
cp -a workspace volumes/data/
```

If the old `/data` mount uses the host directory `./.dsh/`, copy that directory.

```sh
cp -a .dsh volumes/config/
```

If the old `/data` mount uses the `dsh-data` named volume, copy its contents from the stopped container.

```sh
mkdir -m 700 volumes/config/.dsh
docker compose cp dsh:/data/. volumes/config/.dsh/
chmod 700 volumes/config/.dsh
```

After updating the checkout, repeat the build and start commands from [Deploy](#deploy). Verify that you can sign in and that your sessions and workspace files are present before removing any original data.

For an existing HTTPS deployment, follow the [HTTP migration guide](../../docs/upgrade-guide/v0.2.3-alpha.2/compose-http/guide.md) to remove the Nginx container and update the published address.

-----

<a id="troubleshooting"></a>
## Troubleshooting

Use service logs to distinguish transport, authentication, and command-sandbox failures.

- **403:** ensure the browser uses exactly `DSH_PUBLIC_URL`, including its port. Keep the browser address consistent with this origin; do not rewrite `Host` or `Origin` to bypass DSH source checks.
- **Unhealthy DSH:** inspect its logs. An invalid public URL, missing build artifacts, or a failed required plugin prevents readiness. The health check sends the configured public Host to the container’s login page and follows the initial registration redirect.
- **Connection refused:** check `DSH_BIND_ADDRESS`, `DSH_HTTP_PORT`, and the server firewall. Use `http://`, with the configured published port.
- **Sandbox unavailable:** a working Web page does not establish command confinement. Some Docker Desktop kernels lack Landlock and deny user namespaces; validate the Linux server before relying on restricted execution. Do not add privileged mode or disable the product sandbox to hide this failure.

Probe the compiled Landlock launcher in the running container. A nonzero exit reports an unavailable backend; use the [sandbox provider reference](../../packages/sandbox/sandbox-local/README.md) to assess other supported backends.

```sh
docker compose exec --user node dsh node --input-type=module -e 'import { launcherPath } from "/app/native/system/packages/entry/lib/index.js"; import { spawnSync } from "node:child_process"; const result = spawnSync(launcherPath(), ["--probe"], { stdio: "inherit" }); process.exit(result.status ?? 1);'
```

-----

<a id="further-exploration"></a>
## Further exploration

- [Public deployments](../../docs/user/guide/public-deployments.md): DSH listener, authority trust, and HTTPS proxy requirements.

## Dev Note

None.
