import { BaseEvent } from '@adonisjs/core/events'
import type User from '#models/user'
import type IdentityProvider from '#models/identity_provider'

/**
 * An admin connected the organization's identity provider
 */
export default class IdentityProviderConnected extends BaseEvent {
  constructor(
    public identityProvider: IdentityProvider,
    public user: User
  ) {
    super()
  }
}
