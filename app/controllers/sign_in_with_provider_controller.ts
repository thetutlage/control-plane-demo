import { inject } from '@adonisjs/core'
import type Member from '#models/member'
import { auditedTransaction } from '#audit/transaction'
import type { HttpContext } from '@adonisjs/core/http'
import { PROVIDER_AMR } from '#oidc/create_provider'
import { appOf, pendingSignIn } from '#oidc/pending_sign_in'
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
   * password form does it. The session is marked as signed in through
   * the provider, so the provider is asked again a day later.
   */
  @inject()
  async handle(
    ctx: HttpContext,
    discovery: ProviderDiscoveryService,
    requests: ProviderRequestService,
    providerSignIn: ProviderSignInService
  ) {
    const signIn = await pendingSignIn(ctx)
    const { issuer, request, response, session, params, audit } = ctx
    const app = await appOf(issuer.environment, signIn)
    const identityProvider = await issuer.environment.organization
      .related('identityProviders')
      .query()
      .firstOrFail()
    const driver = await driverFor(ctx, identityProvider, { discovery, requests })

    /**
     * The refusal is recorded, then the member sees the error page. The
     * request's audit scope is written when the request ends, also after
     * a throw.
     */
    const refuse = (
      reason: string,
      email: string | null = null,
      member: Member | null = null
    ): never => {
      audit.record('sign_in.refused', app, issuer.environment, 'provider', reason, email, member)
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

    /**
     * Someone who joins becomes a member in the same transaction as the
     * event that says so
     */
    const result = await auditedTransaction(audit, async (trx, batch) => {
      const outcome = await providerSignIn.admit(identityProvider, profile, trx)
      if (!('refusal' in outcome) && outcome.how === 'created') {
        batch.record('access.member_joined', outcome.member)
      }
      return outcome
    })
    if ('refusal' in result) {
      return refuse(result.refusal, profile.email, result.member ?? null)
    }

    const returnTo = await issuer.provider.interactionResult(
      request.request,
      response.response,
      {
        login: { accountId: String(result.member.actorId), amr: [PROVIDER_AMR] },

        /**
         * Kept with the sign-in for the audit event recorded when the
         * app is handed its code (`OidcIssuerMiddleware`)
         */
        how: result.how,
      },
      { mergeWithLastSubmission: false }
    )

    /**
     * Without the request's query string, which holds the provider's
     * code and state
     */
    return response.redirect().withQs(false).toPath(returnTo)
  }
}
