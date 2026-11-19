/** Server-rendered, one-use image challenge for the Web login form. */
import { randomInt } from 'node:crypto'

const digits = [
  'M9 2C2 2 2 12 2 16S2 30 9 30S16 20 16 16S16 2 9 2Z',
  'M4 8L10 2V30M4 30H16',
  'M2 8Q3 2 9 2Q16 2 16 9Q16 15 3 25L2 30H16',
  'M2 3H14L8 14Q16 13 16 22Q16 30 8 30Q3 30 2 26',
  'M12 30V2L2 21H17',
  'M16 2H4L3 14Q16 10 16 22Q16 30 8 30Q3 30 2 26',
  'M15 3Q4 0 2 15Q0 30 9 30Q16 30 16 22Q16 14 9 14Q4 14 2 18',
  'M2 2H17L6 30',
  'M9 2C0 2 0 11 9 16C19 21 19 30 9 30C-1 30 -1 21 9 16C18 11 18 2 9 2Z',
  'M3 29Q14 32 16 17Q18 2 9 2Q2 2 2 10Q2 18 9 18Q14 18 16 14',
]

/**
 * Generate a fresh challenge answer.
 * @returns four independent decimal digits, including leading zeroes.
 */
export function createCaptchaCode(): string {
  return String(randomInt(10_000)).padStart(4, '0')
}

/**
 * Rasterize the challenge so the HTTP resource exposes only pixels.
 * @param code - the four-digit answer retained by the server.
 * @returns a PNG containing the distorted digits.
 */
export async function renderCaptcha(code: string): Promise<Buffer> {
  const { default: sharp } = await import('sharp')
  const marks = code.split('').map((digit, index) => {
    const x = 10 + index * 26 + randomInt(-2, 3)
    const y = randomInt(9, 15)
    const angle = randomInt(-15, 16)
    return `<path d="${digits[Number(digit)]}" transform="translate(${x} ${y}) scale(.8) rotate(${angle} 9 16)" stroke="#52704a" stroke-width="2.4"/>`
  })
  const dots = Array.from({ length: 85 }, () =>
    `<circle cx="${randomInt(116)}" cy="${randomInt(50)}" r="${randomInt(1, 3) / 2}" fill="#bdc9a9" opacity=".48"/>`)
  const lines = Array.from({ length: 3 }, () =>
    `<path d="M0 ${randomInt(10, 41)} Q38 ${randomInt(50)} 65 ${randomInt(50)} T116 ${randomInt(10, 41)}" stroke="#bac8a2" opacity=".58"/>`)
  // Double-resolution pixels keep the compact image readable on high-density displays.
  const vector = `<svg xmlns="http://www.w3.org/2000/svg" width="232" height="100" viewBox="0 0 116 50"><rect width="116" height="50" fill="#edf1e3"/>${dots.join('')}<g fill="none" stroke-linecap="round" stroke-linejoin="round">${marks.join('')}${lines.join('')}</g></svg>`
  return sharp(Buffer.from(vector)).png().toBuffer()
}
