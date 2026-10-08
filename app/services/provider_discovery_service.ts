import { inject } from '@adonisjs/core'
import ProviderRequestService from '#services/provider_request_service'

/**
 * Reads an identity provider's OpenID configuration from its issuer URL:
 * when an admin connects the provider, to confirm the URL is a real
 * provider, and at every sign-in, to find its endpoints
 */
@inject()
export default class ProviderDiscoveryService {
  #requests: ProviderRequestService

  constructor(requests: ProviderRequestService) {
    this.#requests = requests
  }

  /**
   * The provider's endpoints, or the problem with the issuer URL, worded
   * to follow "The issuer URL …"
   */
  async discover(issuer: string) {
    if (!URL.canParse(issuer)) {
      return { problem: 'must be a URL, such as https://acme.okta.com' }
    }

    const url = new URL(issuer)
    if (url.search || url.hash || url.username || url.password) {
      return { problem: 'cannot contain a query string, a #fragment or credentials' }
    }

    const configurationUrl = `${url.origin}${url.pathname.replace(/\/$/, '')}/.well-known/openid-configuration`
    const response = await this.#requests.get(configurationUrl)
    if ('failure' in response) {
      switch (response.failure) {
        case 'not_a_url':
          return { problem: 'must be a URL, such as https://acme.okta.com' }
        case 'not_https':
          return { problem: 'must use https' }
        case 'has_credentials':
          return { problem: 'cannot contain a query string, a #fragment or credentials' }
        case 'not_public':
          return { problem: 'must be reachable from the internet' }
        default:
          return {
            problem: "could not be reached. Check the address is your provider's issuer URL",
          }
      }
    }
    if (response.status !== 200) {
      return { problem: `has no OpenID configuration at ${configurationUrl}` }
    }

    const metadata = this.#parse(response.body)
    if (!metadata) {
      return { problem: 'did not return an OpenID configuration with sign-in endpoints' }
    }

    /**
     * The issuer in the document must be the URL it was fetched for,
     * character for character (OpenID Connect Discovery §4.3). Tokens
     * carry this value, so a near match would fail at sign-in instead.
     */
    if (metadata.issuer !== issuer) {
      return {
        problem: `belongs to a provider that calls itself ${metadata.issuer}. Enter that exact URL`,
      }
    }

    return { metadata }
  }

  /**
   * The parts of an OpenID configuration that sign-in needs, or null when
   * the body is not one
   */
  #parse(body: string) {
    let document: Record<string, unknown>
    try {
      document = JSON.parse(body)
    } catch {
      return null
    }

    const {
      issuer,
      authorization_endpoint: authorizationEndpoint,
      token_endpoint: tokenEndpoint,
      jwks_uri: jwksUri,
    } = document ?? {}

    if (
      typeof issuer !== 'string' ||
      typeof authorizationEndpoint !== 'string' ||
      typeof tokenEndpoint !== 'string' ||
      typeof jwksUri !== 'string'
    ) {
      return null
    }
    return { issuer, authorizationEndpoint, tokenEndpoint, jwksUri }
  }
}
