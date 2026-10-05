import type App from '#models/app'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import type { HttpContext } from '@adonisjs/core/http'
import AppMember from '#models/app_member'
import RoleTransformer from '#transformers/role_transformer'
import AppTransformer from '#transformers/app_transformer'
import MemberTransformer from '#transformers/member_transformer'
import AppMemberTransformer from '#transformers/app_member_transformer'
import { createAppMemberValidator, updateAppMemberValidator } from '#validators/app_member'

/**
 * Who can sign in to an app in one environment, and with which roles.
 * Managed from the app's tab for that environment.
 */
export default class AppMembersController {
  /**
   * One of the organization's apps, set up in the environment. An app of
   * another organization, or one not set up there, is a 404.
   */
  async #findApp(organization: Organization, environment: Environment, slug: string) {
    return organization
      .related('apps')
      .query()
      .where('slug', slug)
      .whereHas('environments', (setups) => setups.where('environment_id', environment.id))
      .preload('environments')
      .firstOrFail()
  }

  /**
   * The access of one of the organization's members to the app, in the
   * environment, with the member and their roles
   */
  async #findAppMember(
    organization: Organization,
    environment: Environment,
    app: App,
    memberId: string
  ) {
    const member = await organization.related('members').query().where('id', memberId).firstOrFail()
    return app
      .related('members')
      .query()
      .where('environment_id', environment.id)
      .where('actor_id', member.actorId)
      .preload('member')
      .preload('roles')
      .firstOrFail()
  }

  #toTab(
    response: HttpContext['response'],
    organization: Organization,
    app: App,
    environment: Environment
  ) {
    return response.redirect().toRoute('app_environments.show', {
      org: organization.slug,
      app: app.slug,
      environment: environment.slug,
    })
  }

  /**
   * The form to give a member access: members who don't have it yet, and
   * the organization's roles
   */
  async create({ inertia, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, environment, params.app)
    const members = await organization
      .related('members')
      .query()
      .whereDoesntHave('apps', (access) =>
        access.where('environment_id', environment.id).where('app_id', app.id)
      )
      .orderBy('email', 'asc')
    const roles = await organization.related('roles').query().orderBy('name', 'asc')

    return inertia.render('app_members/create', {
      app: AppTransformer.transform(app).useVariant('forList'),
      environmentSlug: environment.slug,
      members: MemberTransformer.transform(members),
      roles: RoleTransformer.transform(roles, null),
    })
  }

  /**
   * Gives the member access to the app in the environment, with the
   * chosen roles. They can sign in right away.
   */
  async store({ request, response, session, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, environment, params.app)
    const payload = await request.validateUsing(createAppMemberValidator, {
      meta: { organizationId: organization.id },
    })
    const member = await organization
      .related('members')
      .query()
      .where('id', payload.memberId)
      .firstOrFail()

    const existing = await app
      .related('members')
      .query()
      .where('environment_id', environment.id)
      .where('actor_id', member.actorId)
      .first()
    if (existing) {
      session.flash('error', `${member.email} already has access to ${app.name}.`)
      return this.#toTab(response, organization, app, environment)
    }

    const appMember = await AppMember.create({
      organizationId: organization.id,
      environmentId: environment.id,
      actorId: member.actorId,
      appId: app.id,
    })
    await appMember.syncRoles(payload.roleIds)

    session.flash('success', `${member.email} can now sign in to ${app.name}.`)
    return this.#toTab(response, organization, app, environment)
  }

  async edit({ inertia, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, environment, params.app)
    const appMember = await this.#findAppMember(organization, environment, app, params.member)
    const roles = await organization.related('roles').query().orderBy('name', 'asc')

    return inertia.render('app_members/edit', {
      app: AppTransformer.transform(app).useVariant('forList'),
      environmentSlug: environment.slug,
      member: MemberTransformer.transform(appMember.member),
      appMember: AppMemberTransformer.transform(appMember),
      roles: RoleTransformer.transform(roles, null),
    })
  }

  /**
   * Changes the member's roles on the app. Members already signed in keep
   * their session; new tokens carry the new roles.
   */
  async update({ request, response, session, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, environment, params.app)
    const appMember = await this.#findAppMember(organization, environment, app, params.member)
    const payload = await request.validateUsing(updateAppMemberValidator, {
      meta: { organizationId: organization.id },
    })
    await appMember.syncRoles(payload.roleIds)

    session.flash('success', `Saved ${appMember.member.email}'s roles on ${app.name}.`)
    return this.#toTab(response, organization, app, environment)
  }

  /**
   * Takes the member's access away: they can't sign in to the app in this
   * environment any more, and are signed out of it at its next refresh
   */
  async destroy({ response, session, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, environment, params.app)
    const appMember = await this.#findAppMember(organization, environment, app, params.member)
    await appMember.revoke()

    session.flash('success', `${appMember.member.email} no longer has access to ${app.name}.`)
    return this.#toTab(response, organization, app, environment)
  }
}
