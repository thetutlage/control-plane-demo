import type { HttpContext } from '@adonisjs/core/http'
import { EnvironmentKind } from '#values/environment_kind'

/**
 * An app's client secret in one environment. The app has one at a time
 * there, so creating a new one replaces it.
 */
export default class AppSecretsController {
  /**
   * Replaces the client secret right away: the app can't sign members in
   * or refresh in this environment until it has the new one. A production
   * secret is flashed so the tab can show it this once.
   */
  async store({ response, session, params, organization, environment }: HttpContext) {
    const app = await organization.related('apps').query().where('slug', params.app).firstOrFail()
    const setup = await app
      .related('environments')
      .query()
      .where('environment_id', environment.id)
      .firstOrFail()
    await setup.rotateSecret(environment.kind)

    if (environment.kind === EnvironmentKind.PRODUCTION) {
      session.flash('clientSecret', { clientId: setup.clientId, secret: setup.secret })
    }
    session.flash('success', `Rotated ${app.name}'s secret. Update the app to use the new one.`)
    return response.redirect().toRoute('app_environments.show', {
      org: organization.slug,
      app: app.slug,
      environment: environment.slug,
    })
  }
}
