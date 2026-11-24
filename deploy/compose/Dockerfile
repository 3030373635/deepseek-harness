FROM node:24.22.3-trixie

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bubblewrap \
        gosu \
        libreoffice \
        musl-tools \
        python3 \
        python3-venv \
    && rm -rf /var/lib/apt/lists/*

ARG NPM_REGISTRY=https://registry.npmjs.org
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_MCP_BROWSER=chromium
RUN npm install --global @playwright/cli@0.1.25 playwright@1.66.0-alpha-2026-11-18 --registry="$NPM_REGISTRY" \
    && playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

ENV CI=true \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    DSH_GATE_CONCURRENCY=2

WORKDIR /app
COPY package.json ./
RUN npm install --global "$(node -p 'require("./package.json").packageManager')" --registry="$NPM_REGISTRY"

COPY . ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=dsh-pnpm-metadata,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --registry="$NPM_REGISTRY" --network-concurrency=16

# Git metadata stays outside the image; the caller supplies the source revision.
ARG DSH_CLIENT_COMMIT_HASH
# Embed the deployment's product title in the browser artifacts.
ARG DSH_CLIENT_TITLE=衡枢
RUN pnpm run build:artifacts
# The aggregate programs run serially with room for native allocations and other containers.
ARG DSH_BUILD_CHECK_HEAP_MB=8192
RUN node --max-old-space-size="$DSH_BUILD_CHECK_HEAP_MB" node_modules/typescript/bin/tsc -p tsconfig.host.json \
    && node --max-old-space-size="$DSH_BUILD_CHECK_HEAP_MB" node_modules/typescript/bin/tsc -p tsconfig.client.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=dsh-pnpm-metadata,target=/root/.cache/pnpm \
    pnpm -C local-plugins/dsh-web-custom install --frozen-lockfile --registry="$NPM_REGISTRY" --network-concurrency=16
RUN pnpm -C local-plugins/dsh-web-custom run build
RUN pnpm -C local-plugins/dsh-web-custom run check && pnpm -C local-plugins/dsh-web-custom test

# The source build needs the platform's Landlock executable as well as its Node addon.
RUN pnpm exec tsx native/system/scripts/build.ts

COPY deploy/compose/requirements.txt /opt/dsh-python-requirements.txt
RUN python3 -m venv /opt/dsh-python \
    && /opt/dsh-python/bin/python -m pip install --no-cache-dir -r /opt/dsh-python-requirements.txt
ENV PATH="/opt/dsh-python/bin:${PATH}"

COPY --chmod=755 deploy/compose/entrypoint.sh /usr/local/bin/dsh-compose-entrypoint
COPY deploy/compose/browser-picker.patch.yml /etc/dsh/browser-picker.patch.yml

ENV DSH_HOME=/data HOME=/data
WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/dsh-compose-entrypoint"]
