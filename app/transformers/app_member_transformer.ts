import type AppMember from '#models/app_member'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A member's access to an app in one environment. Expects `roles` to be
 * preloaded.
 */
export default class AppMemberTransformer extends BaseTransformer<AppMember> {
  toObject() {
    return {
      environmentId: this.resource.environmentId,
      roles: this.resource.roles.map((role) => this.pick(role, ['id', 'name'])),
      firstSignedInAt: this.resource.firstSignedInAt?.toFormat('d LLL yyyy, HH:mm') ?? null,
      lastSignedInAt: this.resource.lastSignedInAt?.toFormat('d LLL yyyy, HH:mm') ?? null,
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
      ...this.toObject(),
      member: this.pick(member, ['id', 'fullName', 'email']),
      isActive: Number(member.$extras.sessions_count ?? 0) > 0,
    }
  }

  /**
   * The app, for a member's page. Expects `app` to be preloaded.
   */
  forMember() {
    return {
      ...this.toObject(),
      app: this.pick(this.resource.app, ['id', 'name', 'slug']),
    }
  }
}
