import edge from 'edge.js'
import logger from '@adonisjs/core/services/logger'
import { errorPage } from '#oidc/error_pages'
import Provider, { errors, interactionPolicy } from 'oidc-provider'
import type { AdapterFactory, FindAccount, JWK, KoaContextWithOIDC } from 'oidc-provider'

const MINUTE = 60
const DAY = 24 * 60 * MINUTE

/**
 * Access tokens are signed JWTs that apps check on their own, so they
 * cannot be revoked before they expire. They are kept short.
 */
const ACCESS_TOKEN_TTL = 5 * MINUTE

/**
 * How long a sign-in through the organization's identity provider counts
 * before the provider is asked again. Someone disabled there loses
 * access to every app within this long.
 */
const PROVIDER_RECHECK = 1 * DAY

/**
 * Marks a session as signed in through the identity provider (its `amr`,
 * the standard field for how someone authenticated)
 */
export const PROVIDER_AMR = 'provider'

/**
 * oidc-provider's own rules for when a member must sign in again, plus
 * one of ours: a session signed in through the identity provider must go
 * back through it once that sign-in is older than `PROVIDER_RECHECK`.
 * Without it, the issuer's 30-day session would keep letting them in.
 */
function signInPolicy() {
  const policy = interactionPolicy.base()
  policy.get('login')!.checks.add(
    new interactionPolicy.Check(
      'provider_recheck',
      'the identity provider must be asked about this member again',
      (ctx) => {
        const { session } = ctx.oidc
        const stale = session?.amr?.includes(PROVIDER_AMR) && session.past(PROVIDER_RECHECK)
        return stale
          ? interactionPolicy.Check.REQUEST_PROMPT
          : interactionPolicy.Check.NO_NEED_TO_PROMPT
      }
    )
  )
  return policy
}

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
   * The three callbacks below are called only while oidc-provider handles
   * a request under `/oauth`. A provider that just reads and finishes a
   * pending sign-in, for the sign-in pages, leaves them out.
   *
   * Finds the member who signed in by their actor ID, or returns undefined
   * when they can no longer sign in.
   *
   * oidc-provider calls a member's actor ID an "account ID"
   * (`session.accountId`, `token.accountId`). Only oidc-provider's own
   * objects use that name; everything we write calls it `actorId`, a
   * string here because oidc-provider passes it as one.
   */
  findAccount?: FindAccount

  /**
   * Lets a member into the app of a client, on every visit to the issuer:
   * notes the sign-in and resolves to true when they have access to the
   * app, or resolves to false when they have none. It is given the
   * request's context, which holds the member and the client.
   */
  admit?: (actorId: string, clientId: string, ctx: KoaContextWithOIDC) => Promise<boolean>

  /**
   * The permission keys a member holds on the app of a client, for its
   * access tokens
   */
  permissionsFor?: (actorId: string, clientId: string) => Promise<string[]>
}

/**
 * Stands in for a callback the provider was made without, and says so if
 * oidc-provider ever calls it. Without it, a missing `findAccount` would
 * fall back to oidc-provider's own, which accepts anyone.
 */
function notGiven(name: string) {
  return (): never => {
    throw new Error(`This oidc-provider instance was created without "${name}"`)
  }
}

/**
 * Creates the oidc-provider instance for one environment's issuer, from
 * what the caller has already loaded. A new instance is created for every
 * request and discarded afterwards, so it always sees the environment's
 * current keys and settings (plan §8).
 */
export function createProvider(input: CreateProviderInput) {
  const {
    findAccount = notGiven('findAccount'),
    admit = notGiven('admit'),
    permissionsFor = notGiven('permissionsFor'),
  } = input

  const provider = new Provider(input.issuer, {
    adapter: input.adapter,
    findAccount,

    /**
     * What the storage adapter adds to a client to say which app it is
     */
    extraClientMetadata: { properties: ['app_id', 'app_name'] },
    jwks: { keys: input.jwks },
    cookies: { keys: input.cookieKeys },

    /**
     * The sign-in page, an AdonisJS route on the issuer host
     */
    interactions: {
      url: (_ctx, interaction) => `/sign-in/${interaction.uid}`,
      policy: signInPolicy(),
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

      /**
       * A grant from a sign-in through the identity provider lasts a day
       * instead of 14. The app's refresh then fails, and it sends the
       * member back here, where the provider is asked again.
       */
      Grant: (ctx) => {
        return ctx.oidc.session?.amr?.includes(PROVIDER_AMR) ? PROVIDER_RECHECK : 14 * DAY
      },
      Session: 30 * DAY,
    },

    /**
     * Every app gets a refresh token. oidc-provider's default reserves them
     * for the `offline_access` scope, which it only accepts with
     * `prompt=consent`, a consent step our first-party apps don't have.
     */
    issueRefreshToken: async (_ctx, client) => client.grantTypeAllowed('refresh_token'),

    /**
     * An access token carries the member's permissions on the app, worked
     * out when it is issued: on the code exchange and on every refresh. A
     * change to their roles reaches the app within one access token's
     * lifetime, without revoking anything.
     */
    async extraTokenClaims(_ctx, token) {
      if (token.kind !== 'AccessToken' || !token.accountId || !token.clientId) {
        return undefined
      }

      return { permissions: await permissionsFor(token.accountId, token.clientId) }
    },

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
     *
     * A member without access to the app gets no grant. oidc-provider then
     * asks for consent, an interaction the sign-in page answers with "You
     * don't have access" (`SignInController.show`).
     */
    async loadExistingGrant(ctx: KoaContextWithOIDC) {
      const { session, client, params } = ctx.oidc
      if (!(await admit(session!.accountId!, client!.clientId, ctx))) {
        return undefined
      }

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
