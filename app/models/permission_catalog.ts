import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { PermissionCatalogSchema } from '#database/schema'
import Environment from '#models/environment'

export default class PermissionCatalog extends PermissionCatalogSchema {
  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>
}
