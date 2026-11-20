FROM node:24-trixie

ENV CI=true \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    DSH_GATE_CONCURRENCY=2

WORKDIR /app
COPY package.json ./
ARG NPM_REGISTRY=https://registry.npmjs.org
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
RUN pnpm run build:check --serial
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=dsh-pnpm-metadata,target=/root/.cache/pnpm \
    pnpm -C local-plugins/dsh-web-custom install --frozen-lockfile --registry="$NPM_REGISTRY" --network-concurrency=16
RUN pnpm -C local-plugins/dsh-web-custom run build
RUN pnpm -C local-plugins/dsh-web-custom run check && pnpm -C local-plugins/dsh-web-custom test

# The source build needs the platform's Landlock executable as well as its Node addon.
RUN apt-get update \
    && apt-get install -y --no-install-recommends musl-tools bubblewrap gosu \
    && rm -rf /var/lib/apt/lists/*
RUN pnpm exec tsx native/system/scripts/build.ts

COPY --chmod=755 deploy/compose/entrypoint.sh /usr/local/bin/dsh-compose-entrypoint
COPY deploy/compose/browser-picker.patch.yml /etc/dsh/browser-picker.patch.yml

ENV DSH_HOME=/data HOME=/data
WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/dsh-compose-entrypoint"]
