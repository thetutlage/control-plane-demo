import type { HttpContext } from '@adonisjs/core/http'
import AppTransformer from '#transformers/app_transformer'
import MemberAppTransformer from '#transformers/member_app_transformer'

/**
 * The members who have ever signed in to an app, shown on the app's
 * Members tab
 */
export default class AppMembersController {
  /**
   * Every member who has signed in to the app, most recent first, and
   * whether each has a live session right now
   */
  async index({ inertia, params, environment }: HttpContext) {
    const app = await environment.related('apps').query().where('slug', params.app).firstOrFail()
    const members = await app
      .related('members')
      .query()
      .preload('member', (query) =>
        query.withCount('sessions', (sessions) => sessions.withScopes((scopes) => scopes.live()))
      )
      .orderBy('last_signed_in_at', 'desc')

    return inertia.render('app_members/index', {
      app: AppTransformer.transform(app),
      members: MemberAppTransformer.transform(members).useVariant('forApp'),
    })
  }
}
