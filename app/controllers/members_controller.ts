import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import type Environment from '#models/environment'
import { MemberStatus } from '#values/member_status'
import { createMemberValidator } from '#validators/member'
import MemberTransformer from '#transformers/member_transformer'
import MemberAppTransformer from '#transformers/member_app_transformer'
import OidcSessionTransformer from '#transformers/oidc_session_transformer'

export default class MembersController {
  /**
   * One of the environment's members. A member of another environment is
   * a 404.
   */
  async #findMember(environment: Environment, id: string) {
    return environment.related('members').query().where('id', id).firstOrFail()
  }

  async index({ inertia, environment }: HttpContext) {
    const members = await environment
      .related('members')
      .query()
      .withCount('sessions', (query) => query.where('expires_at', '>', DateTime.now().toSQL()))
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
  async store({ request, response, session, organization, environment }: HttpContext) {
    const payload = await request.validateUsing(createMemberValidator, {
      meta: { environmentId: environment.id },
    })
    const member = await environment.createMember({ ...payload, status: MemberStatus.ACTIVE })

    session.flash('success', `${member.email} can now sign in.`)
    return response
      .redirect()
      .toRoute('members.index', { org: organization.slug, environment: environment.slug })
  }

  /**
   * The member, the browsers they're signed in on, and the apps they've
   * ever signed in to
   */
  async show({ inertia, params, environment }: HttpContext) {
    const member = await this.#findMember(environment, params.member)
    const sessions = await member
      .related('sessions')
      .query()
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('signed_in_at', 'desc')
    const apps = await member
      .related('apps')
      .query()
      .preload('app')
      .orderBy('last_signed_in_at', 'desc')

    return inertia.render('members/show', {
      member: MemberTransformer.transform(member),
      sessions: OidcSessionTransformer.transform(sessions),
      apps: MemberAppTransformer.transform(apps),
    })
  }
}
