import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { AdminAuditEventSchema } from '#database/schema'
import Organization from '#models/organization'

export default class AdminAuditEvent extends AdminAuditEventSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
