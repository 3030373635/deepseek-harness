// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { CustomizationInfo } from '../src/client/CustomizationInfo.tsx'
import { dictionaries } from '../src/client/locales.ts'

afterEach(cleanup)

it('describes deployment-managed customization without editable controls', () => {
  const messages = new Map(Object.entries(dictionaries.zh))
  const t = (key: string): string => messages.get(key) ?? key
  const card = render(createElement(CustomizationInfo, { view: 'summary', t }))
  expect(card.container.textContent).toMatchInlineSnapshot('"提供本地账号登录和衡枢界面，由部署方统一管理。"')

  card.rerender(createElement(CustomizationInfo, { view: 'page', t }))
  expect(card.container.textContent).toMatchInlineSnapshot('"本地账号用于登录此实例。登录页、侧栏和新会话页使用衡枢品牌。部署方通过 Docker 镜像的启动配置管理这些功能。"')
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.queryByRole('switch')).toBeNull()
  expect(screen.queryByRole('textbox')).toBeNull()
})
