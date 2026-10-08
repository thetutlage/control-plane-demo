import { BaseEvent } from '@adonisjs/core/events'
import type Member from '#models/member'

/**
 * A member set their password from an emailed link, for the first time
 * or to replace one they forgot
 */
export default class MemberPasswordSet extends BaseEvent {
  constructor(public member: Member) {
    super()
  }
}
