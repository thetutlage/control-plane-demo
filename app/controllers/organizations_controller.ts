import type { HttpContext } from '@adonisjs/core/http'

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

    return response.redirect().toRoute('overview.show', { org: organization.slug })
  }
}
