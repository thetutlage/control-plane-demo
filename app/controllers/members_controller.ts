import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'
import { MemberStatus } from '#values/member_status'
import { createMemberValidator } from '#validators/member'
import MemberTransformer from '#transformers/member_transformer'
import MemberAppTransformer from '#transformers/member_app_transformer'
import EnvironmentTransformer from '#transformers/environment_transformer'
import OidcSessionTransformer from '#transformers/oidc_session_transformer'

export default class MembersController {
  /**
   * One of the organization's members, with their environment. Another
   * organization's member is a 404.
   */
  async #findMember(organization: Organization, id: string) {
    return organization
      .related('members')
      .query()
      .where('id', id)
      .preload('environment')
      .firstOrFail()
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
      .withQs({ environment: environment.slug })
      .toRoute('members.index', { org: organization.slug })
  }

  /**
   * The member, the browsers they're signed in on, and the apps they've
   * ever signed in to
   */
  async show({ inertia, params, organization }: HttpContext) {
    const member = await this.#findMember(organization, params.member)
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
      environment: EnvironmentTransformer.transform(member.environment),
      sessions: OidcSessionTransformer.transform(sessions),
      apps: MemberAppTransformer.transform(apps),
    })
  }

  /**
   * Signs the member out of every app, on every browser
   */
  async signOutEverywhere({ response, session, params, organization }: HttpContext) {
    const member = await this.#findMember(organization, params.member)
    await member.signOutEverywhere()

    session.flash('success', `${member.email} is signed out everywhere.`)
    return response
      .redirect()
      .toRoute('members.show', { org: organization.slug, member: member.id })
  }
}
