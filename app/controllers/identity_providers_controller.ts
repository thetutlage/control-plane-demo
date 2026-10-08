import { inject } from '@adonisjs/core'
import { events } from '#generated/events'
import type { HttpContext } from '@adonisjs/core/http'
import IdentityProvider from '#models/identity_provider'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { IdentityProviderKind } from '#values/identity_provider_kind'
import ProviderDiscoveryService from '#services/provider_discovery_service'
import IdentityProviderTransformer from '#transformers/identity_provider_transformer'
import {
  createIdentityProviderValidator,
  updateIdentityProviderValidator,
} from '#validators/identity_provider'

/**
 * The organization's identity provider, on the console's Authentication
 * page.
 * An organization connects at most one, and another organization's is a
 * 404. Connecting, changing and removing it
 * each dispatch an event, for the audit log.
 */
@inject()
export default class IdentityProvidersController {
  #discovery: ProviderDiscoveryService

  constructor(discovery: ProviderDiscoveryService) {
    this.#discovery = discovery
  }

  /**
   * The Authentication page: the organization's provider, or that none is
   * connected
   */
  async index({ inertia, organization }: HttpContext) {
    const identityProviders = await organization
      .related('identityProviders')
      .query()
      .orderBy('id', 'asc')

    const counts = await organization
      .related('members')
      .query()
      .select('sign_in_method')
      .count('* as total')
      .groupBy('sign_in_method')
    const membersWith = (method: MemberSignInMethod) => {
      const row = counts.find((count) => count.signInMethod === method)
      return Number(row?.$extras.total ?? 0)
    }

    return inertia.render('identity_providers/index', {
      identityProviders: IdentityProviderTransformer.transform(identityProviders),
      redirectUri: organization.signInCallbackUrl(),
      passwordMembersCount: membersWith(MemberSignInMethod.PASSWORD),
      providerMembersCount: membersWith(MemberSignInMethod.PROVIDER),
    })
  }

  async create({ inertia, response, session, organization }: HttpContext) {
    if (await organization.related('identityProviders').query().first()) {
      session.flash('error', 'An identity provider is already connected.')
      return response.redirect().toRoute('identity_providers.index', { org: organization.slug })
    }

    return inertia.render('identity_providers/create', {
      redirectUri: organization.signInCallbackUrl(),
    })
  }

  /**
   * Connects the provider, once its issuer URL has answered for itself.
   * Connecting changes nobody: the admin is asked next who signs in with
   * it.
   */
  async store({ request, response, session, auth, organization }: HttpContext) {
    if (await organization.related('identityProviders').query().first()) {
      session.flash('error', 'An identity provider is already connected.')
      return response.redirect().toRoute('identity_providers.index', { org: organization.slug })
    }

    const payload = await request.validateUsing(createIdentityProviderValidator, {
      meta: { discovery: this.#discovery },
    })
    const identityProvider = await organization.related('identityProviders').create({
      kind: IdentityProviderKind.OIDC,
      admitsNewcomers: false,
      issuer: payload.issuer,
      clientId: payload.clientId,
      ...IdentityProvider.encryptSecret(payload.clientSecret),
    })
    await events.IdentityProviderConnected.dispatch(identityProvider, auth.getUserOrFail())

    session.flash('success', 'Connected your identity provider.')
    return response.redirect().toRoute('identity_providers.members.create', {
      org: organization.slug,
      provider: identityProvider.id,
    })
  }

  async edit({ inertia, params, organization }: HttpContext) {
    const identityProvider = await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()

    const tiedMembers = await identityProvider.related('identities').query().count('* as total')

    return inertia.render('identity_providers/edit', {
      identityProvider: IdentityProviderTransformer.transform(identityProvider),
      redirectUri: organization.signInCallbackUrl(),
      tiedMembersCount: Number(tiedMembers[0].$extras.total),
    })
  }

  /**
   * Saves the provider's details. A blank client secret keeps the current
   * one.
   *
   * A different issuer URL is a different provider, whose IDs for people
   * mean nothing to the old one's. So members' ties are cleared, and each
   * member is matched by email again at their next sign-in. The form asks
   * the admin to confirm that first.
   */
  async update({ request, response, session, auth, params, organization }: HttpContext) {
    const identityProvider = await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()
    const tiedMembers = await identityProvider.related('identities').query().count('* as total')
    const payload = await request.validateUsing(updateIdentityProviderValidator, {
      meta: {
        discovery: this.#discovery,
        currentIssuer: identityProvider.issuer,
        tiedMembersCount: Number(tiedMembers[0].$extras.total),
      },
    })

    const replaced = payload.issuer !== identityProvider.issuer
    identityProvider.merge({
      issuer: payload.issuer,
      clientId: payload.clientId,
      admitsNewcomers: payload.admitsNewcomers ?? false,
      ...(payload.clientSecret ? IdentityProvider.encryptSecret(payload.clientSecret) : {}),
    })
    await identityProvider.save()
    if (replaced) {
      await identityProvider.related('identities').query().delete()
    }
    await events.IdentityProviderChanged.dispatch(identityProvider, auth.getUserOrFail())

    session.flash('success', 'Saved your identity provider.')
    return response.redirect().toRoute('identity_providers.index', { org: organization.slug })
  }

  /**
   * Removes the provider. Its members can no longer sign in with it, so
   * they are switched to a password and signed out. The page says how
   * many before the admin confirms.
   */
  async destroy({ response, session, auth, params, organization }: HttpContext) {
    const identityProvider = await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()
    const members = await organization
      .related('members')
      .query()
      .where('sign_in_method', MemberSignInMethod.PROVIDER)

    await identityProvider.delete()
    for (const member of members) {
      await member.signInWith(MemberSignInMethod.PASSWORD)
      await member.sendPasswordSetup()
      await events.MemberSignInMethodChanged.dispatch(member, auth.getUserOrFail())
    }
    await events.IdentityProviderRemoved.dispatch(identityProvider, auth.getUserOrFail())

    session.flash(
      'success',
      members.length
        ? `Removed your identity provider. ${members.length} ${members.length === 1 ? 'member now signs' : 'members now sign'} in with a password, and got an email to set one.`
        : 'Removed your identity provider.'
    )
    return response.redirect().toRoute('identity_providers.index', { org: organization.slug })
  }
}
