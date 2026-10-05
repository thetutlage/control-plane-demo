import { belongsTo, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import { ActorSchema } from '#database/schema'
import Organization from '#models/organization'
import Member from '#models/member'

export default class Actor extends ActorSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasOne(() => Member)
  declare member: HasOne<typeof Member>
}
