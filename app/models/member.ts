import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { MemberSchema } from '#database/schema'
import Environment from '#models/environment'
import Actor from '#models/actor'
import MemberApp from '#models/member_app'
import OidcSession from '#models/oidc_session'
import { MemberStatus } from '#values/member_status'

/**
 * A person who signs in to the organization's internal apps, in one
 * environment. `withAuthFinder` hashes the password on save; credentials are
 * checked within one environment by the issuer's login page, not with
 * `verifyCredentials`, which would search every environment.
 */
export default class Member extends compose(MemberSchema, withAuthFinder(hash)) {
  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>

  @belongsTo(() => Actor)
  declare actor: BelongsTo<typeof Actor>

  /**
   * Browsers the member is signed in on at the issuer, including expired
   * sessions not cleaned up yet
   */
  @hasMany(() => OidcSession, { foreignKey: 'actorId', localKey: 'actorId' })
  declare sessions: HasMany<typeof OidcSession>

  /**
   * Apps the member has ever signed in to
   */
  @hasMany(() => MemberApp, { foreignKey: 'actorId', localKey: 'actorId' })
  declare apps: HasMany<typeof MemberApp>

  /**
   * The member who can sign in as this actor: active, and in this
   * environment. oidc-provider calls an actor ID an account ID, so it
   * arrives as a string.
   */
  static async findActive(environment: Environment, actorId: string) {
    const id = Number(actorId)
    if (!Number.isSafeInteger(id)) {
      return null
    }

    return this.query()
      .where('environment_id', environment.id)
      .where('actor_id', id)
      .where('status', MemberStatus.ACTIVE)
      .first()
  }

  /**
   * Signs the member out of every app, on every browser: their sessions
   * and grants go, and the grants' codes and refresh tokens with them (foreign
   * keys). Apps fail their next refresh, and the next visit to the issuer
   * asks for the password. Access tokens already issued work until they
   * expire.
   */
  async signOutEverywhere() {
    await db.transaction(async (trx) => {
      await trx.from('oidc_sessions').where('actor_id', this.actorId).delete()
      await trx.from('oidc_grants').where('actor_id', this.actorId).delete()
    })
  }
}
