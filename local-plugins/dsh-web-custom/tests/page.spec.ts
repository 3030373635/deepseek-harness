/** Browser document behavior during asynchronous verification-image replacement. */
import { JSDOM } from 'jsdom'
import { expect, it, onTestFinished, vi } from 'vitest'
import { renderLoginPage } from '../src/page.ts'

/**
 * Mount the real login document with instance-local image and HTTP adapters.
 * @returns the document and controls for delaying or failing challenge requests.
 */
async function startPage() {
  let response = Promise.resolve(new Response(new Blob(['initial image'])))
  let decoding = Promise.resolve()
  let imageNumber = 0
  const page = new JSDOM(renderLoginPage('zh-CN', 'test-nonce'), {
    url: 'http://localhost',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.fetch = () => response
      window.URL.createObjectURL = () => `blob:test-${++imageNumber}`
      window.URL.revokeObjectURL = () => {}
      window.HTMLImageElement.prototype.decode = () => decoding
    },
  })
  onTestFinished(() => page.window.close())
  const document = page.window.document
  const image = document.querySelector('img#image')!
  const refresh = document.querySelector<HTMLButtonElement>('button#refresh')!
  const submit = document.querySelector<HTMLButtonElement>('button#submit')!
  const error = document.querySelector('#error')!
  await vi.waitFor(() => expect(submit.disabled).toBe(false))
  return {
    page, image, refresh, submit, error,
    /**
     * Set the HTTP response and image decode completion for the next refresh.
     * @param nextResponse - pending challenge response.
     * @param nextDecoding - completion of decoding the replacement image.
     */
    next(nextResponse: Promise<Response>, nextDecoding = Promise.resolve()) {
      response = nextResponse
      decoding = nextDecoding
    },
  }
}

it('keeps the current image, login appearance, and status until the replacement decodes', async () => {
  const { page, image, refresh, submit, error, next } = await startPage()
  const previousImage = image.getAttribute('src')
  const previousOpacity = page.window.getComputedStyle(submit).opacity
  const previousStatus = error.textContent
  const response = Promise.withResolvers<Response>()
  const decoding = Promise.withResolvers<void>()
  next(response.promise, decoding.promise)

  refresh.click()
  expect(submit.disabled).toBe(true)
  expect(image.hasAttribute('hidden')).toBe(false)
  expect(page.window.getComputedStyle(submit).opacity).toBe(previousOpacity)
  expect(error.textContent).toBe(previousStatus)

  response.resolve(new Response(new Blob(['replacement image'])))
  // The image decode remains pending even after the challenge response has arrived.
  await new Promise<void>(resolve => setImmediate(resolve))
  expect(image.getAttribute('src')).toBe(previousImage)
  expect(submit.disabled).toBe(true)

  decoding.resolve()
  await vi.waitFor(() => expect(submit.disabled).toBe(false))
  expect(image.getAttribute('src')).not.toBe(previousImage)
  expect(image.hasAttribute('hidden')).toBe(false)
  expect(error.textContent).toBe('验证码已更新')
  expect(error.getAttribute('data-state')).toBe('success')
})

it('keeps the previous refresh confirmation visible while refreshing again', async () => {
  const { refresh, submit, error, next } = await startPage()
  expect(error.textContent).toBe('')
  next(Promise.resolve(new Response(new Blob(['first replacement']))))
  refresh.click()
  await vi.waitFor(() => expect(submit.disabled).toBe(false))
  expect(error.textContent).toBe('验证码已更新')

  const response = Promise.withResolvers<Response>()
  next(response.promise)
  refresh.click()
  expect(submit.disabled).toBe(true)
  expect(error.textContent).toBe('验证码已更新')

  response.resolve(new Response(new Blob(['second replacement'])))
  await vi.waitFor(() => expect(submit.disabled).toBe(false))
  expect(error.textContent).toBe('验证码已更新')
})

it('hides an expired image and keeps sign-in disabled when refresh fails', async () => {
  const { image, refresh, submit, error, next } = await startPage()
  next(Promise.resolve(new Response(null, { status: 503 })))
  refresh.click()

  await vi.waitFor(() => expect(refresh.disabled).toBe(false))
  expect(submit.disabled).toBe(true)
  expect(image.hasAttribute('hidden')).toBe(true)
  expect(error.textContent).toBe('验证码图片加载失败，请换一张')
})
