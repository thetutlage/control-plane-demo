import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { ActorSchema } from '#database/schema'
import Environment from '#models/environment'
import Member from '#models/member'
import RoleAssignment from '#models/role_assignment'

export default class Actor extends ActorSchema {
  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>

  @hasOne(() => Member)
  declare member: HasOne<typeof Member>

  @hasMany(() => RoleAssignment)
  declare roleAssignments: HasMany<typeof RoleAssignment>
}
