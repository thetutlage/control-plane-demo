import type MemberApp from '#models/member_app'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A member's sign-ins to an app
 */
export default class MemberAppTransformer extends BaseTransformer<MemberApp> {
  /**
   * The app, for a member's page. Expects `app` to be preloaded.
   */
  toObject() {
    return {
      app: this.pick(this.resource.app, ['id', 'name', 'slug']),
      ...this.#signIns(),
    }
  }

  /**
   * The member, for an app's page, and whether they have a live session.
   * Expects `member` to be preloaded with `withCount('sessions')`, counting
   * live ones.
   */
  forApp() {
    const { member } = this.resource

    return {
      member: this.pick(member, ['id', 'fullName', 'email']),
      isActive: Number(member.$extras.sessions_count ?? 0) > 0,
      ...this.#signIns(),
    }
  }

  #signIns() {
    return {
      firstSignedInAt: this.resource.firstSignedInAt.toFormat('d LLL yyyy, HH:mm'),
      lastSignedInAt: this.resource.lastSignedInAt.toFormat('d LLL yyyy, HH:mm'),
    }
  }
}
