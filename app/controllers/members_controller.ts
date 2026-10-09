import mail from '@adonisjs/mail/services/main'
import { auditedTransaction } from '#audit/transaction'
import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { createMemberValidator } from '#validators/member'
import MemberTransformer from '#transformers/member_transformer'
import AppMemberTransformer from '#transformers/app_member_transformer'
import OidcSessionTransformer from '#transformers/oidc_session_transformer'
import MemberIdentityTransformer from '#transformers/member_identity_transformer'
import ProviderSignInNotification from '#mails/provider_sign_in_notification'

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

  /**
   * The form asks how the member signs in only when the organization has
   * an identity provider
   */
  async create({ inertia, organization }: HttpContext) {
    const identityProvider = await organization.related('identityProviders').query().first()
    return inertia.render('members/create', { hasIdentityProvider: identityProvider !== null })
  }

  /**
   * Adds an active member and emails them how they sign in: with the
   * identity provider, right away, or with a password they set from the
   * email's link. Without a provider connected, it is always a password.
   */
  async store({ request, response, session, organization, auth, audit }: HttpContext) {
    const { signsInWith, ...payload } = await request.validateUsing(createMemberValidator, {
      meta: { organizationId: organization.id },
    })
    const identityProvider = await organization.related('identityProviders').query().first()
    if (signsInWith === 'provider' && !identityProvider) {
      session.flash('error', 'Connect an identity provider before adding members who use it.')
      return response.redirect().back()
    }

    const member = await auditedTransaction(audit, async (trx, batch) => {
      const created = await organization.useTransaction(trx).createMember({
        ...payload,
        status: MemberStatus.ACTIVE,
        signInMethod:
          signsInWith === 'provider' ? MemberSignInMethod.PROVIDER : MemberSignInMethod.PASSWORD,
      })
      if (created.signInMethod === MemberSignInMethod.PASSWORD) {
        await created.sendPasswordSetup()
      }
      batch.record('access.member_added', auth.getUserOrFail(), created)
      return created
    })

    if (member.signInMethod === MemberSignInMethod.PROVIDER) {
      await mail.sendLater(new ProviderSignInNotification(member, organization))
      session.flash('success', `${member.email} can now sign in with your identity provider.`)
    } else {
      session.flash('success', `Emailed ${member.email} a link to set their password.`)
    }
    return response.redirect().toRoute('members.index', { org: organization.slug })
  }

  /**
   * The member, their account at the identity provider once they have
   * signed in through it, the browsers they're signed in on, and the apps
   * they have access to, each tagged with its environment
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

    const identityProvider = await organization.related('identityProviders').query().first()
    const identity = identityProvider
      ? await identityProvider.related('identities').query().where('member_id', member.id).first()
      : null

    return inertia.render('members/show', {
      identityProviderId: identityProvider?.id ?? null,
      identity: identity ? MemberIdentityTransformer.transform(identity) : null,
      member: MemberTransformer.transform(member),
      sessions: OidcSessionTransformer.transform(sessions),
      apps: AppMemberTransformer.transform(apps).useVariant('forMember'),
    })
  }
}
