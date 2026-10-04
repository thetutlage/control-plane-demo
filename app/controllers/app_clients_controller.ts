import type App from '#models/app'
import type Organization from '#models/organization'
import type { HttpContext } from '@adonisjs/core/http'
import { EnvironmentKind } from '#values/environment_kind'
import AppTransformer from '#transformers/app_transformer'
import AppClientTransformer from '#transformers/app_client_transformer'
import { createAppClientValidator, updateAppClientValidator } from '#validators/app_client'
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
  /**
   * One of the organization's clients, with its app and environment.
   * Another organization's client is a 404.
   */
  async #findClient(organization: Organization, params: HttpContext['params']) {
    const client = await organization
      .related('appClients')
      .query()
      .where('id', params.client)
      .preload('app')
      .preload('environment')
      .firstOrFail()

    return { app: client.app, client }
  }

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

  async edit({ inertia, params, organization }: HttpContext) {
    const { app, client } = await this.#findClient(organization, params)

    return inertia.render('app_clients/edit', {
      app: AppTransformer.transform(app),
      client: AppClientTransformer.transform(client, organization),
      environment: EnvironmentTransformer.transform(client.environment),
    })
  }

  /**
   * Saves the client's URLs. Its environment and credentials don't change.
   */
  async update({ request, response, session, params, organization }: HttpContext) {
    const { app, client } = await this.#findClient(organization, params)
    const payload = await request.validateUsing(updateAppClientValidator, {
      meta: { isProduction: client.environment.kind === EnvironmentKind.PRODUCTION },
    })

    await client
      .merge({
        appUrl: payload.appUrl,
        redirectUris: payload.redirectUris,
        postLogoutRedirectUris: payload.postLogoutRedirectUris ?? [],
      })
      .save()

    session.flash('success', `Saved ${app.name}'s client in ${client.environment.name}.`)
    return response.redirect().toRoute('apps.show', { org: organization.slug, app: app.slug })
  }

  /**
   * Replaces the client secret right away: the app can't sign members in
   * or refresh until it has the new one. A production secret is flashed
   * so the app page can show it this once.
   */
  async rotateSecret({ response, session, params, organization }: HttpContext) {
    const { app, client } = await this.#findClient(organization, params)
    await client.rotateSecret(client.environment.kind)

    if (client.environment.kind === EnvironmentKind.PRODUCTION) {
      session.flash('clientSecret', { clientId: client.clientId, secret: client.secret })
    }
    session.flash(
      'success',
      `Rotated ${app.name}'s secret in ${client.environment.name}. Update the app to use the new one.`
    )
    return response.redirect().toRoute('apps.show', { org: organization.slug, app: app.slug })
  }

  /**
   * Removes the client right away. Its grants go with it, through the
   * foreign keys, so members are signed out of the app in that environment
   * at their next refresh.
   */
  async destroy({ response, session, params, organization }: HttpContext) {
    const { app, client } = await this.#findClient(organization, params)
    await client.delete()

    session.flash(
      'success',
      `Removed ${app.name}'s client in ${client.environment.name}. Members were signed out of it.`
    )
    return response.redirect().toRoute('apps.show', { org: organization.slug, app: app.slug })
  }
}
