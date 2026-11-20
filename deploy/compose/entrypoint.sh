#!/bin/sh
set -eu

# The login routes use origin-root paths and require browser-facing HTTPS.
public_authority=$(node --input-type=module -e '
    const url = URL.parse(process.env.DSH_PUBLIC_URL ?? "");
    if (url === null || url.protocol !== "https:" || url.pathname !== "/"
        || url.username || url.password || url.search || url.hash) {
        console.error("DSH_PUBLIC_URL must be an HTTPS origin, for example https://192.168.3.86:3443, without credentials, a path, query, or fragment.");
        process.exit(1);
    }
    process.stdout.write(url.host);
')

# Runtime identity matches the host workspace; only the private data volume is re-owned.
DSH_UID=${DSH_UID:-1000}
DSH_GID=${DSH_GID:-1000}
case "$DSH_UID" in
    ''|0*|*[!0-9]*) echo 'DSH_UID must be a nonzero numeric user ID without leading zeroes.' >&2; exit 1 ;;
esac
case "$DSH_GID" in
    ''|0[0-9]*|*[!0-9]*) echo 'DSH_GID must be a numeric group ID without leading zeroes.' >&2; exit 1 ;;
esac
if [ "$(id -u)" = 0 ]; then
    groupmod --non-unique --gid "$DSH_GID" node
    usermod --non-unique --uid "$DSH_UID" --gid "$DSH_GID" --home /data node
    if [ "$(stat -c '%u:%g' /data)" != "$DSH_UID:$DSH_GID" ]; then
        chown -hR "$DSH_UID:$DSH_GID" /data
    fi
    exec gosu node "$0" "$@"
fi

# The listener requires a concrete container address rather than a wildcard.
bind_host=$(hostname -i | awk '{print $1}')
cd /app
node /app/apps/cli/lib/bin.js web --dump-config >/dev/null
node /app/apps/cli/lib/bin.js plugin --profile web add /app/local-plugins/dsh-web-custom

# The compiled launcher preserves the mounted workspace as the process directory.
cd /workspace
exec node /app/apps/cli/lib/bin.js web \
    --patch /etc/dsh/browser-picker.patch.yml \
    --host "$bind_host" --port 3080 --no-open \
    --public-url "$DSH_PUBLIC_URL" --trusted-host "$public_authority"
