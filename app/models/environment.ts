import env from '#start/env'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { EnvironmentSchema } from '#database/schema'
import { EnvironmentKind } from '#values/environment_kind'
import Organization from '#models/organization'
import type App from '#models/app'
import AppEnvironment from '#models/app_environment'
import SigningKey from '#models/signing_key'

const consoleUrl = new URL(env.get('APP_URL'))

export default class Environment extends EnvironmentSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The apps set up in this environment, with their credentials here
   */
  @hasMany(() => AppEnvironment)
  declare appEnvironments: HasMany<typeof AppEnvironment>

  @hasMany(() => SigningKey)
  declare signingKeys: HasMany<typeof SigningKey>

  /**
   * Whether a host is shaped like an issuer host: a subdomain of the
   * console's host. It may still belong to no environment.
   */
  static isIssuerHost(host: string | null) {
    return Boolean(host?.endsWith(`.${consoleUrl.host}`))
  }

  /**
   * The environment an issuer host belongs to, with its organization and
   * its signing keys (newest first) loaded for building its oidc-provider
   * instance, or null when the host is not an issuer. The reverse of `issuerSubdomain`: `acme.<domain>` is Acme's
   * production environment, `acme--staging.<domain>` its staging one.
   */
  static async findForIssuerHost(host: string | null) {
    if (!host || !Environment.isIssuerHost(host)) {
      return null
    }

    const subdomain = host.slice(0, -consoleUrl.host.length - 1)
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
      .whereHas('signingKeys', () => {})
      .preload('organization')
      .preload('signingKeys', (query) => query.orderBy('created_at', 'desc'))
      .first()
  }

  /**
   * The subdomain of this environment's issuer: the organization slug for
   * production, and `<org>--<environment>` for every other environment.
   * Organization slugs cannot contain `--`, so the split is unambiguous.
   */
  issuerSubdomain(organizationSlug: string) {
    return this.kind === EnvironmentKind.PRODUCTION
      ? organizationSlug
      : `${organizationSlug}--${this.slug}`
  }

  /**
   * The URL of this environment's OpenID issuer, on a subdomain of the
   * console's own URL. Apps are configured with it, and it is the `iss` of
   * every token the environment issues.
   */
  issuerUrl(organizationSlug: string) {
    return `${consoleUrl.protocol}//${this.issuerSubdomain(organizationSlug)}.${consoleUrl.host}/oauth`
  }

  /**
   * Adds a new key for this environment's issuer to sign tokens with.
   */
  async createSigningKey() {
    return SigningKey.create(
      {
        organizationId: this.organizationId,
        environmentId: this.id,
        ...(await SigningKey.generateAttributes()),
      },
      { client: this.$trx }
    )
  }

  /**
   * Sets an app up in this environment, with a new client ID and secret
   */
  async setUpApp(
    app: App,
    values: Pick<AppEnvironment, 'appUrl' | 'redirectUris'> &
      Partial<Pick<AppEnvironment, 'postLogoutRedirectUris'>>
  ) {
    return AppEnvironment.create(
      {
        ...values,
        organizationId: this.organizationId,
        environmentId: this.id,
        appId: app.id,
        ...AppEnvironment.generateCredentials(this.kind),
      },
      { client: this.$trx }
    )
  }
}
