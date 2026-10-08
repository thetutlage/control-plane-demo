import { BaseEvent } from '@adonisjs/core/events'
import type Member from '#models/member'
import type IdentityProvider from '#models/identity_provider'

/**
 * A member signed in through the organization's identity provider. `how`
 * says how they were found: `returning` by the provider's permanent ID,
 * `matched_by_email` on the first sign-in of a member an admin had
 * already added, or `created` on the first sign-in of someone new.
 */
export default class MemberSignedInWithProvider extends BaseEvent {
  constructor(
    public member: Member,
    public identityProvider: IdentityProvider,
    public how: 'returning' | 'matched_by_email' | 'created'
  ) {
    super()
  }
}
