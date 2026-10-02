import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { MemberSchema } from '#database/schema'
import Environment from '#models/environment'
import Actor from '#models/actor'

/**
 * A person who signs in to the organization's internal apps, in one
 * environment.
 */
export default class Member extends MemberSchema {
  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>

  @belongsTo(() => Actor)
  declare actor: BelongsTo<typeof Actor>
}
