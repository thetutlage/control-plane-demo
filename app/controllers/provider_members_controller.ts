import { auditedTransaction } from '#audit/transaction'
import mail from '@adonisjs/mail/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { createProviderMembersValidator } from '#validators/provider_member'
import MemberTransformer from '#transformers/member_transformer'
import IdentityProviderTransformer from '#transformers/identity_provider_transformer'
import ProviderSignInNotification from '#mails/provider_sign_in_notification'

/**
 * The members who sign in with the organization's identity provider. An
 * admin switches members to it, one or many, and switches a member back
 * to a password. Either way the member is signed out everywhere, so the
 * way they signed in before stops counting right away, and is emailed
 * how they sign in now.
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
  async store({ request, response, session, auth, audit, params, organization }: HttpContext) {
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
    await auditedTransaction(audit, async (trx, batch) => {
      for (const member of members) {
        await member.useTransaction(trx).signInWith(MemberSignInMethod.PROVIDER)
        batch.record(
          'access.sign_in_method_changed',
          auth.getUserOrFail(),
          member,
          MemberSignInMethod.PASSWORD,
          MemberSignInMethod.PROVIDER
        )
      }
    })
    for (const member of members) {
      await mail.sendLater(new ProviderSignInNotification(member, organization))
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
   * Switches one member back to a password, and emails them a link to
   * set it from
   */
  async destroy({ response, session, auth, audit, params, organization }: HttpContext) {
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

    await auditedTransaction(audit, async (trx, batch) => {
      await member.useTransaction(trx).signInWith(MemberSignInMethod.PASSWORD)
      await member.sendPasswordSetup()
      batch.record(
        'access.sign_in_method_changed',
        auth.getUserOrFail(),
        member,
        MemberSignInMethod.PROVIDER,
        MemberSignInMethod.PASSWORD
      )
    })

    session.flash(
      'success',
      `${member.email} now signs in with a password. We emailed them a link to set it.`
    )
    return response.redirect().back()
  }
}
