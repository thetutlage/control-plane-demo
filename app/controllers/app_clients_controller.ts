import type App from '#models/app'
import type Organization from '#models/organization'
import type { HttpContext } from '@adonisjs/core/http'
import { EnvironmentKind } from '#values/environment_kind'
import AppTransformer from '#transformers/app_transformer'
import { createAppClientValidator } from '#validators/app_client'
import EnvironmentTransformer from '#transformers/environment_transformer'

/**
 * The organization's environments the app has no client in yet
 */
function unconfiguredEnvironments(organization: Organization, app: App) {
  return organization.environments.filter(
    ({ id }) => !app.clients.some(({ environmentId }) => environmentId === id)
  )
}

export default class AppClientsController {
  async create({ inertia, request, response, session, params, organization }: HttpContext) {
    const app = await organization
      .related('apps')
      .query()
      .where('slug', params.app)
      .preload('clients')
      .firstOrFail()

    const environments = unconfiguredEnvironments(organization, app)
    if (environments.length === 0) {
      session.flash('error', `${app.name} already has a client in every environment.`)
      return response.redirect().toRoute('apps.show', { org: organization.slug, app: app.slug })
    }

    return inertia.render('app_clients/create', {
      app: AppTransformer.transform(app),
      availableEnvironments: EnvironmentTransformer.transform(environments),
      selectedEnvironment: request.input('environment', null) as string | null,
    })
  }

  /**
   * Creates the client in the chosen environment. A production secret is
   * flashed so the app page can show it this once.
   */
  async store({ request, response, session, params, organization }: HttpContext) {
    const app = await organization
      .related('apps')
      .query()
      .where('slug', params.app)
      .preload('clients')
      .firstOrFail()

    const environments = unconfiguredEnvironments(organization, app)
    const payload = await request.validateUsing(createAppClientValidator, {
      meta: {
        environments: environments.map(({ slug, kind }) => ({
          slug,
          isProduction: kind === EnvironmentKind.PRODUCTION,
        })),
      },
    })

    const environment = environments.find(({ slug }) => slug === payload.environment)!
    const client = await environment.createAppClient(app, {
      appUrl: payload.appUrl,
      redirectUris: payload.redirectUris,
      postLogoutRedirectUris: payload.postLogoutRedirectUris ?? [],
    })

    if (environment.kind === EnvironmentKind.PRODUCTION) {
      session.flash('clientSecret', { clientId: client.clientId, secret: client.secret })
    }
    session.flash('success', `${app.name} can now sign in to ${environment.name}.`)
    return response.redirect().toRoute('apps.show', { org: organization.slug, app: app.slug })
  }
}
