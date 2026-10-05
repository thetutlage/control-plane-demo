import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { AppSchema } from '#database/schema'
import Organization from '#models/organization'
import AppEnvironment from '#models/app_environment'
import AppMember from '#models/app_member'

export default class App extends AppSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The environments the app is set up in, with its credentials in each
   */
  @hasMany(() => AppEnvironment)
  declare environments: HasMany<typeof AppEnvironment>

  /**
   * Members with access to the app, one row per environment
   */
  @hasMany(() => AppMember)
  declare members: HasMany<typeof AppMember>
}
