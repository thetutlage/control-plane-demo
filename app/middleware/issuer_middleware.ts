import type Provider from 'oidc-provider'
import { errors } from '@adonisjs/lucid'
import Environment from '#models/environment'
import env from '#start/env'
import Member from '#models/member'
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
 * sign-in. A host that is not an issuer is a 404.
 */
export default class IssuerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const environment = await Environment.findForIssuerHost(ctx.request.host())
    if (!environment) {
      throw new errors.E_ROW_NOT_FOUND()
    }

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

    ctx.issuer = { environment, provider }
    return next()
  }
}
