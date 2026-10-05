import type { HttpContext } from '@adonisjs/core/http'
import AppTransformer from '#transformers/app_transformer'
import { EnvironmentKind } from '#values/environment_kind'
import { createAppValidator } from '#validators/app'

export default class AppsController {
  async index({ inertia, environment }: HttpContext) {
    const apps = await environment.related('apps').query().orderBy('name', 'asc')

    return inertia.render('apps/index', {
      apps: AppTransformer.transform(apps),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('apps/create', {})
  }

  /**
   * Registers the app with a new client ID and secret, so it can sign in
   * right away. A production secret is flashed so the settings tab can
   * show it this once.
   */
  async store({ request, response, session, organization, environment }: HttpContext) {
    const isProduction = environment.kind === EnvironmentKind.PRODUCTION
    const payload = await request.validateUsing(createAppValidator, {
      meta: { environmentId: environment.id, isProduction },
    })
    const app = await environment.createApp({
      ...payload,
      postLogoutRedirectUris: payload.postLogoutRedirectUris ?? [],
    })

    if (isProduction) {
      session.flash('clientSecret', { clientId: app.clientId, secret: app.secret })
    }
    session.flash('success', `${app.name} is registered and can sign members in.`)
    return response.redirect().toRoute('app_settings.show', {
      org: organization.slug,
      environment: environment.slug,
      app: app.slug,
    })
  }

  /**
   * The app's overview tab, with how many members have ever signed in to
   * it and how many of them have a live session right now
   */
  async show({ inertia, params, organization, environment }: HttpContext) {
    const app = await environment.related('apps').query().where('slug', params.app).firstOrFail()
    const [members] = await app.related('members').query().count('* as total')
    const [active] = await app
      .related('members')
      .query()
      .whereHas('member', (member) =>
        member.whereHas('sessions', (sessions) => sessions.withScopes((scopes) => scopes.live()))
      )
      .count('* as total')

    return inertia.render('apps/show', {
      app: AppTransformer.transform(app),
      issuerUrl: environment.issuerUrl(organization.slug),
      membersCount: Number(members.$extras.total),
      activeMembersCount: Number(active.$extras.total),
    })
  }

  /**
   * Removes the app right away. Its grants and sign-in history go with it,
   * through the foreign keys, so members are signed out of it at their
   * next refresh.
   */
  async destroy({ response, session, params, organization, environment }: HttpContext) {
    const app = await environment.related('apps').query().where('slug', params.app).firstOrFail()
    await app.delete()

    session.flash('success', `Removed ${app.name}. Members were signed out of it.`)
    return response
      .redirect()
      .toRoute('apps.index', { org: organization.slug, environment: environment.slug })
  }
}
