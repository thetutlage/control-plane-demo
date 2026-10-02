import type { HttpContext } from '@adonisjs/core/http'
import AppTransformer from '#transformers/app_transformer'

export default class AppsController {
  async index({ inertia, organization }: HttpContext) {
    const apps = await organization.related('apps').query().orderBy('name', 'asc')

    return inertia.render('apps/index', {
      apps: AppTransformer.transform(apps),
    })
  }
}
