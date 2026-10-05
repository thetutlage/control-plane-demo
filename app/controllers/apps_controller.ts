import type { HttpContext } from '@adonisjs/core/http'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
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

  /**
   * The app's overview tab, for the current environment
   */
  async show({ inertia, params, organization, environment }: HttpContext) {
    const { app, client } = await this.#findApp(organization, environment, params.app)

    return inertia.render('apps/show', {
      app: AppTransformer.transform(app),
      client: client ? AppClientTransformer.transform(client, organization) : null,
    })
  }

  /**
   * The app's settings tab: its client in the current environment
   */
  async settings({ inertia, params, organization, environment }: HttpContext) {
    const { app, client } = await this.#findApp(organization, environment, params.app)

    return inertia.render('apps/settings', {
      app: AppTransformer.transform(app),
      client: client ? AppClientTransformer.transform(client, organization) : null,
    })
  }

  /**
   * An app of the organization, and its client in the environment if it
   * has one
   */
  async #findApp(organization: Organization, environment: Environment, slug: string) {
    const app = await organization
      .related('apps')
      .query()
      .where('slug', slug)
      .preload('clients', (query) => query.where('environment_id', environment.id))
      .firstOrFail()

    return { app, client: app.clients[0] ?? null }
  }
}
