import { BaseEvent } from '@adonisjs/core/events'
import type User from '#models/user'
import type IdentityProvider from '#models/identity_provider'

/**
 * An admin changed the organization's identity provider: its domains, issuer or credentials
 */
export default class IdentityProviderChanged extends BaseEvent {
  constructor(
    public identityProvider: IdentityProvider,
    public user: User
  ) {
    super()
  }
}
