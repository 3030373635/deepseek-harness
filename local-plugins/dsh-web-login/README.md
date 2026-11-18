# DSH Web 本地登录

独立的 DeepSeek Harness Web 插件。登录页使用账号、密码和由 DSH 生成的一次性图片验证码。用户数据库保存在 DSH 数据目录，密码使用 Argon2id 哈希，会话通过 HttpOnly JWT Cookie 验证。

## 构建和安装

使用 Node.js 24.9 或更新版本。在 DSH 仓库根目录先执行 `pnpm install` 和 `pnpm run build:artifacts`。本插件位于 fork 的 `local-plugins/` 目录，自带依赖清单和锁文件。它的开发依赖使用当前 checkout 生成的 DSH 类型和运行产物。当前验证基线为 DSH 源码提交 `ca33fd6843`，其中包含 Web 认证注册接口。

继续在 DSH 仓库根目录构建插件并创建账号。

```sh
pnpm -C local-plugins/dsh-web-login install --frozen-lockfile
pnpm -C local-plugins/dsh-web-login run build
node local-plugins/dsh-web-login/lib/create-user.js operator
```

创建命令会在本机终端隐藏密码输入。默认数据库是 `${DSH_HOME:-$HOME/.dsh}/auth/users.sqlite`。已有数据库使用同一路径，原有账号可以继续登录。每个账号获得该 DSH 实例的所有者权限。

首次启用时，将插件安装到 `web` profile，再启动 Web。如果 profile 之前链接到其他位置，先用下文的卸载命令移除旧链接。

```sh
pnpm dsh plugin --profile web add ./local-plugins/dsh-web-login
pnpm dsh web
```

如果 `web` profile 尚未初始化，安装前先执行 `pnpm dsh web --dump-config`。安装会写入 Web profile 及其依赖清单。插件组合包停用默认的启动 Token 认证并挂载密码认证，之后直接启动 Web 即可。

登录后，Web 左下角显示本地用户名和首字母头像。点击头像可打开设置或退出当前浏览器的本地会话。插件停用 Web 中的 DeepSeek 登录界面、「账号与余额」设置页及账号通知。模型设置支持配置 API Key。

从本地目录链接安装后，更新插件时重新运行 `pnpm -C local-plugins/dsh-web-login run build` 并重启 Web。

卸载使用 `pnpm dsh plugin --profile web remove dsh-web-login`。下次启动时 Web 恢复 profile 的默认认证，账号数据库仍位于 DSH 数据目录。

## 配置

组合包根据 Web 入口的 TLS 或 HTTPS 公共地址设置安全 Cookie。明文 HTTP 只接受回环地址。部署使用 TLS 代理时，把外部 HTTPS 地址传给 Web 的 `--public-url`，并按部署配置受信任的 Host。

如需自定义数据库路径或会话期限，在 Web profile 的 `cordis.patch.yml` 中覆盖 `web-password-login` 的完整 `config`。数据库路径需为绝对路径，创建账号时也可以把该路径作为第二个参数。JWT 默认有效 8 小时，图片验证码默认有效 3 分钟。

## 上游升级

合并上游更新并重新构建 DSH 后，进入 `local-plugins/dsh-web-login/` 运行 `pnpm run check` 和 `pnpm test`，再用 Web profile 确认登录与刷新。若上游调整认证接口，在此目录更新插件实现和依赖范围。
