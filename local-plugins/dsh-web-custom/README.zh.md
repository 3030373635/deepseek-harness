# DSH Web 定制

[English](README.md) | 中文

在 DeepSeek Harness Web 上使用本地账号登录，并关闭会话中的点赞、点踩和反馈弹窗。登录页采用衡枢浅绿主题，桌面端并排显示品牌介绍与表单，窄屏上下排列，支持密码显隐切换。登录使用账号、密码和由 DSH 生成的 4 位数字一次性图片验证码；点击图片或「换一张」可刷新，首位可以是 0。刷新保留旧图，待新图加载完成后替换并显示「验证码已更新」；期间禁止提交登录，表单外观保持稳定。用户数据库保存在 DSH 数据目录，密码使用 Argon2id 哈希，会话通过 HttpOnly JWT Cookie 验证。

用户名不存在和密码错误使用同一条登录提示。验证码错误或过期时单独提示。登录失败后，页面会自动换图，供下次提交使用。

## 构建和安装

使用 Node.js 24.9 或更新版本。在 DSH 仓库根目录先执行 `pnpm install` 和 `pnpm run build:artifacts`。本插件位于 fork 的 `local-plugins/` 目录，自带依赖清单和锁文件。它的开发依赖使用当前 checkout 生成的 DSH 类型和运行产物。

继续在 DSH 仓库根目录构建插件。

```sh
pnpm -C local-plugins/dsh-web-custom install --frozen-lockfile
pnpm -C local-plugins/dsh-web-custom run build
```

首次启用时，将组合包安装到 `web` profile，再启动 Web。如果 profile 已安装旧名称 `dsh-web-login`，请先按下文迁移。

```sh
pnpm dsh plugin --profile web add ./local-plugins/dsh-web-custom
pnpm dsh web
```

如果 `web` profile 尚未初始化，安装前先执行 `pnpm dsh web --dump-config`。安装会写入 Web profile 及其依赖清单。插件组合包停用默认的启动 Token 认证并挂载密码认证，之后直接启动 Web 即可。

打开 Web，创建首个本地账号后会自动登录。新密码至少需要 8 个字符。密码和确认密码输入框各自支持显隐切换。账号数据库中已有用户时，Web 注册入口关闭。每个本地账号都拥有实例的所有者权限，因此请在创建首个账号前限制对实例的网络访问。默认数据库是 `${DSH_HOME:-$HOME/.dsh}/auth/users.sqlite`。

如需在交互式终端中创建账号，运行 `node local-plugins/dsh-web-custom/lib/create-user.js operator`。命令会提示输入密码，且不回显。

登录页和主界面的浏览器标签页使用衡枢 Logo。登录后，Web 左上角显示衡枢 Logo 和名称，收起侧栏时只显示 Logo。新会话标题前也显示衡枢 Logo，标题旁的预览版徽标由插件样式隐藏。该样式依赖首页标题与徽标的相邻结构，上游升级后需验证。左下角显示本地用户名和首字母头像。点击头像后，菜单在账号行上方展开，左边缘与账号行对齐，可打开设置或退出当前浏览器的本地会话。插件停用 Web 中的 DeepSeek 登录服务、账号模型路由、「账号与余额」设置页及账号通知。

此 Web profile 不使用已保存的 DeepSeek 账号授权。模型设置支持使用 API Key。如果旧会话选中了 DeepSeek 账号模型，请在模型选择器中换用已配置的模型。

插件跳过预览版说明弹窗，继续后续引导，模型设置仍可使用。它通过公开插槽注册表覆盖 `welcome-notice` 步骤，不写入确认版本；卸载插件后恢复默认的说明显示行为。

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

组合包依次加载 [认证补丁](auth.patch.yml)和[界面补丁](ui.patch.yml)。认证补丁停用「设置 → 远程连接」、二维码登录和设备配对。通过浏览器访问 Web 时使用本地密码登录。

要恢复点赞、点踩和反馈弹窗，在 Web profile 的 `cordis.patch.yml` 中覆盖：

```yaml
- id: ui-message-feedback
  disabled: false
```

带正文的 `/feedback <内容>` 仍可提交会话反馈。

组合包通过 `ui-settings-models.config.credentialOnboarding: false` 关闭 API Key 自动引导。API Key 可在「设置 → 模型」中配置。要恢复自动引导，在 Web profile 的 `cordis.patch.yml` 中把该字段覆盖为 `true`。

组合包默认关闭向 DeepSeek 官方 API 上传会话日志。如需开启，在「设置 → 通用」中打开「在使用官方模型 API 时上传 Session Log」。

组合包根据 Web 入口的 TLS 或 HTTPS 公共地址设置 Secure Cookie。HTTP 也支持 DSH 受信任 Host 策略接受的局域网地址。注册、登录和退出均要求浏览器 Origin 与 Cookie audience 一致。Cookie 使用 HttpOnly 和 SameSite=Strict。HTTP 不加密密码和会话 Cookie，因此只用于可信局域网。

Linux 服务器部署见 [Docker Compose 部署指南](../../deploy/compose/README.zh.md)，其中提供 Node 镜像、直接提供局域网 HTTP 的监听配置、持久化数据卷和账号初始化步骤。

如需自定义数据库路径或会话期限，在 Web profile 的 `cordis.patch.yml` 中覆盖 `web-password-login` 的完整 `config`。数据库路径需为绝对路径。JWT 默认有效 8 小时，图片验证码默认有效 3 分钟。

## 重置 Web 密码

在仓库根目录的交互式终端中运行重置命令，传入已有用户名。命令要求输入两次新密码，输入不会回显，并使该账号的旧登录 Cookie 失效。命令成功后即可用新密码重新登录。

```sh
node local-plugins/dsh-web-custom/lib/reset-password.js operator
```

执行时使用与 Web 相同的 `DSH_HOME`。如果 Web 使用自定义数据库路径，创建账号和重置密码时都可以把该绝对路径作为第二个参数传入。

## 上游升级

合并上游更新并重新构建 DSH 后，进入 `local-plugins/dsh-web-custom/` 运行 `pnpm run check` 和 `pnpm test`，再用 Web profile 确认登录与刷新。若上游调整认证接口，在此目录更新插件实现和依赖范围。
