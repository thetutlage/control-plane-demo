import Environment from '#models/environment'
import env from '#start/env'
import Member from '#models/member'
import OidcStorageAdapter from '#oidc/storage_adapter'
import { createProvider } from '#oidc/create_provider'
import { errorPage } from '#oidc/error_pages'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const PREFIX = '/oauth'

/**
 * Hands every request under `/oauth` to the oidc-provider instance of the
 * environment whose issuer host it was sent to. It runs before routing, so
 * the console's body parser, session, CSRF and auth never touch the
 * protocol endpoints. Every other request continues as usual.
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
    const provider = createProvider({
      issuer: environment.issuerUrl(environment.organization.slug),
      jwks: environment.signingKeys.map((key) => key.toJwk()),
      cookieKeys: [env.get('APP_KEY').release()],
      adapter: (model) => new OidcStorageAdapter(model, environment),
      findAccount: async (_ctx, accountId) => {
        const member = await Member.findActive(environment, accountId)
        if (!member) {
          return undefined
        }

        return {
          accountId,
          claims: () => ({
            sub: accountId,
            name: member.fullName ?? undefined,
            email: member.email,
          }),
        }
      },
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
