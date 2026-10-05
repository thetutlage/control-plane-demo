import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'
import { MemberStatus } from '#values/member_status'
import { createMemberValidator } from '#validators/member'
import MemberTransformer from '#transformers/member_transformer'
import AppMemberTransformer from '#transformers/app_member_transformer'
import OidcSessionTransformer from '#transformers/oidc_session_transformer'

export default class MembersController {
  /**
   * One of the organization's members. Another organization's member is a
   * 404.
   */
  async #findMember(organization: Organization, id: string) {
    return organization.related('members').query().where('id', id).firstOrFail()
  }

  /**
   * The organization's members, with how many browsers each is signed in
   * on, across every environment
   */
  async index({ inertia, organization }: HttpContext) {
    const members = await organization
      .related('members')
      .query()
      .withCount('sessions', (query) => query.withScopes((scopes) => scopes.live()))
      .orderBy('email', 'asc')

    return inertia.render('members/index', {
      members: MemberTransformer.transform(members).useVariant('forList'),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('members/create', {})
  }

  /**
   * Adds an active member who can sign in right away with the given
   * password
   */
  async store({ request, response, session, organization }: HttpContext) {
    const payload = await request.validateUsing(createMemberValidator, {
      meta: { organizationId: organization.id },
    })
    const member = await organization.createMember({ ...payload, status: MemberStatus.ACTIVE })

    session.flash('success', `${member.email} can now sign in.`)
    return response.redirect().toRoute('members.index', { org: organization.slug })
  }

  /**
   * The member, the browsers they're signed in on, and the apps they have
   * access to, each tagged with its environment
   */
  async show({ inertia, params, organization }: HttpContext) {
    const member = await this.#findMember(organization, params.member)
    const sessions = await member
      .related('sessions')
      .query()
      .withScopes((scopes) => scopes.live())
      .orderBy('signed_in_at', 'desc')
    const apps = await member
      .related('apps')
      .query()
      .preload('app')
      .preload('roles', (roles) => roles.orderBy('name', 'asc'))
      .orderByRaw('last_signed_in_at desc nulls last')

    return inertia.render('members/show', {
      member: MemberTransformer.transform(member),
      sessions: OidcSessionTransformer.transform(sessions),
      apps: AppMemberTransformer.transform(apps).useVariant('forMember'),
    })
  }
}
