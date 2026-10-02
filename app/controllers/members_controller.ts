import type { HttpContext } from '@adonisjs/core/http'
import MemberTransformer from '#transformers/member_transformer'

export default class MembersController {
  async index({ inertia, environment }: HttpContext) {
    const members = await environment.related('members').query().orderBy('email', 'asc')

    return inertia.render('members/index', {
      members: MemberTransformer.transform(members),
    })
  }
}
