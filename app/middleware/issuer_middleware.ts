import type Provider from 'oidc-provider'
import { errors } from '@adonisjs/lucid'
import Environment from '#models/environment'
import env from '#start/env'
import OidcStorageAdapter from '#oidc/storage_adapter'
import { createProvider } from '#oidc/create_provider'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    /**
     * The environment of the issuer host a sign-in page was requested on,
     * and its oidc-provider instance
     */
    issuer: { environment: Environment; provider: Provider }
  }
}

/**
 * Resolves the environment from the issuer host, for the sign-in pages.
 * They need its oidc-provider instance to read and finish the pending
 * sign-in. A host that is not an issuer is a 404. Audit events recorded
 * on these pages belong to the environment and its organization.
 */
export default class IssuerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const environment = await Environment.findForIssuerHost(ctx.request.host())
    if (!environment) {
      throw new errors.E_ROW_NOT_FOUND()
    }

    /**
     * The sign-in pages only read a pending sign-in and finish it, which
     * needs none of the callbacks `OidcIssuerMiddleware` gives its
     * provider
     */
    const provider = createProvider({
      issuer: environment.issuerUrl(environment.organization.slug),
      jwks: environment.signingKeys.map((key) => key.toJwk()),
      cookieKeys: [env.get('APP_KEY').release()],
      adapter: (model) => new OidcStorageAdapter(model, environment),
    })

    ctx.issuer = { environment, provider }
    ctx.audit = ctx.audit.with({
      organizationId: environment.organizationId,
      environmentId: environment.id,
    })
    return next()
  }
}
