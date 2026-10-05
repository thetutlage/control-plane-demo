import type MemberApp from '#models/member_app'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * An app a member has signed in to. Expects `app` to be preloaded.
 */
export default class MemberAppTransformer extends BaseTransformer<MemberApp> {
  toObject() {
    return {
      app: this.pick(this.resource.app, ['id', 'name', 'slug']),
      firstSignedInAt: this.resource.firstSignedInAt.toFormat('d LLL yyyy, HH:mm'),
      lastSignedInAt: this.resource.lastSignedInAt.toFormat('d LLL yyyy, HH:mm'),
    }
  }
}
