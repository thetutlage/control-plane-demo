import type { HttpContext } from '@adonisjs/core/http'
import { OidcDriver } from '#identity_providers/oidc_driver'
import type IdentityProvider from '#models/identity_provider'
import type ProviderRequestService from '#services/provider_request_service'
import type ProviderDiscoveryService from '#services/provider_discovery_service'
import ProviderSignInException from '#exceptions/provider_sign_in_exception'

/**
 * The Ally driver for an organization's identity provider, on a request
 * to one of its issuer hosts, with the endpoints the provider publishes
 * right now. `state` is the value to send to the provider; leave it out
 * when the member is coming back.
 */
export async function driverFor(
  ctx: HttpContext,
  identityProvider: IdentityProvider,
  services: { discovery: ProviderDiscoveryService; requests: ProviderRequestService },
  state?: string
) {
  const result = await services.discovery.discover(identityProvider.issuer)
  if ('problem' in result) {
    throw new ProviderSignInException('provider_unreachable', `the issuer URL ${result.problem}`)
  }

  return new OidcDriver(ctx, {
    clientId: identityProvider.clientId,
    clientSecret: identityProvider.secret,
    callbackUrl: ctx.issuer.environment.organization.signInCallbackUrl(),
    metadata: result.metadata,
    requests: services.requests,
    state,
  })
}
