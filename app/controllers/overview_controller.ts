import type { HttpContext } from '@adonisjs/core/http'

export default class OverviewController {
  /**
   * How many apps and members the environment has
   */
  async show({ inertia, environment }: HttpContext) {
    const [apps] = await environment.related('apps').query().count('* as total')
    const [members] = await environment.related('members').query().count('* as total')

    return inertia.render('overview/show', {
      appsCount: Number(apps.$extras.total),
      membersCount: Number(members.$extras.total),
    })
  }
}
