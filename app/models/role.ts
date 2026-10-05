import db from '@adonisjs/lucid/services/db'
import { belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { RoleSchema } from '#database/schema'
import Organization from '#models/organization'
import AppMember from '#models/app_member'

export default class Role extends RoleSchema {
  /**
   * pg would send a JS array as a Postgres array, not as JSON
   */
  @column({ prepare: (value: string[]) => JSON.stringify(value) })
  declare permissions: string[]

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * Who holds the role, on which app, in which environment
   */
  @manyToMany(() => AppMember, {
    pivotTable: 'app_member_roles',
    pivotForeignKey: 'role_id',
    pivotRelatedForeignKey: 'app_member_id',
  })
  declare appMembers: ManyToMany<typeof AppMember>

  /**
   * Deletes the role in every environment. Members it was the only role
   * of, on an app, lose access to that app there and are signed out of it.
   */
  async deleteEverywhere(this: Role) {
    const soleHolders = await this.related('appMembers')
      .query()
      .whereDoesntHave('roles', (roles) => roles.whereNot('roles.id', this.id))

    for (const appMember of soleHolders) {
      await appMember.revoke()
    }
    await db.from(Role.table).where('id', this.id).delete()
  }
}
