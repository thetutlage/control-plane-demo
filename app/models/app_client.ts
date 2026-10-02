import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { AppClientSchema } from '#database/schema'
import App from '#models/app'
import Environment from '#models/environment'

export default class AppClient extends AppClientSchema {
  /**
   * pg would send a JS array as a Postgres array, not as JSON
   */
  @column({ prepare: (value: string[]) => JSON.stringify(value) })
  declare redirectUris: string[]

  @belongsTo(() => App)
  declare app: BelongsTo<typeof App>

  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>
}
