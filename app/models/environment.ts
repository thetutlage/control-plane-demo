import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { EnvironmentSchema } from '#database/schema'
import { ActorType } from '#values/actor_type'
import { EnvironmentKind } from '#values/environment_kind'
import Organization from '#models/organization'
import Actor from '#models/actor'
import Member from '#models/member'
import AppClient from '#models/app_client'
import type App from '#models/app'
import PermissionCatalog from '#models/permission_catalog'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import SigningKey from '#models/signing_key'

const consoleUrl = new URL(env.get('APP_URL'))

export default class Environment extends EnvironmentSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => Actor)
  declare actors: HasMany<typeof Actor>

  @hasMany(() => Member)
  declare members: HasMany<typeof Member>

  @hasMany(() => AppClient)
  declare appClients: HasMany<typeof AppClient>

  @hasOne(() => PermissionCatalog)
  declare permissionCatalog: HasOne<typeof PermissionCatalog>

  @hasMany(() => Role)
  declare roles: HasMany<typeof Role>

  @hasMany(() => RoleAssignment)
  declare roleAssignments: HasMany<typeof RoleAssignment>

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
   * Configures an app in this environment: creates its client, with a new
   * client ID and secret.
   */
  async createAppClient(app: App, values: Pick<AppClient, 'appUrl' | 'redirectUris'>) {
    return AppClient.create(
      {
        ...values,
        organizationId: this.organizationId,
        environmentId: this.id,
        appId: app.id,
        ...AppClient.generateCredentials(this.kind),
      },
      { client: this.$trx }
    )
  }

  /**
   * Adds a member to this environment, together with the actor that
   * represents them in role assignments and audit events.
   */
  async createMember(
    values: Pick<Member, 'email' | 'fullName' | 'status'> & { password?: string }
  ) {
    return db.transaction(async (trx) => {
      const scope = { organizationId: this.organizationId, environmentId: this.id }

      const actor = await Actor.create({ ...scope, type: ActorType.MEMBER }, { client: trx })
      return Member.create({ ...values, ...scope, actorId: actor.id }, { client: trx })
    })
  }
}
