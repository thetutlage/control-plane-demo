import { errors } from 'oidc-provider'
import type { HttpContext } from '@adonisjs/core/http'
import type Environment from '#models/environment'

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

/**
 * The app a pending sign-in is for: the one whose client started it, in
 * the issuer's environment
 */
export async function appOf(
  environment: Environment,
  signIn: Awaited<ReturnType<typeof pendingSignIn>>
) {
  const setup = await environment
    .related('appEnvironments')
    .query()
    .where('client_id', String(signIn.params.client_id))
    .preload('app')
    .firstOrFail()
  return setup.app
}
