import Environment from '#models/environment'
import { errorPage } from '#oidc/error_pages'
import type { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'

/**
 * What the provider may send back, and nothing else is passed on
 */
const ANSWER = ['code', 'state', 'error', 'error_description', 'iss']

/**
 * The redirect URI an organization registers at its identity provider,
 * on the console host: `/sign-in/callback/<organization slug>`. One URL
 * serves every environment. It only forwards the provider's answer to
 * the issuer host that started the sign-in, which holds the cookies
 * needed to finish it (`SignInWithProviderController`).
 */
export default class ForwardProviderAnswerController {
  /**
   * Forwards to the environment named in the signed `state`, when it
   * belongs to the organization in the path. The target is built from
   * our own records, never from the request, so this can't be used to
   * send a browser anywhere else (RFC 9700 §2.1).
   */
  async handle({ request, response, inertia, params }: HttpContext) {
    const state = encryption
      .getMessageVerifier()
      .unsign<{ environmentId: number; signInId: string }>(
        request.input('state', ''),
        'provider_sign_in'
      )

    const environment = state
      ? await Environment.query()
          .where('id', state.environmentId)
          .whereHas('organization', (query) => query.where('slug', params.org))
          .preload('organization')
          .first()
      : null

    if (!state || !environment) {
      response.status(400)
      return inertia.render('errors/oidc', errorPage('expired', 'invalid_state'))
    }

    const target = new URL(
      `/sign-in/${encodeURIComponent(state.signInId)}/provider/callback`,
      environment.issuerUrl(environment.organization.slug)
    )
    for (const name of ANSWER) {
      const value = request.input(name)
      if (typeof value === 'string') {
        target.searchParams.set(name, value)
      }
    }

    /**
     * The URL carries the code, so it must not leak to wherever the
     * browser goes next
     */
    response.header('Referrer-Policy', 'no-referrer')

    /**
     * Redirects carry the request's query string along by default
     * (`config/app.ts`), which would pass on everything the provider's
     * answer was not allowed to contain
     */
    return response.redirect().withQs(false).toPath(target.href)
  }
}
