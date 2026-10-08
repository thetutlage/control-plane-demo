import { BaseEvent } from '@adonisjs/core/events'
import type User from '#models/user'
import type Member from '#models/member'

/**
 * An admin dissociated a member from their account at the identity
 * provider. `subject` is the provider's ID that was removed; the member's
 * next sign-in through the provider is matched by email again.
 */
export default class MemberIdentityDissociated extends BaseEvent {
  constructor(
    public member: Member,
    public subject: string,
    public user: User
  ) {
    super()
  }
}
