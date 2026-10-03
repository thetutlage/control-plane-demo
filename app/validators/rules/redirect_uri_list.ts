import vine from '@vinejs/vine'
import { clientUrlProblem, isProductionField } from '#validators/rules/client_url'

/**
 * Redirect URIs come from a text box, one per line
 */
export function redirectUriLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Between 1 and 10 redirect URIs, one per line, each checked against the
 * chosen environment like the app URL
 */
export const redirectUriList = vine.createRule((value, _, field) => {
  const uris = redirectUriLines(String(value))
  if (uris.length === 0) {
    return field.report('Add at least one redirect URI', 'redirectUriList', field)
  }
  if (uris.length > 10) {
    return field.report('Add at most 10 redirect URIs', 'redirectUriList', field)
  }

  const isProduction = isProductionField(field)
  for (const [index, uri] of uris.entries()) {
    const problem = clientUrlProblem(uri, isProduction)
    if (problem) {
      return field.report(`Line ${index + 1} ${problem}`, 'redirectUriList', field)
    }
  }
})
