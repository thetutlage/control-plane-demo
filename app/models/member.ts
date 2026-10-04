import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { MemberSchema } from '#database/schema'
import Environment from '#models/environment'
import Actor from '#models/actor'
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
}
