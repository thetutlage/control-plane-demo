import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { PermissionCatalogSchema } from '#database/schema'
import Organization from '#models/organization'

export default class PermissionCatalog extends PermissionCatalogSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
