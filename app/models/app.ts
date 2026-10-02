import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { AppSchema } from '#database/schema'
import Organization from '#models/organization'
import AppClient from '#models/app_client'

export default class App extends AppSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => AppClient)
  declare clients: HasMany<typeof AppClient>
}
