import type MemberIdentity from '#models/member_identity'
import { MemberIdentityOrigin } from '#values/member_identity_origin'
import { BaseTransformer } from '@adonisjs/core/transformers'

const ORIGIN_LABELS: Record<MemberIdentityOrigin, string> = {
  [MemberIdentityOrigin.MATCHED_BY_EMAIL]: 'Added by an admin, then matched by email',
  [MemberIdentityOrigin.JOINED]: 'Joined on their own through your identity provider',
}

/**
 * A member's account at the identity provider, as the admin sees it
 */
export default class MemberIdentityTransformer extends BaseTransformer<MemberIdentity> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'subject', 'email']),
      origin: ORIGIN_LABELS[this.resource.origin],
      firstSignedInAt: this.resource.createdAt.toFormat('d LLL yyyy, HH:mm'),
      lastSignedInAt: this.resource.lastSignedInAt?.toFormat('d LLL yyyy, HH:mm') ?? null,
    }
  }
}
