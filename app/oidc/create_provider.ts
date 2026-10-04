import edge from 'edge.js'
import logger from '@adonisjs/core/services/logger'
import { errorPage } from '#oidc/error_pages'
import Provider from 'oidc-provider'
import type { AdapterFactory, FindAccount, JWK, KoaContextWithOIDC } from 'oidc-provider'

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

    features: {
      devInteractions: { enabled: false },

      /**
       * On by default and unused for now. Both store record types that have
       * no table.
       */
      pushedAuthorizationRequests: { enabled: false },
      dPoP: { enabled: false },
    },

    /**
     * Every app is first-party, so there is no consent screen: a signed-in
     * member is granted whatever the app asks for. The session's grant for
     * the app is reused when it exists (one grant per session and app), and
     * a new one is created otherwise.
     */
    async loadExistingGrant(ctx: KoaContextWithOIDC) {
      const { session, client, params } = ctx.oidc
      const grantId = session!.grantIdFor(client!.clientId)
      const grant =
        (grantId && (await ctx.oidc.provider.Grant.find(grantId))) ||
        new ctx.oidc.provider.Grant({ clientId: client!.clientId, accountId: session!.accountId })

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

      const page = errorPage(out.error === 'server_error' ? 'server_error' : 'rejected', out.error)
      ctx.type = 'html'
      ctx.body = await edge.render('errors/oidc', {
        ...page,
        theme: ctx.cookies.get('app_theme') === 'dark' ? 'dark' : 'light',
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
