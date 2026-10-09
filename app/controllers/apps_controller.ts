import { auditedTransaction } from '#audit/transaction'
import type { HttpContext } from '@adonisjs/core/http'
import { createAppValidator } from '#validators/app'
import AppTransformer from '#transformers/app_transformer'

export default class AppsController {
  /**
   * The organization's apps, with the environments each is set up in
   */
  async index({ inertia, organization }: HttpContext) {
    const apps = await organization
      .related('apps')
      .query()
      .preload('environments')
      .orderBy('name', 'asc')

    return inertia.render('apps/index', {
      apps: AppTransformer.transform(apps).useVariant('forList'),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('apps/create', {})
  }

  /**
   * Registers the app, then opens its first environment (development), so
   * it can be set up there
   */
  async store({ request, response, session, organization, auth, audit }: HttpContext) {
    const payload = await request.validateUsing(createAppValidator, {
      meta: { organizationId: organization.id },
    })
    const app = await auditedTransaction(audit, async (trx, batch) => {
      const created = await organization.useTransaction(trx).related('apps').create(payload)
      batch.record('configuration.app_created', auth.getUserOrFail(), created)
      return created
    })

    session.flash('success', `${app.name} is registered. Set it up in an environment next.`)
    return response.redirect().toRoute('app_environments.show', {
      org: organization.slug,
      app: app.slug,
      environment: organization.environments[0].slug,
    })
  }

  /**
   * The app's Overview tab: the environments it is set up in
   */
  async show({ inertia, params, organization }: HttpContext) {
    const app = await organization
      .related('apps')
      .query()
      .where('slug', params.app)
      .preload('environments')
      .firstOrFail()

    return inertia.render('apps/show', {
      app: AppTransformer.transform(app).useVariant('forList'),
    })
  }

  /**
   * Deletes the app from every environment. Its setups, grants and sign-in
   * history go with it, through the foreign keys, so members are signed out
   * of it at their next refresh.
   */
  async destroy({ response, session, params, organization, auth, audit }: HttpContext) {
    const app = await organization.related('apps').query().where('slug', params.app).firstOrFail()
    await auditedTransaction(audit, async (trx, batch) => {
      await app.useTransaction(trx).delete()
      batch.record('configuration.app_deleted', auth.getUserOrFail(), app)
    })

    session.flash('success', `Deleted ${app.name}. Members were signed out of it.`)
    return response.redirect().toRoute('apps.index', { org: organization.slug })
  }
}
