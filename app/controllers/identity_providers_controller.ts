import { inject } from '@adonisjs/core'
import { events } from '#generated/events'
import type { HttpContext } from '@adonisjs/core/http'
import IdentityProvider from '#models/identity_provider'
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

    return inertia.render('identity_providers/index', {
      identityProviders: IdentityProviderTransformer.transform(identityProviders),
      redirectUri: organization.signInCallbackUrl(),
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
   * Connects the provider, once its issuer URL has answered for itself
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
      domains: payload.domains,
      issuer: payload.issuer,
      clientId: payload.clientId,
      ...IdentityProvider.encryptSecret(payload.clientSecret),
    })
    await events.IdentityProviderConnected.dispatch(identityProvider, auth.getUserOrFail())

    session.flash('success', 'Connected your identity provider.')
    return response.redirect().toRoute('identity_providers.index', { org: organization.slug })
  }

  async edit({ inertia, params, organization }: HttpContext) {
    const identityProvider = await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()

    return inertia.render('identity_providers/edit', {
      identityProvider: IdentityProviderTransformer.transform(identityProvider),
      redirectUri: organization.signInCallbackUrl(),
    })
  }

  /**
   * Saves the provider's details. A blank client secret keeps the current
   * one.
   */
  async update({ request, response, session, auth, params, organization }: HttpContext) {
    const identityProvider = await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()
    const payload = await request.validateUsing(updateIdentityProviderValidator, {
      meta: { discovery: this.#discovery },
    })

    identityProvider.merge({
      domains: payload.domains,
      issuer: payload.issuer,
      clientId: payload.clientId,
      ...(payload.clientSecret ? IdentityProvider.encryptSecret(payload.clientSecret) : {}),
    })
    await identityProvider.save()
    await events.IdentityProviderChanged.dispatch(identityProvider, auth.getUserOrFail())

    session.flash('success', 'Saved your identity provider.')
    return response.redirect().toRoute('identity_providers.index', { org: organization.slug })
  }

  async destroy({ response, session, auth, params, organization }: HttpContext) {
    const identityProvider = await organization
      .related('identityProviders')
      .query()
      .where('id', params.provider)
      .firstOrFail()
    await identityProvider.delete()
    await events.IdentityProviderRemoved.dispatch(identityProvider, auth.getUserOrFail())

    session.flash('success', 'Removed your identity provider.')
    return response.redirect().toRoute('identity_providers.index', { org: organization.slug })
  }
}
