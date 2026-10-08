import type IdentityProvider from '#models/identity_provider'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * An organization's identity provider. The client secret is never sent to
 * the console, only its last four characters.
 */
export default class IdentityProviderTransformer extends BaseTransformer<IdentityProvider> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'issuer', 'clientId', 'admitsNewcomers']),
      secretHint: this.resource.clientSecretHint,
    }
  }
}
