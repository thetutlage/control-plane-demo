import { inject } from '@adonisjs/core'
import { events } from '#generated/events'
import type { HttpContext } from '@adonisjs/core/http'
import { pendingSignIn } from '#oidc/pending_sign_in'
import { driverFor } from '#identity_providers/driver_for'
import ProviderSignInService from '#services/provider_sign_in_service'
import ProviderRequestService from '#services/provider_request_service'
import ProviderDiscoveryService from '#services/provider_discovery_service'
import ProviderSignInException from '#exceptions/provider_sign_in_exception'

/**
 * Signs in a member who comes back from the organization's identity
 * provider with its answer. It lives under `/sign-in/<signInId>`, the
 * only paths the browser sends the pending sign-in's cookie to, and it
 * is a GET because the answer arrives as a browser redirect.
 */
export default class SignInWithProviderController {
  /**
   * Ally checks the state and exchanges the code, the driver verifies
   * the ID token, and the member it names is signed in, the same way the
   * password form does it.
   */
  @inject()
  async handle(
    ctx: HttpContext,
    discovery: ProviderDiscoveryService,
    requests: ProviderRequestService,
    providerSignIn: ProviderSignInService
  ) {
    await pendingSignIn(ctx)
    const { issuer, request, response, session, params } = ctx
    const identityProvider = await issuer.environment.organization
      .related('identityProviders')
      .query()
      .firstOrFail()
    const driver = await driverFor(ctx, identityProvider, { discovery, requests })

    const refuse = async (reason: string, email: string | null = null): Promise<never> => {
      await events.ProviderSignInRefused.dispatch(identityProvider, reason, email)
      throw new ProviderSignInException('refused', reason)
    }

    if (driver.accessDenied()) {
      session.flash('error', 'Sign-in was cancelled')
      return response
        .redirect()
        .withQs(false)
        .toRoute('sign_in.show', { signInId: params.signInId })
    }
    if (driver.hasError()) {
      return refuse(`the provider answered with "${driver.getError()}"`)
    }

    /**
     * A provider that says who it is must be the one the member was sent
     * to (RFC 9207). Google does; Entra and Okta don't, and are told
     * apart by the organization in the callback's path instead.
     */
    const answeredBy = request.input('iss')
    if (answeredBy && answeredBy !== identityProvider.issuer) {
      return refuse(`the answer came from "${answeredBy}"`)
    }
    if (driver.stateMisMatch()) {
      return refuse('the state does not match the one this browser was given')
    }

    const profile = await driver
      .user()
      .then((user) => user.original)
      .catch((error: Error) => refuse(error.message))

    const result = await providerSignIn.admit(identityProvider, profile)
    if ('refusal' in result) {
      return refuse(result.refusal, profile.email)
    }
    await events.MemberSignedInWithProvider.dispatch(result.member, identityProvider, result.how)

    const returnTo = await issuer.provider.interactionResult(
      request.request,
      response.response,
      { login: { accountId: String(result.member.actorId) } },
      { mergeWithLastSubmission: false }
    )

    /**
     * Without the request's query string, which holds the provider's
     * code and state
     */
    return response.redirect().withQs(false).toPath(returnTo)
  }
}
