import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'
import { pendingSignIn } from '#oidc/pending_sign_in'
import { driverFor } from '#identity_providers/driver_for'
import ProviderRequestService from '#services/provider_request_service'
import ProviderDiscoveryService from '#services/provider_discovery_service'

/**
 * Sends a member from the issuer's sign-in page to the organization's
 * identity provider. They come back through the console host's callback
 * (`SignInCallbacksController`) to `SignInWithProviderController`.
 */
export default class RedirectToProviderController {
  /**
   * The `state` is signed and names the environment and the sign-in, so
   * the console host's callback can forward the answer to this issuer
   * host. It lasts as long as the sign-in itself.
   */
  @inject()
  async handle(
    ctx: HttpContext,
    discovery: ProviderDiscoveryService,
    requests: ProviderRequestService
  ) {
    const signIn = await pendingSignIn(ctx)
    const { environment } = ctx.issuer
    const identityProvider = await environment.organization
      .related('identityProviders')
      .query()
      .firstOrFail()

    const state = encryption
      .getMessageVerifier()
      .sign({ environmentId: environment.id, signInId: signIn.uid }, '10m', 'provider_sign_in')

    const driver = await driverFor(ctx, identityProvider, { discovery, requests }, state)
    return driver.redirect()
  }
}
