import Environment from '#models/environment'
import env from '#start/env'
import Member from '#models/member'
import AppMember from '#models/app_member'
import OidcStorageAdapter from '#oidc/storage_adapter'
import { createProvider, PROVIDER_AMR } from '#oidc/create_provider'
import { requestScope } from '#audit/scope'
import { errorPage } from '#oidc/error_pages'
import type { HttpContext } from '@adonisjs/core/http'
import type { KoaContextWithOIDC } from 'oidc-provider'
import type { NextFn } from '@adonisjs/core/types/http'

const PREFIX = '/oauth'

/**
 * Refusals that are an ordinary part of signing in, not something an app
 * got wrong: a member with no access (recorded as `sign_in.access_denied`)
 * and an app asking whether someone is signed in without showing a page
 */
const EXPECTED_REFUSALS = new Set(['access_denied', 'login_required', 'interaction_required'])

type Oidc = KoaContextWithOIDC['oidc']

/**
 * The member oidc-provider loaded for the request, through `findAccount`
 */
const memberOf = (oidc: Oidc) => oidc.account!.member as Member

/**
 * The app of the client oidc-provider loaded for the request, through
 * the storage adapter
 */
const appOf = (client: NonNullable<Oidc['client']>) => ({
  id: Number(client.app_id),
  name: String(client.app_name),
})

/**
 * Hands every request under `/oauth` to the oidc-provider instance of the
 * environment whose issuer host it was sent to. It runs before routing, so
 * the console's body parser, session, CSRF and auth never touch the
 * protocol endpoints. Every other request continues as usual.
 *
 * These requests never reach the router, so they get an audit scope of
 * their own here, and what oidc-provider does is recorded on it: an app
 * being handed a code for a member, a member being refused an app, and
 * an app's request being refused. By then oidc-provider has loaded the
 * member and the client through our own callbacks.
 */
export default class OidcIssuerMiddleware {
  /**
   * A host that is not an issuer: a mistyped link or a deleted
   * organization. Browsers get the error page, apps' servers JSON.
   */
  async #unknownIssuer({ request, response, view }: HttpContext) {
    if (request.accepts(['json', 'html']) !== 'html') {
      return response.notFound({ error: 'unknown_issuer' })
    }

    const html = await view.render('errors/oidc', {
      ...errorPage('not_found', 'unknown_issuer'),
      theme: request.plainCookie('app_theme', { encoded: false }) === 'dark' ? 'dark' : 'light',
    })
    return response.status(404).header('content-type', 'text/html; charset=utf-8').send(html)
  }

  /**
   * Behind a proxy that terminates TLS, oidc-provider must build its URLs
   * from the `X-Forwarded-*` headers. Rather than trusting them on its own,
   * it is given the protocol, host and IP that AdonisJS resolved, which
   * honour the `trustProxy` setting: forwarded headers count only when they
   * come from a proxy AdonisJS trusts.
   */
  #forwardTrustedOrigin(ctx: HttpContext) {
    const headers = ctx.request.request.headers
    headers['x-forwarded-proto'] = ctx.request.protocol()
    headers['x-forwarded-host'] = ctx.request.host() ?? undefined
    headers['x-forwarded-for'] = ctx.request.ip()
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const req = ctx.request.request
    const url = req.url ?? '/'
    if (url !== PREFIX && !url.startsWith(`${PREFIX}/`) && !url.startsWith(`${PREFIX}?`)) {
      return next()
    }

    const environment = await Environment.findForIssuerHost(ctx.request.host())
    if (!environment) {
      return this.#unknownIssuer(ctx)
    }

    this.#forwardTrustedOrigin(ctx)

    const audit = requestScope(ctx, {
      organizationId: environment.organizationId,
      environmentId: environment.id,
    })

    const provider = createProvider({
      issuer: environment.issuerUrl(environment.organization.slug),
      jwks: environment.signingKeys.map((key) => key.toJwk()),
      cookieKeys: [env.get('APP_KEY').release()],
      adapter: (model) => new OidcStorageAdapter(model, environment),
      findAccount: async (_ctx, actorId) => {
        const member = await Member.findActive(environment, actorId)
        if (!member) {
          return undefined
        }

        return {
          accountId: actorId,
          member,
          claims: () => ({
            sub: actorId,
            name: member.fullName ?? undefined,
            email: member.email,
          }),
        }
      },
      admit: async (actorId, clientId, { oidc }) => {
        const appMember = await AppMember.findForSignIn(environment, actorId, clientId)
        await appMember?.recordSignIn()
        if (!appMember) {
          audit.record('sign_in.access_denied', memberOf(oidc), appOf(oidc.client!), environment)
        }
        return appMember !== null
      },
      permissionsFor: (actorId, clientId) =>
        AppMember.permissionsFor(environment, actorId, clientId),
    })

    /**
     * An app was handed a code for a member. `result` is what the sign-in
     * page submitted when the member was asked for credentials in this
     * sign-in, and is missing when they were already signed in.
     */
    provider.on('authorization.success', ({ oidc }) => {
      const login = oidc.result?.login
      audit.record(
        'sign_in.succeeded',
        memberOf(oidc),
        appOf(oidc.client!),
        environment,
        !login ? 'session' : login.amr?.includes(PROVIDER_AMR) ? 'provider' : 'password',
        typeof oidc.result?.how === 'string' ? oidc.result.how : null
      )
    })

    /**
     * A request from one of the environment's apps was refused. A request
     * naming a client we don't know has no app and is left out: anyone
     * can send those, and they say nothing about an app.
     */
    provider.on('grant.error', ({ oidc }, error) => {
      if (oidc?.client) {
        audit.record('sign_in.token_request_refused', appOf(oidc.client), environment, {
          error: error.message,
          description: error.error_description ?? null,
          grantType: oidc.params?.grant_type ? String(oidc.params.grant_type) : null,
        })
      }
    })
    provider.on('authorization.error', ({ oidc }, error) => {
      if (oidc?.client && !EXPECTED_REFUSALS.has(error.message)) {
        audit.record('sign_in.authorization_request_refused', appOf(oidc.client), environment, {
          error: error.message,
          description: error.error_description ?? null,
          redirectUri: oidc.params?.redirect_uri ? String(oidc.params.redirect_uri) : null,
        })
      }
    })

    /**
     * What was recorded is written once oidc-provider has handled the
     * request and before it answers
     */
    provider.use(async (_koa, proceed) => {
      await proceed()
      await audit.flush()
    })

    /**
     * Mount oidc-provider under the prefix, the way Express mounts a sub
     * app: it sees the path without `/oauth`, and works out the prefix
     * from `originalUrl` when building its URLs.
     */
    Object.assign(req, { originalUrl: url })
    req.url = url.slice(PREFIX.length) || '/'

    /**
     * oidc-provider writes the response itself, after which AdonisJS sees
     * the headers as sent and leaves the response alone.
     */
    await provider.callback()(req, ctx.response.response)
  }
}
