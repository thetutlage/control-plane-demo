import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import { hasMany, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'
import { OrganizationSchema } from '#database/schema'
import { ActorType } from '#values/actor_type'
import User from '#models/user'
import Environment from '#models/environment'
import Actor from '#models/actor'
import App from '#models/app'
import Member from '#models/member'
import PermissionCatalog from '#models/permission_catalog'
import Role from '#models/role'
import IdentityProvider from '#models/identity_provider'

export default class Organization extends OrganizationSchema {
  @manyToMany(() => User, {
    pivotTable: 'user_orgs',
    pivotTimestamps: { createdAt: 'created_at', updatedAt: false },
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => Environment)
  declare environments: HasMany<typeof Environment>

  @hasMany(() => App)
  declare apps: HasMany<typeof App>

  @hasMany(() => Member)
  declare members: HasMany<typeof Member>

  @hasOne(() => PermissionCatalog)
  declare permissionCatalog: HasOne<typeof PermissionCatalog>

  @hasMany(() => Role)
  declare roles: HasMany<typeof Role>

  /**
   * The company's own identity provider, which its staff sign in with.
   * The console connects at most one.
   */
  @hasMany(() => IdentityProvider)
  declare identityProviders: HasMany<typeof IdentityProvider>

  /**
   * The redirect URI the company registers at its identity provider, on
   * the console's host. It is the same for every environment, and the
   * organization's slug in the path makes it different for every
   * provider (RFC 9700 §4.4.2.2).
   */
  signInCallbackUrl() {
    return new URL(`/sign-in/callback/${this.slug}`, env.get('APP_URL')).href
  }

  /**
   * Adds a member, together with the actor that represents them in role
   * assignments and audit events. The member is the same person in every
   * environment.
   */
  async createMember(
    values: Pick<Member, 'email' | 'fullName' | 'status'> & { password?: string }
  ) {
    return db.transaction(async (trx) => {
      const actor = await Actor.create(
        { organizationId: this.id, type: ActorType.MEMBER },
        { client: trx }
      )
      return Member.create(
        { ...values, organizationId: this.id, actorId: actor.id },
        { client: trx }
      )
    })
  }
}
