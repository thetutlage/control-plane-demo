import type { HttpContext } from '@adonisjs/core/http'
import { MemberStatus } from '#values/member_status'
import { createMemberValidator } from '#validators/member'
import MemberTransformer from '#transformers/member_transformer'

export default class MembersController {
  async index({ inertia, environment }: HttpContext) {
    const members = await environment.related('members').query().orderBy('email', 'asc')

    return inertia.render('members/index', {
      members: MemberTransformer.transform(members),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('members/create', {})
  }

  /**
   * Adds an active member who can sign in right away with the given
   * password
   */
  async store({ request, response, session, organization, environment }: HttpContext) {
    const payload = await request.validateUsing(createMemberValidator, {
      meta: { environmentId: environment.id },
    })
    const member = await environment.createMember({ ...payload, status: MemberStatus.ACTIVE })

    session.flash('success', `${member.email} can now sign in to ${environment.name}.`)
    return response.redirect().toRoute('members.index', {
      org: organization.slug,
      environment: environment.slug,
    })
  }
}
