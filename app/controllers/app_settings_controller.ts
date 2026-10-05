import type { HttpContext } from '@adonisjs/core/http'
import type Environment from '#models/environment'
import AppTransformer from '#transformers/app_transformer'
import { EnvironmentKind } from '#values/environment_kind'
import { updateAppValidator } from '#validators/app'

/**
 * An app's settings: its credentials and URLs, shown on the app's Settings
 * tab
 */
export default class AppSettingsController {
  /**
   * One of the environment's apps, with its environment. An app of another
   * environment is a 404.
   */
  async #findApp(environment: Environment, slug: string) {
    return environment
      .related('apps')
      .query()
      .where('slug', slug)
      .preload('environment')
      .firstOrFail()
  }

  async show({ inertia, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(environment, params.app)

    return inertia.render('app_settings/show', {
      app: AppTransformer.transform(app).useVariant('forSettings'),
      issuerUrl: environment.issuerUrl(organization.slug),
    })
  }

  async edit({ inertia, params, environment }: HttpContext) {
    const app = await this.#findApp(environment, params.app)

    return inertia.render('app_settings/edit', {
      app: AppTransformer.transform(app).useVariant('forSettings'),
    })
  }

  /**
   * Saves the app's URLs. Its name, slug and credentials don't change.
   */
  async update({ request, response, session, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(environment, params.app)
    const payload = await request.validateUsing(updateAppValidator, {
      meta: { isProduction: environment.kind === EnvironmentKind.PRODUCTION },
    })

    app.appUrl = payload.appUrl
    app.redirectUris = payload.redirectUris
    app.postLogoutRedirectUris = payload.postLogoutRedirectUris ?? []
    await app.save()

    session.flash('success', `Saved ${app.name}.`)
    return response.redirect().toRoute('app_settings.show', {
      org: organization.slug,
      environment: environment.slug,
      app: app.slug,
    })
  }
}
