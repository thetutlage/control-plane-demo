import { BaseEvent } from '@adonisjs/core/events'
import type IdentityProvider from '#models/identity_provider'

/**
 * Someone the identity provider let through was not signed in. The
 * member sees one page for every reason; the reason and the email the
 * provider gave are kept for the audit log.
 */
export default class ProviderSignInRefused extends BaseEvent {
  constructor(
    public identityProvider: IdentityProvider,
    public reason: string,
    public email: string | null
  ) {
    super()
  }
}
