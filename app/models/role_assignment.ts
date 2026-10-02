import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { RoleAssignmentSchema } from '#database/schema'
import Role from '#models/role'
import Actor from '#models/actor'

export default class RoleAssignment extends RoleAssignmentSchema {
  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @belongsTo(() => Actor)
  declare actor: BelongsTo<typeof Actor>
}
