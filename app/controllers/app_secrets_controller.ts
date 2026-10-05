import type { HttpContext } from '@adonisjs/core/http'
import { EnvironmentKind } from '#values/environment_kind'

/**
 * An app's client secret. An app has one at a time, so creating a new one
 * replaces it.
 */
export default class AppSecretsController {
  /**
   * Replaces the client secret right away: the app can't sign members in
   * or refresh until it has the new one. A production secret is flashed
   * so the settings tab can show it this once.
   */
  async store({ response, session, params, organization, environment }: HttpContext) {
    const app = await environment.related('apps').query().where('slug', params.app).firstOrFail()
    await app.rotateSecret(environment.kind)

    if (environment.kind === EnvironmentKind.PRODUCTION) {
      session.flash('clientSecret', { clientId: app.clientId, secret: app.secret })
    }
    session.flash('success', `Rotated ${app.name}'s secret. Update the app to use the new one.`)
    return response.redirect().toRoute('app_settings.show', {
      org: organization.slug,
      environment: environment.slug,
      app: app.slug,
    })
  }
}
