import type { HttpContext } from '@adonisjs/core/http'
import EnvironmentTransformer from '#transformers/environment_transformer'

export default class OverviewController {
  async show({ inertia, organization }: HttpContext) {
    const environments = await organization
      .related('environments')
      .query()
      .withCount('members')
      .orderBy('kind', 'asc')
    const [{ $extras }] = await organization.related('apps').query().count('* as total')

    return inertia.render('overview/show', {
      environmentSummaries:
        EnvironmentTransformer.transform(environments).useVariant('forOverview'),
      appsCount: Number($extras.total),
    })
  }
}
