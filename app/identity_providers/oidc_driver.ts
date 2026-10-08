import string from '@adonisjs/core/helpers/string'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import { HttpClient } from '@poppinss/oauth-client'
import { Oauth2Driver } from '@adonisjs/ally'
import type { ApiRequestContract, RedirectRequestContract } from '@adonisjs/ally/types'
import { verifyIdToken } from '#identity_providers/id_token'
import type ProviderRequestService from '#services/provider_request_service'

type OidcToken = {
  token: string
  type: 'bearer'
  id_token?: string
}

type OidcScopes = 'openid' | 'email' | 'profile'

type OidcDriverConfig = {
  clientId: string
  clientSecret: string

  /**
   * The redirect URI registered at the provider
   */
  callbackUrl: string

  /**
   * The provider's endpoints, from its OpenID configuration
   */
  metadata: {
    issuer: string
    authorizationEndpoint: string
    tokenEndpoint: string
    jwksUri: string
  }

  /**
   * The `state` to send, when the caller needs to read it back before
   * this driver does. Random when left out.
   */
  state?: string

  /**
   * Every request to the provider goes through this, never through
   * Ally's own HTTP client
   */
  requests: ProviderRequestService
}

/**
 * Ally's HTTP client, sending through our own request service. The token
 * endpoint's URL comes from the provider's configuration, so it gets the
 * same checks as the issuer URL an admin typed.
 */
class ProviderHttpClient extends HttpClient {
  #url: string
  #requests: ProviderRequestService

  constructor(url: string, requests: ProviderRequestService) {
    super(url)
    this.#url = url
    this.#requests = requests
  }

  async post() {
    const response = await this.#requests.postForm(this.#url, this.getFields(), this.getHeaders())
    return this.#read(response)
  }

  async get() {
    const url = new URL(this.#url)
    for (const [key, value] of Object.entries(this.getParams())) {
      url.searchParams.set(key, String(value))
    }
    return this.#read(await this.#requests.get(url.href, this.getHeaders()))
  }

  #read(response: Awaited<ReturnType<ProviderRequestService['get']>>) {
    if ('failure' in response) {
      throw new Exception(`The identity provider could not be asked (${response.failure})`, {
        code: 'E_PROVIDER_UNREACHABLE',
        status: 502,
      })
    }
    if (response.status < 200 || response.status > 299) {
      throw new Exception(`The identity provider answered ${response.status}: ${response.body}`, {
        code: 'E_PROVIDER_REFUSED',
        status: 502,
      })
    }
    return this.getResponseType() === 'json' ? JSON.parse(response.body) : response.body
  }
}

/**
 * An Ally driver for any OpenID Connect provider: Google Workspace,
 * Entra, Okta. It is created per request from the organization's
 * identity provider, not from `config/ally.ts`.
 *
 * Ally supplies the redirect, the `state` and PKCE cookies, and the code
 * exchange. This driver adds what OpenID Connect needs on top: a nonce,
 * and verifying the ID token, which is where the member's identity comes
 * from. The provider's userinfo endpoint is never called.
 */
export class OidcDriver extends Oauth2Driver<OidcToken, OidcScopes> {
  #config: OidcDriverConfig

  protected authorizeUrl: string
  protected accessTokenUrl: string

  protected stateCookieName = 'provider_state'
  protected codeVerifierCookieName = 'provider_code_verifier'
  protected nonceCookieName = 'provider_nonce'

  protected stateParamName = 'state'
  protected errorParamName = 'error'
  protected codeParamName = 'code'
  protected scopeParamName = 'scope'
  protected scopesSeparator = ' '

  constructor(ctx: HttpContext, config: OidcDriverConfig) {
    super(ctx, config)
    this.#config = config
    this.authorizeUrl = config.metadata.authorizationEndpoint
    this.accessTokenUrl = config.metadata.tokenEndpoint

    /**
     * Reads the state and PKCE cookies of a returning member, as Ally's
     * own drivers do
     */
    this.loadState()
  }

  protected httpClient(url: string) {
    return new ProviderHttpClient(url, this.#config.requests)
  }

  getState() {
    return this.#config.state ?? super.getState()
  }

  /**
   * Asks for an ID token, and ties it to this browser with a nonce kept
   * in a cookie next to Ally's state
   */
  protected configureRedirectRequest(request: RedirectRequestContract<OidcScopes>) {
    const nonce = string.random(32)
    this.ctx.response.encryptedCookie(this.nonceCookieName, nonce, {
      sameSite: false,
      httpOnly: true,
    })

    request.scopes(['openid', 'email', 'profile'])
    request.param('response_type', 'code')
    request.param('nonce', nonce)
  }

  accessDenied() {
    return this.getError() === 'access_denied'
  }

  /**
   * Exchanges the code and verifies the ID token that comes back. Throws
   * when the provider's keys can't be read or the token doesn't hold up;
   * the message is for our logs.
   */
  async user(callback?: (request: ApiRequestContract) => void) {
    const nonce: string | null = this.ctx.request.encryptedCookie(this.nonceCookieName)
    this.ctx.response.clearCookie(this.nonceCookieName)

    const token = await this.accessToken(callback)
    if (!token.id_token || !nonce) {
      throw new Exception('The identity provider sent no ID token, or the nonce cookie is gone', {
        code: 'E_INVALID_ID_TOKEN',
        status: 400,
      })
    }

    const keys = await this.httpClient(this.#config.metadata.jwksUri).parseAs('json').get()
    const result = await verifyIdToken(
      token.id_token,
      { issuer: this.#config.metadata.issuer, clientId: this.#config.clientId, nonce },
      keys
    )
    if ('problem' in result) {
      throw new Exception(result.problem, { code: 'E_INVALID_ID_TOKEN', status: 400 })
    }

    const { subject, email, emailVerified, name } = result.claims
    return {
      id: subject,
      nickName: name ?? '',
      name: name ?? '',
      email,
      emailVerificationState:
        emailVerified === null
          ? ('unsupported' as const)
          : emailVerified
            ? ('verified' as const)
            : ('unverified' as const),
      avatarUrl: null,
      original: result.claims,
      token,
    }
  }

  async userFromToken(): Promise<never> {
    throw new Exception('An OpenID Connect sign-in is read from its ID token, not an access token')
  }
}
