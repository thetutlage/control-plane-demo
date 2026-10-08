import { errors } from 'oidc-provider'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * The paused request a sign-in page is for. `interactionDetails` finds it
 * through a cookie oidc-provider set in this browser, limited to paths
 * under `/sign-in/<signInId>`, and throws `SessionNotFound` when the
 * cookie is missing or the sign-in has expired. The ID in the URL must be
 * the same one, so a page left open from an older attempt cannot finish a
 * newer one.
 */
export async function pendingSignIn({ issuer, request, response, params }: HttpContext) {
  const signIn = await issuer.provider.interactionDetails(request.request, response.response)
  if (signIn.uid !== params.signInId) {
    throw new errors.SessionNotFound('the sign-in in the URL is not the one in progress')
  }
  return signIn
}
