# DSH Web 定制

在 DeepSeek Harness Web 上使用本地账号登录，并关闭会话中的点赞、点踩和反馈弹窗。登录页使用账号、密码和由 DSH 生成的一次性图片验证码。用户数据库保存在 DSH 数据目录，密码使用 Argon2id 哈希，会话通过 HttpOnly JWT Cookie 验证。

## 构建和安装

使用 Node.js 24.9 或更新版本。在 DSH 仓库根目录先执行 `pnpm install` 和 `pnpm run build:artifacts`。本插件位于 fork 的 `local-plugins/` 目录，自带依赖清单和锁文件。它的开发依赖使用当前 checkout 生成的 DSH 类型和运行产物。当前验证基线为 DSH 源码提交 `ca33fd6843`，其中包含 Web 认证注册接口。

继续在 DSH 仓库根目录构建插件并创建账号。

```sh
pnpm -C local-plugins/dsh-web-custom install --frozen-lockfile
pnpm -C local-plugins/dsh-web-custom run build
node local-plugins/dsh-web-custom/lib/create-user.js operator
```

创建命令会在本机终端隐藏密码输入。包内命令名为 `dsh-web-custom-user`。默认数据库是 `${DSH_HOME:-$HOME/.dsh}/auth/users.sqlite`。已有数据库使用同一路径，原有账号可以继续登录。每个账号获得该 DSH 实例的所有者权限。

首次启用时，将组合包安装到 `web` profile，再启动 Web。如果 profile 已安装旧名称 `dsh-web-login`，请先按下文迁移。

```sh
pnpm dsh plugin --profile web add ./local-plugins/dsh-web-custom
pnpm dsh web
```

如果 `web` profile 尚未初始化，安装前先执行 `pnpm dsh web --dump-config`。安装会写入 Web profile 及其依赖清单。插件组合包停用默认的启动 Token 认证并挂载密码认证，之后直接启动 Web 即可。

登录后，Web 左上角显示横枢 Logo 和名称，收起侧栏时只显示 Logo。新会话标题前也显示横枢 Logo。左下角显示本地用户名和首字母头像。点击头像可打开设置或退出当前浏览器的本地会话。插件停用 Web 中的 DeepSeek 登录服务、账号模型路由、「账号与余额」设置页及账号通知。

此 Web profile 不使用已保存的 DeepSeek 账号授权。模型设置支持使用 API Key。如果旧会话选中了 DeepSeek 账号模型，请在模型选择器中换用已配置的模型。

从本地目录链接安装后，更新组合包时重新运行 `pnpm -C local-plugins/dsh-web-custom run build` 并重启 Web。

卸载使用 `pnpm dsh plugin --profile web remove dsh-web-custom`。下次启动时 Web 恢复 profile 的默认认证和反馈界面，账号数据库仍位于 DSH 数据目录。

## 从旧包名迁移

构建新包后，先停止正在运行的 Web，再切换包名并启动。现有账号继续使用同一个数据库，可以跳过创建账号。

```sh
pnpm dsh plugin --profile web remove dsh-web-login &&
pnpm dsh plugin --profile web add ./local-plugins/dsh-web-custom &&
pnpm dsh web
```

## 配置

组合包依次加载 [认证补丁](auth.patch.yml)和[界面补丁](ui.patch.yml)。要恢复点赞、点踩和反馈弹窗，在 Web profile 的 `cordis.patch.yml` 中覆盖：

```yaml
- id: ui-message-feedback
  disabled: false
```

带正文的 `/feedback <内容>` 仍可提交会话反馈。

组合包根据 Web 入口的 TLS 或 HTTPS 公共地址设置安全 Cookie。明文 HTTP 只接受回环地址。部署使用 TLS 代理时，把外部 HTTPS 地址传给 Web 的 `--public-url`，并按部署配置受信任的 Host。

如需自定义数据库路径或会话期限，在 Web profile 的 `cordis.patch.yml` 中覆盖 `web-password-login` 的完整 `config`。数据库路径需为绝对路径，创建账号时也可以把该路径作为第二个参数。JWT 默认有效 8 小时，图片验证码默认有效 3 分钟。

## 上游升级

合并上游更新并重新构建 DSH 后，进入 `local-plugins/dsh-web-custom/` 运行 `pnpm run check` 和 `pnpm test`，再用 Web profile 确认登录与刷新。若上游调整认证接口，在此目录更新插件实现和依赖范围。
