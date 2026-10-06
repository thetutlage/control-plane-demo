import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { MemberSchema } from '#database/schema'
import Organization from '#models/organization'
import type Environment from '#models/environment'
import Actor from '#models/actor'
import AppMember from '#models/app_member'
import OidcSession from '#models/oidc_session'
import { MemberStatus } from '#values/member_status'

/**
 * A person who signs in to the organization's internal apps, the same
 * member in every environment. `withAuthFinder` hashes the password on
 * save; credentials are checked within the organization by the issuer's
 * login page, not with `verifyCredentials`, which would search every
 * organization.
 */
export default class Member extends compose(MemberSchema, withAuthFinder(hash)) {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Actor)
  declare actor: BelongsTo<typeof Actor>

  /**
   * Browsers the member is signed in on, at every environment's issuer,
   * including expired sessions not cleaned up yet
   */
  @hasMany(() => OidcSession, { foreignKey: 'actorId', localKey: 'actorId' })
  declare sessions: HasMany<typeof OidcSession>

  /**
   * Apps the member has access to, one row per environment
   */
  @hasMany(() => AppMember, { foreignKey: 'actorId', localKey: 'actorId' })
  declare apps: HasMany<typeof AppMember>

  /**
   * The member who can sign in as this actor at an environment's issuer:
   * active, and in the environment's organization. The actor ID comes from
   * the issuer, as a string.
   */
  static async findActive(environment: Environment, actorId: string) {
    const id = Number(actorId)
    if (!Number.isSafeInteger(id)) {
      return null
    }

    return this.query()
      .where('organization_id', environment.organizationId)
      .where('actor_id', id)
      .where('status', MemberStatus.ACTIVE)
      .first()
  }

  /**
   * Signs the member out of every app, on every browser, in every
   * environment: their sessions and grants go, and the grants' codes and
   * refresh tokens with them (foreign keys). Apps fail their next refresh,
   * and the next visit to an issuer asks for the password. Access tokens
   * already issued work until they expire.
   */
  async signOutEverywhere() {
    await db.transaction(async (trx) => {
      await trx.from('oidc_sessions').where('actor_id', this.actorId).delete()
      await trx.from('oidc_grants').where('actor_id', this.actorId).delete()
    })
  }
}
