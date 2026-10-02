import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { RoleSchema } from '#database/schema'
import Environment from '#models/environment'
import RoleAssignment from '#models/role_assignment'

export default class Role extends RoleSchema {
  /**
   * pg would send a JS array as a Postgres array, not as JSON
   */
  @column({ prepare: (value: string[]) => JSON.stringify(value) })
  declare permissions: string[]

  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>

  @hasMany(() => RoleAssignment)
  declare assignments: HasMany<typeof RoleAssignment>
}
