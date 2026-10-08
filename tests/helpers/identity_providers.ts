import type Organization from '#models/organization'
import IdentityProvider from '#models/identity_provider'
import { IdentityProviderKind } from '#values/identity_provider_kind'
import ProviderDiscoveryService from '#services/provider_discovery_service'
import ProviderRequestService from '#services/provider_request_service'

/**
 * The identity provider `setupConnectedProvider` connects
 */
export const PROVIDER = {
  issuer: 'https://acme.okta.com',
  clientId: '0oa1b2c3d4',
  clientSecret: 'provider-secret-wxyz',
}

/**
 * A discovery service that never touches the network: every issuer URL
 * answers for itself, except the ones given a problem
 */
export class StubbedProviderDiscovery extends ProviderDiscoveryService {
  #problems: Record<string, string>

  constructor(problems: Record<string, string> = {}) {
    super(new ProviderRequestService())
    this.#problems = problems
  }

  async discover(issuer: string) {
    if (this.#problems[issuer]) {
      return { problem: this.#problems[issuer] }
    }

    return {
      metadata: {
        issuer,
        authorizationEndpoint: `${issuer}/authorize`,
        tokenEndpoint: `${issuer}/token`,
        jwksUri: `${issuer}/keys`,
      },
    }
  }
}

/**
 * An organization whose identity provider is already connected
 */
export function setupConnectedProvider(organization: Organization) {
  return organization.related('identityProviders').create({
    kind: IdentityProviderKind.OIDC,
    admitsNewcomers: false,
    issuer: PROVIDER.issuer,
    clientId: PROVIDER.clientId,
    ...IdentityProvider.encryptSecret(PROVIDER.clientSecret),
  })
}
