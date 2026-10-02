import Provider from 'oidc-provider'
import type { Adapter } from 'oidc-provider'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Environment from '#models/environment'
import { EnvironmentKind } from '#values/environment_kind'

const consoleHost = new URL(env.get('APP_URL')).host

/**
 * Storage for codes, sessions, grants and refresh tokens is not wired up
 * yet. Reads find nothing and writes fail loudly, instead of falling back to
 * oidc-provider's in-memory store, which is shared by every instance.
 */
class NoStorageAdapter implements Adapter {
  constructor(private name: string) {}

  async upsert(): Promise<never> {
    throw new Error(`oidc-provider storage is not configured (tried to save a ${this.name})`)
  }
  async find() {
    return undefined
  }
  async findByUid() {
    return undefined
  }
  async findByUserCode() {
    return undefined
  }
  async consume() {}
  async destroy() {}
  async revokeByGrantId() {}
}

/**
 * Hands requests for an issuer subdomain to that environment's
 * oidc-provider instance. It runs before routing, so the console's
 * bodyparser, session, CSRF and auth never touch the protocol endpoints.
 * Requests for any other host continue to the console.
 */
export default class OidcIssuerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const host = ctx.request.host()
    if (!host?.endsWith(`.${consoleHost}`)) {
      return next()
    }

    const environment = await this.#findEnvironment(host.slice(0, -consoleHost.length - 1))
    if (!environment || environment.signingKeys.length === 0) {
      return ctx.response.notFound({ error: 'unknown_issuer' })
    }

    /**
     * oidc-provider writes the response itself, after which AdonisJS
     * sees the headers as sent and leaves the response alone.
     */
    const provider = this.#buildProvider(environment)
    await provider.callback()(ctx.request.request, ctx.response.response)
  }

  /**
   * The environment an issuer subdomain belongs to (the reverse of
   * `Environment#issuerSubdomain`), with its organization and its signing
   * keys, newest first.
   */
  async #findEnvironment(subdomain: string) {
    const [organizationSlug, environmentSlug, ...rest] = subdomain.split('--')
    if (!organizationSlug || rest.length) {
      return null
    }

    return Environment.query()
      .whereHas('organization', (query) => query.where('slug', organizationSlug))
      .if(
        environmentSlug,
        (query) =>
          query.where('slug', environmentSlug).whereNot('kind', EnvironmentKind.PRODUCTION),
        (query) => query.where('kind', EnvironmentKind.PRODUCTION)
      )
      .preload('organization')
      .preload('signingKeys', (query) => query.orderBy('created_at', 'desc'))
      .first()
  }

  /**
   * A new provider instance for every request, discarded afterwards, so it
   * always sees the environment's current keys and settings (plan §8).
   */
  #buildProvider(environment: Environment) {
    return new Provider(environment.issuerUrl(environment.organization.slug), {
      adapter: NoStorageAdapter,
      jwks: { keys: environment.signingKeys.map((key) => key.toJwk()) },
      cookies: { keys: [env.get('APP_KEY').release()] },
      features: {
        devInteractions: { enabled: false },
      },
    })
  }
}
