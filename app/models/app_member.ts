import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { AppMemberSchema } from '#database/schema'
import App from '#models/app'
import Role from '#models/role'
import Member from '#models/member'
import type Environment from '#models/environment'

/**
 * A member's access to an app in one environment: the roles they hold on
 * it there, and their first and last sign-in. An app member always holds
 * at least one role; without a row, the member can't sign in to the app
 * in that environment.
 */
export default class AppMember extends AppMemberSchema {
  @belongsTo(() => App)
  declare app: BelongsTo<typeof App>

  @belongsTo(() => Member, { foreignKey: 'actorId', localKey: 'actorId' })
  declare member: BelongsTo<typeof Member>

  @manyToMany(() => Role, {
    pivotTable: 'app_member_roles',
    pivotTimestamps: { createdAt: 'created_at', updatedAt: false },
  })
  declare roles: ManyToMany<typeof Role>

  /**
   * The app member for a member's actor signing in to the app with a
   * client ID, in the environment, or null when they have no access. The
   * actor ID comes from the issuer, as a string.
   */
  static findForSignIn(environment: Environment, actorId: string, clientId: string) {
    return this.query()
      .where('environment_id', environment.id)
      .where('actor_id', Number(actorId))
      .whereHas('roles', () => {})
      .whereIn(
        'app_id',
        environment.related('appEnvironments').query().where('client_id', clientId).select('app_id')
      )
      .first()
  }

  /**
   * The permission keys a member's actor holds on the app with a client ID, in
   * the environment: every key of every role they hold on it, sorted, for
   * the app's access tokens. Empty when they have no access.
   *
   * Keys are not filtered through the permission catalogue. Environments
   * run different versions of an app, so production may still check a key
   * that a newer catalogue has dropped; filtering would take it away the
   * moment the catalogue syncs, before production's code moves on (plan
   * §3, "Permission catalogue").
   */
  static async permissionsFor(environment: Environment, actorId: string, clientId: string) {
    const appMember = await this.findForSignIn(environment, actorId, clientId)
    if (!appMember) {
      return []
    }

    await appMember.load('roles')
    return [...new Set(appMember.roles.flatMap(({ permissions }) => permissions))].sort()
  }

  /**
   * Notes a sign-in to the app: sets the first sign-in, if there was none,
   * and moves the last one forward
   */
  async recordSignIn() {
    const now = DateTime.now()
    this.firstSignedInAt ??= now
    this.lastSignedInAt = now
    await this.save()
  }

  /**
   * Gives the member exactly these roles on the app, within the app
   * member's organization and environment
   */
  async syncRoles(this: AppMember, roleIds: number[]) {
    const scope = { organization_id: this.organizationId, environment_id: this.environmentId }
    await this.related('roles').sync(Object.fromEntries(roleIds.map((roleId) => [roleId, scope])))
  }

  /**
   * Takes the member's access away: they can't sign in to the app in this
   * environment, and their grants for it are revoked, so the app signs
   * them out at its next refresh
   */
  async revoke() {
    await db.transaction(async (trx) => {
      const clientIds = trx
        .from('app_environments')
        .where('environment_id', this.environmentId)
        .where('app_id', this.appId)
        .select('client_id')

      await trx
        .from('oidc_grants')
        .where('environment_id', this.environmentId)
        .where('actor_id', this.actorId)
        .whereIn('client_id', clientIds)
        .delete()
      await trx.from(AppMember.table).where('id', this.id).delete()
    })
  }
}
