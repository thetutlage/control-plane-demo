import type { HttpContext } from '@adonisjs/core/http'
import EnvironmentTransformer from '#transformers/environment_transformer'

export default class EnvironmentsController {
  /**
   * The organization's environments, each with its issuer URL and how many
   * apps are set up in it
   */
  async index({ inertia, organization }: HttpContext) {
    const environments = await organization
      .related('environments')
      .query()
      .preload('organization')
      .withCount('appEnvironments')
      .orderBy('kind', 'asc')

    return inertia.render('environments/index', {
      environmentSummaries:
        EnvironmentTransformer.transform(environments).useVariant('forSettings'),
    })
  }
}
