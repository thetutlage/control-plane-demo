import type { HttpContext } from '@adonisjs/core/http'
import { EnvironmentKind } from '#values/environment_kind'
import EnvironmentMiddleware from '#middleware/environment_middleware'

export default class OrganizationsController {
  /**
   * Opens the console of the user's first organization. Becomes the
   * organization picker once users can belong to several.
   */
  async index({ auth, response }: HttpContext) {
    const organization = await auth
      .getUserOrFail()
      .related('organizations')
      .query()
      .orderBy('user_orgs.created_at', 'asc')
      .firstOrFail()

    return response.redirect().toRoute('organizations.show', { org: organization.slug })
  }

  /**
   * Opens the organization's console on the environment last opened, or
   * production
   */
  async show({ response, session, organization }: HttpContext) {
    const remembered = session.get(EnvironmentMiddleware.sessionKey(organization.id))
    const environment =
      organization.environments.find(({ slug }) => slug === remembered) ??
      organization.environments.find(({ kind }) => kind === EnvironmentKind.PRODUCTION)!

    return response
      .redirect()
      .toRoute('overview.show', { org: organization.slug, environment: environment.slug })
  }
}
