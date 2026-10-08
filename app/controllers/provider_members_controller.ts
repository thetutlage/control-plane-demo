import { events } from '#generated/events'
import type { HttpContext } from '@adonisjs/core/http'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { createProviderMembersValidator } from '#validators/provider_member'
import MemberTransformer from '#transformers/member_transformer'
import IdentityProviderTransformer from '#transformers/identity_provider_transformer'

/**
 * The members who sign in with the organization's identity provider. An
 * admin switches members to it, one or many, and switches a member back
 * to a password. Either way the member is signed out everywhere, so the
 * way they signed in before stops counting right away.
 */
export default class ProviderMembersController {
  /**
   * Who signs in with the provider? Lists the members who still sign in
   * with a password, to choose from. It is also the last step of
   * connecting a provider. With nobody left to switch, it has nothing to
   * ask.
   */
  async create({ inertia, response, session, params, organization }: HttpContext) {
    const identityProvider = await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()
    const members = await organization
      .related('members')
      .query()
      .where('sign_in_method', MemberSignInMethod.PASSWORD)
      .orderBy('email', 'asc')

    if (members.length === 0) {
      session.reflash()
      return response.redirect().toRoute('identity_providers.index', { org: organization.slug })
    }

    return inertia.render('provider_members/create', {
      identityProvider: IdentityProviderTransformer.transform(identityProvider),
      members: MemberTransformer.transform(members),
    })
  }

  /**
   * Switches the chosen members to the provider
   */
  async store({ request, response, session, auth, params, organization }: HttpContext) {
    await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()
    const { memberIds } = await request.validateUsing(createProviderMembersValidator)

    const members = await organization
      .related('members')
      .query()
      .whereIn('id', memberIds)
      .where('sign_in_method', MemberSignInMethod.PASSWORD)
    for (const member of members) {
      await member.signInWith(MemberSignInMethod.PROVIDER)
      await events.MemberSignInMethodChanged.dispatch(member, auth.getUserOrFail())
    }

    session.flash(
      'success',
      members.length === 1
        ? `${members[0].email} now signs in with your identity provider.`
        : `${members.length} members now sign in with your identity provider.`
    )
    return response.redirect().back()
  }

  /**
   * Switches one member back to a password
   */
  async destroy({ response, session, auth, params, organization }: HttpContext) {
    await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()
    const member = await organization
      .related('members')
      .query()
      .where('id', params.member)
      .where('sign_in_method', MemberSignInMethod.PROVIDER)
      .firstOrFail()

    await member.signInWith(MemberSignInMethod.PASSWORD)
    await events.MemberSignInMethodChanged.dispatch(member, auth.getUserOrFail())

    session.flash('success', `${member.email} now signs in with a password.`)
    return response.redirect().back()
  }
}
