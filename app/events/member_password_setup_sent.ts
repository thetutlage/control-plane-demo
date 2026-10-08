import { BaseEvent } from '@adonisjs/core/events'
import type User from '#models/user'
import type Member from '#models/member'

/**
 * An admin emailed a member the link to set their password from, again
 */
export default class MemberPasswordSetupSent extends BaseEvent {
  constructor(
    public member: Member,
    public user: User
  ) {
    super()
  }
}
