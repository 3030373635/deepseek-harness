/** Same-origin routes shared by the login provider and its Web launcher. */
export const loginPath = '/login'
export const registrationPath = '/register'
export const currentSessionPath = '/auth/sessions/current'

/** Failure codes returned in the JSON body of a 401 sign-in response. */
export type SignInErrorCode = 'INVALID_CAPTCHA' | 'INVALID_CREDENTIALS'
