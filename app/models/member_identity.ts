import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { MemberIdentitySchema } from '#database/schema'
import Member from '#models/member'
import IdentityProvider from '#models/identity_provider'

/**
 * A member's account at the organization's identity provider, by the
 * provider's permanent ID for them
 */
export default class MemberIdentity extends MemberIdentitySchema {
  @belongsTo(() => Member)
  declare member: BelongsTo<typeof Member>

  @belongsTo(() => IdentityProvider)
  declare identityProvider: BelongsTo<typeof IdentityProvider>
}
