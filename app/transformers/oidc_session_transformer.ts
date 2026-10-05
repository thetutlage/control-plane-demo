import type OidcSession from '#models/oidc_session'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A browser a member is signed in on. Never send the session's ID: it is
 * the browser's cookie value.
 */
export default class OidcSessionTransformer extends BaseTransformer<OidcSession> {
  toObject() {
    return {
      environmentId: this.resource.environmentId,
      signedInAt: this.resource.signedInAt?.toFormat('d LLL yyyy, HH:mm') ?? null,
      expiresAt: this.resource.expiresAt.toFormat('d LLL yyyy'),
    }
  }
}
