import type App from '#models/app'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import type { HttpContext } from '@adonisjs/core/http'
import { EnvironmentKind } from '#values/environment_kind'
import AppTransformer from '#transformers/app_transformer'
import AppClientTransformer from '#transformers/app_client_transformer'
import { appClientValidator } from '#validators/app_client'
import EnvironmentTransformer from '#transformers/environment_transformer'

export default class AppClientsController {
  /**
   * An app of the organization, with its client in the environment if it
   * has one
   */
  async #findApp(organization: Organization, environment: Environment, slug: string) {
    return organization
      .related('apps')
      .query()
      .where('slug', slug)
      .preload('clients', (query) => query.where('environment_id', environment.id))
      .firstOrFail()
  }

  /**
   * Back to the app's settings tab, in the client's environment
   */
  #toSettings(
    response: HttpContext['response'],
    organization: Organization,
    app: App,
    environment: Environment
  ) {
    return response
      .redirect()
      .withQs({ environment: environment.slug })
      .toRoute('apps.settings', { org: organization.slug, app: app.slug })
  }

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

  /**
   * The form to configure the app in the current environment. An app has
   * at most one client per environment.
   */
  async create({ inertia, response, session, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, environment, params.app)
    if (app.clients.length) {
      session.flash('error', `${app.name} already has a client.`)
      return this.#toSettings(response, organization, app, environment)
    }

    return inertia.render('app_clients/create', { app: AppTransformer.transform(app) })
  }

  /**
   * Creates the client in the current environment. A production secret is
   * flashed so the settings tab can show it this once.
   */
  async store({ request, response, session, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, environment, params.app)
    if (app.clients.length) {
      session.flash('error', `${app.name} already has a client.`)
      return this.#toSettings(response, organization, app, environment)
    }

    const payload = await request.validateUsing(appClientValidator, {
      meta: { isProduction: environment.kind === EnvironmentKind.PRODUCTION },
    })
    const client = await environment.createAppClient(app, {
      appUrl: payload.appUrl,
      redirectUris: payload.redirectUris,
      postLogoutRedirectUris: payload.postLogoutRedirectUris ?? [],
    })

    if (environment.kind === EnvironmentKind.PRODUCTION) {
      session.flash('clientSecret', { clientId: client.clientId, secret: client.secret })
    }
    session.flash('success', `${app.name} can now sign in.`)
    return this.#toSettings(response, organization, app, environment)
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
    const payload = await request.validateUsing(appClientValidator, {
      meta: { isProduction: client.environment.kind === EnvironmentKind.PRODUCTION },
    })

    await client
      .merge({
        appUrl: payload.appUrl,
        redirectUris: payload.redirectUris,
        postLogoutRedirectUris: payload.postLogoutRedirectUris ?? [],
      })
      .save()

    session.flash('success', `Saved ${app.name}'s client.`)
    return this.#toSettings(response, organization, app, client.environment)
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
    session.flash('success', `Rotated ${app.name}'s secret. Update the app to use the new one.`)
    return this.#toSettings(response, organization, app, client.environment)
  }

  /**
   * Removes the client right away. Its grants go with it, through the
   * foreign keys, so members are signed out of the app in that environment
   * at their next refresh.
   */
  async destroy({ response, session, params, organization }: HttpContext) {
    const { app, client } = await this.#findClient(organization, params)
    await client.delete()

    session.flash('success', `Removed ${app.name}'s client. Members were signed out of it.`)
    return this.#toSettings(response, organization, app, client.environment)
  }
}
