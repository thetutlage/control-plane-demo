import { BaseEvent } from '@adonisjs/core/events'
import type User from '#models/user'
import type IdentityProvider from '#models/identity_provider'

/**
 * An admin removed the organization's identity provider. The provider's row is already deleted; its values are still on the model
 */
export default class IdentityProviderRemoved extends BaseEvent {
  constructor(
    public identityProvider: IdentityProvider,
    public user: User
  ) {
    super()
  }
}
