import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import mail from '@adonisjs/mail/services/main'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { withManagedPassword } from '@adonisplus/persona/password'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { MemberSchema } from '#database/schema'
import Organization from '#models/organization'
import type Environment from '#models/environment'
import Actor from '#models/actor'
import AppMember from '#models/app_member'
import OidcSession from '#models/oidc_session'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { EnvironmentKind } from '#values/environment_kind'
import SetPasswordNotification from '#mails/set_password_notification'

/**
 * A person who signs in to the organization's internal apps, the same
 * member in every environment. `withAuthFinder` hashes the password on
 * save; credentials are checked within the organization by the issuer's
 * login page, not with `verifyCredentials`, which would search every
 * organization.
 *
 * `withManagedPassword` keeps the links a member sets or resets their
 * password from, in `password_reset_tokens`. A link the member asked for
 * works for an hour.
 */
export default class Member extends compose(
  MemberSchema,
  withAuthFinder(hash),
  withManagedPassword({ expiresIn: '1 hour' })
) {
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
   * Changes how the member signs in, and signs them out everywhere, so
   * the way they signed in before stops counting right away. Links to set
   * a password stop working too. Only an admin's action calls this.
   */
  async signInWith(method: MemberSignInMethod) {
    this.signInMethod = method
    await this.save()
    await this.clearPasswordResetTokens()
    await this.signOutEverywhere()
  }

  /**
   * Emails the member a link to set their password from, after an admin
   * added them or switched them to a password. The link is on the
   * production issuer's host and works for 3 days, since nobody is
   * waiting at a sign-in page for it. Links sent earlier stop working.
   */
  async sendPasswordSetup() {
    const organization = await Organization.findOrFail(this.organizationId)
    const production = await organization
      .related('environments')
      .query()
      .where('kind', EnvironmentKind.PRODUCTION)
      .firstOrFail()

    await this.clearPasswordResetTokens()
    const token = await Member.passwordResetTokens.create(this, { expiresIn: '3 days' })
    await mail.sendLater(new SetPasswordNotification(this, organization, production, token))
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
