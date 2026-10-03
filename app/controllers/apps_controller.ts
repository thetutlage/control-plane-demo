import type { HttpContext } from '@adonisjs/core/http'
import { createAppValidator } from '#validators/app'
import AppTransformer from '#transformers/app_transformer'
import AppClientTransformer from '#transformers/app_client_transformer'

export default class AppsController {
  async index({ inertia, organization }: HttpContext) {
    const apps = await organization.related('apps').query().orderBy('name', 'asc')

    return inertia.render('apps/index', {
      apps: AppTransformer.transform(apps),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('apps/create', {})
  }

  /**
   * Registers the app only. Its clients are configured afterwards, one
   * environment at a time.
   */
  async store({ request, response, session, organization }: HttpContext) {
    const payload = await request.validateUsing(createAppValidator, {
      meta: { organizationId: organization.id },
    })
    const app = await organization.related('apps').create(payload)

    session.flash('success', `${app.name} is registered. Configure a client to let it sign in.`)
    return response.redirect().toRoute('apps.show', { org: organization.slug, app: app.slug })
  }

  async show({ inertia, params, organization }: HttpContext) {
    const app = await organization
      .related('apps')
      .query()
      .where('slug', params.app)
      .preload('clients')
      .firstOrFail()

    return inertia.render('apps/show', {
      app: AppTransformer.transform(app),
      clients: AppClientTransformer.transform(app.clients, organization),
    })
  }
}
