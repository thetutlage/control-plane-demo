import { BaseEvent } from '@adonisjs/core/events'
import type User from '#models/user'
import type Member from '#models/member'

/**
 * An admin changed how a member signs in: with the organization's
 * identity provider, or with a password. The member's new setting is on
 * the model. When removing the provider switched them, `user` is the
 * admin who removed it.
 */
export default class MemberSignInMethodChanged extends BaseEvent {
  constructor(
    public member: Member,
    public user: User
  ) {
    super()
  }
}
