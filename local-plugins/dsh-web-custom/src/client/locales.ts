/** Text for the custom Web sidebar. */
const en = {
  brand: '衡枢',
  account: 'Local account',
  settings: 'Settings',
  signOut: 'Sign out',
  retry: 'Retry loading account',
  signOutFailed: 'Could not sign out. Try again.',
}

type Dictionary = Record<keyof typeof en, string>

/** Use English as the locale service fallback for sidebar copy. */
export const dictionaries = {
  en,
  zh: {
    brand: en.brand,
    account: '本地账号',
    settings: '设置',
    signOut: '退出登录',
    retry: '重新加载账号',
    signOutFailed: '退出登录失败，请重试',
  } satisfies Dictionary,
}
