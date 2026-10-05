import type { HttpContext } from '@adonisjs/core/http'

export default class OverviewController {
  /**
   * How many apps and members the organization has
   */
  async show({ inertia, organization }: HttpContext) {
    const [apps] = await organization.related('apps').query().count('* as total')
    const [members] = await organization.related('members').query().count('* as total')

    return inertia.render('overview/show', {
      appsCount: Number(apps.$extras.total),
      membersCount: Number(members.$extras.total),
    })
  }
}
