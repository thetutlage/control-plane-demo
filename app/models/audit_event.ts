import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { AuditEventSchema } from '#database/schema'
import Environment from '#models/environment'

export default class AuditEvent extends AuditEventSchema {
  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>
}
