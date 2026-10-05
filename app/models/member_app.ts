import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { MemberAppSchema } from '#database/schema'
import App from '#models/app'
import AppClient from '#models/app_client'
import type Environment from '#models/environment'

/**
 * An app a member has signed in to, with their first and last sign-in
 */
export default class MemberApp extends MemberAppSchema {
  @belongsTo(() => App)
  declare app: BelongsTo<typeof App>

  /**
   * Notes a member's sign-in to the app of a client: adds the app to the
   * member's apps, or moves its last sign-in forward. oidc-provider calls
   * the member's actor ID an account ID.
   */
  static async recordSignIn(environment: Environment, actorId: string, clientId: string) {
    const client = await AppClient.query()
      .where('environment_id', environment.id)
      .where('client_id', clientId)
      .firstOrFail()
    const now = DateTime.now().toJSDate()

    await db
      .table(this.table)
      .insert({
        organization_id: environment.organizationId,
        environment_id: environment.id,
        actor_id: Number(actorId),
        app_id: client.appId,
        first_signed_in_at: now,
        last_signed_in_at: now,
      })
      .onConflict(['actor_id', 'app_id'])
      .merge(['last_signed_in_at'])
  }
}
