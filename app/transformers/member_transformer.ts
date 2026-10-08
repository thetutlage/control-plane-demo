import type Member from '#models/member'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { BaseTransformer } from '@adonisjs/core/transformers'

const STATUS_LABELS: Record<MemberStatus, string> = {
  [MemberStatus.INVITED]: 'Invited',
  [MemberStatus.ACTIVE]: 'Active',
  [MemberStatus.SUSPENDED]: 'Suspended',
}

const SIGN_IN_LABELS: Record<MemberSignInMethod, string> = {
  [MemberSignInMethod.PASSWORD]: 'A password',
  [MemberSignInMethod.PROVIDER]: 'Your identity provider',
}

export default class MemberTransformer extends BaseTransformer<Member> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'fullName', 'email']),
      status: { raw: this.resource.status, formatted: STATUS_LABELS[this.resource.status] },
      signsInWith: {
        raw: this.resource.signInMethod === MemberSignInMethod.PROVIDER ? 'provider' : 'password',
        formatted: SIGN_IN_LABELS[this.resource.signInMethod],
      },
      hasPassword: this.resource.password !== null,
      createdAt: this.resource.createdAt.toFormat('d LLL yyyy'),
    }
  }

  /**
   * Expects the query to load `withCount('sessions')`, counting live ones
   */
  forList() {
    return {
      ...this.toObject(),
      activeSessionsCount: Number(this.resource.$extras.sessions_count ?? 0),
    }
  }
}
