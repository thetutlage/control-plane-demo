import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

/**
 * Metadata the rules read: whether the app's environment is production
 */
export type ClientUrlMetaData = { isProduction: boolean }

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]']

/**
 * Why a URL cannot be used for an app, or null when it can. Production
 * requires https. Other environments also accept http on the local machine,
 * for apps running on a developer's laptop.
 */
export function clientUrlProblem(value: string, isProduction: boolean) {
  if (!URL.canParse(value)) {
    return 'must be an absolute URL, such as https://invoices.acme.com/callback'
  }
  if (value.includes('*')) {
    return 'cannot contain wildcards'
  }

  const url = new URL(value)
  if (url.hash) {
    return 'cannot contain a #fragment'
  }
  if (url.protocol === 'https:') {
    return null
  }
  if (!isProduction && url.protocol === 'http:' && LOOPBACK_HOSTS.includes(url.hostname)) {
    return null
  }
  return isProduction ? 'must use https in production' : 'must use https, or http on localhost'
}

/**
 * Whether the app's environment is production
 */
export function isProductionField(field: FieldContext) {
  return (field.meta as ClientUrlMetaData).isProduction
}

/**
 * A URL an app runs at, checked against the chosen environment
 */
export const clientUrl = vine.createRule((value, _, field) => {
  const problem = clientUrlProblem(String(value), isProductionField(field))
  if (problem) {
    field.report(`The app URL ${problem}`, 'clientUrl', field)
  }
})
