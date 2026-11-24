/** Text for the custom Web interface. */
const en = {
  brand: '衡枢',
  account: 'Local account',
  settings: 'Settings',
  signOut: 'Sign out',
  retry: 'Retry loading account',
  signOutFailed: 'Could not sign out. Try again.',
  customizationTitle: 'Hengshu customization',
  customizationSummary: 'Provides local account sign-in and the Hengshu interface. Managed by the deployment administrator.',
  customizationDetails: 'Local accounts are used to sign in to this instance. The sign-in page, sidebar, and new conversation page use Hengshu branding. The deployment administrator manages these features through the Docker image\'s startup configuration.',
}

type Dictionary = Record<keyof typeof en, string>

/** Use English as the locale service fallback for the custom interface. */
export const dictionaries = {
  en,
  zh: {
    brand: en.brand,
    account: '本地账号',
    settings: '设置',
    signOut: '退出登录',
    retry: '重新加载账号',
    signOutFailed: '退出登录失败，请重试',
    customizationTitle: '衡枢定制',
    customizationSummary: '提供本地账号登录和衡枢界面，由部署方统一管理。',
    customizationDetails: '本地账号用于登录此实例。登录页、侧栏和新会话页使用衡枢品牌。部署方通过 Docker 镜像的启动配置管理这些功能。',
  } satisfies Dictionary,
}
