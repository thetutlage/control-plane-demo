import edge from 'edge.js'
import logger from '@adonisjs/core/services/logger'
import { errorPage } from '#oidc/error_pages'
import Provider, { errors } from 'oidc-provider'
import type { AdapterFactory, FindAccount, JWK, KoaContextWithOIDC } from 'oidc-provider'

const MINUTE = 60
const DAY = 24 * 60 * MINUTE

/**
 * Access tokens are signed JWTs that apps check on their own, so they
 * cannot be revoked before they expire. They are kept short.
 */
const ACCESS_TOKEN_TTL = 5 * MINUTE

/**
 * oidc-provider issues JWT access tokens only for a "resource", the API
 * that accepts them. An app's access tokens are for the app itself, so
 * every client has one resource of its own, and apps never send it.
 */
const resourceFor = (clientId: string) => `urn:client:${clientId}`

/**
 * The theme the member picked on the sign-in page, for the pages
 * oidc-provider renders
 */
const themeOf = (ctx: KoaContextWithOIDC) =>
  ctx.cookies.get('app_theme') === 'dark' ? 'dark' : 'light'

export type CreateProviderInput = {
  /**
   * The environment's issuer URL, such as `https://acme--staging.<domain>`
   */
  issuer: string

  /**
   * The environment's private signing keys, newest first. The newest one
   * signs new tokens.
   */
  jwks: JWK[]

  /**
   * Keys oidc-provider signs its cookies with
   */
  cookieKeys: string[]

  /**
   * Storage for oidc-provider's records, already limited to the environment
   */
  adapter: AdapterFactory

  /**
   * Finds a signed-in account (a member's actor) by its ID, or returns
   * undefined when it can no longer sign in
   */
  findAccount: FindAccount
}

/**
 * Creates the oidc-provider instance for one environment's issuer, from
 * what the caller has already loaded. A new instance is created for every
 * request and discarded afterwards, so it always sees the environment's
 * current keys and settings (plan §8).
 */
export function createProvider(input: CreateProviderInput) {
  const provider = new Provider(input.issuer, {
    adapter: input.adapter,
    findAccount: input.findAccount,
    jwks: { keys: input.jwks },
    cookies: { keys: input.cookieKeys },

    /**
     * The sign-in page, an AdonisJS route on the issuer host
     */
    interactions: {
      url: (_ctx, interaction) => `/sign-in/${interaction.uid}`,
    },

    /**
     * oidc-provider only requires PKCE from clients without a secret.
     * Current guidance (RFC 9700, OAuth 2.1) requires it from every client.
     */
    pkce: { required: () => true },

    /**
     * How long each record lasts, in seconds. Refresh tokens stop working
     * when their grant expires, so an app sends the member back to the
     * issuer every 14 days, however often it refreshes. The session is
     * extended to 30 days on every visit to the issuer, so the member
     * enters their password again only after 30 days without one.
     */
    ttl: {
      AccessToken: ACCESS_TOKEN_TTL,
      AuthorizationCode: 1 * MINUTE,
      IdToken: 60 * MINUTE,
      Interaction: 10 * MINUTE,
      RefreshToken: 14 * DAY,
      Grant: 14 * DAY,
      Session: 30 * DAY,
    },

    /**
     * Every app gets a refresh token. oidc-provider's default reserves them
     * for the `offline_access` scope, which it only accepts with
     * `prompt=consent`, a consent step our first-party apps don't have.
     */
    issueRefreshToken: async (_ctx, client) => client.grantTypeAllowed('refresh_token'),

    /**
     * Everything issued belongs to the browser's session: when it ends,
     * nothing issued in it works for any app. This also lets sign-out
     * revoke the session's grants, which oidc-provider skips for grants
     * whose tokens outlive the session. Grants last 14 days and every
     * visit renews the 30-day session, so in practice only sign-out ends
     * a session before its grants.
     */
    expiresWithSession: async () => true,

    /**
     * The ID token carries the member's details for the scopes the app
     * asks for. The first four are oidc-provider's defaults.
     */
    claims: {
      acr: null,
      auth_time: null,
      iss: null,
      sid: null,
      openid: ['sub'],
      profile: ['name'],
      email: ['email'],
    },

    features: {
      devInteractions: { enabled: false },

      /**
       * On by default and unused for now. Both store record types that have
       * no table.
       */
      pushedAuthorizationRequests: { enabled: false },
      dPoP: { enabled: false },

      /**
       * The userinfo endpoint only accepts stored access tokens without an
       * audience. Ours are JWTs for the app, and the ID token already
       * carries the member's details.
       */
      userinfo: { enabled: false },

      /**
       * Signing out of any app signs the member out of every app in this
       * browser: the session ends and its grants are revoked. Our pages
       * replace oidc-provider's, and always sign out of every app.
       */
      rpInitiatedLogout: {
        enabled: true,
        async logoutSource(ctx, form) {
          ctx.body = await edge.render('oidc/sign_out', {
            form,
            confirm: !ctx.oidc.entities.IdTokenHint,
            theme: themeOf(ctx),
          })
        },
        async postLogoutSuccessSource(ctx) {
          ctx.body = await edge.render('oidc/signed_out', { theme: themeOf(ctx) })
        },
      },

      resourceIndicators: {
        enabled: true,
        defaultResource: (_ctx, client) => resourceFor(client.clientId),
        async getResourceServerInfo(_ctx, resource, client) {
          if (resource !== resourceFor(client.clientId)) {
            throw new errors.InvalidTarget()
          }

          return {
            scope: '',
            audience: client.clientId,
            accessTokenFormat: 'jwt',
            accessTokenTTL: ACCESS_TOKEN_TTL,
            jwt: { sign: { alg: 'ES256' } },
          }
        },
      },
    },

    /**
     * Every app is first-party, so there is no consent screen: a signed-in
     * member is granted whatever the app asks for. Every visit to the
     * issuer creates a new grant, so the tokens from it get their full
     * lifetime, even when the app sends the member back early.
     *
     * The previous grant of this browser's session for the app is revoked
     * first. A session remembers one grant per app, the one sign-out
     * revokes, so it must be the only one alive.
     */
    async loadExistingGrant(ctx: KoaContextWithOIDC) {
      const { session, client, params } = ctx.oidc
      const previousId = session!.grantIdFor(client!.clientId)
      if (previousId) {
        const previous = await ctx.oidc.provider.Grant.find(previousId)
        await previous?.destroy()
      }

      const grant = new ctx.oidc.provider.Grant({
        clientId: client!.clientId,
        accountId: session!.accountId,
      })

      grant.addOIDCScope(String(params!.scope))
      await grant.save()
      return grant
    },

    /**
     * Errors in a browser that cannot be sent back to the app, such as an
     * unknown client or a redirect URI that is not registered. The page is
     * the response to the failing request itself, with its real status.
     */
    async renderError(ctx, out) {
      logger.info({ issuer: input.issuer, path: ctx.path, ...out }, 'oidc-provider error page')

      const kind =
        out.error === 'server_error'
          ? 'server_error'
          : ctx.path.startsWith('/session/end')
            ? 'sign_out_rejected'
            : 'rejected'

      ctx.type = 'html'
      ctx.body = await edge.render('errors/oidc', {
        ...errorPage(kind, out.error),
        theme: themeOf(ctx),
      })
    },
  })

  /**
   * oidc-provider answers every error on its endpoints itself, and only
   * reports unexpected ones (a failing query, a bug) as `server_error`
   * events. Without this listener they would not be logged anywhere.
   */
  provider.on('server_error', (ctx, error) => {
    logger.error({ err: error, issuer: input.issuer, path: ctx.path }, 'oidc-provider server error')
  })

  /**
   * The issuer middleware replaces the `X-Forwarded-*` headers with what
   * AdonisJS resolved, so they can always be trusted
   */
  provider.proxy = true

  return provider
}
