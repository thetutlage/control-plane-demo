import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import encryption from '@adonisjs/core/services/encryption'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { IdentityProviderSchema } from '#database/schema'
import Organization from '#models/organization'
import MemberIdentity from '#models/member_identity'

const SECRET_PURPOSE = 'identity_providers.client_secret'

/**
 * The company's own identity provider, which its staff sign in with: the
 * OIDC client the company created there
 */
export default class IdentityProvider extends IdentityProviderSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The members who have signed in with this provider, each tied to the
   * provider's permanent ID for them
   */
  @hasMany(() => MemberIdentity)
  declare identities: HasMany<typeof MemberIdentity>

  /**
   * A client secret from the provider, encrypted, with its hint
   */
  static encryptSecret(secret: string) {
    return {
      clientSecret: encryption.encrypt(secret, { purpose: SECRET_PURPOSE }),
      clientSecretHint: secret.slice(-4),
    }
  }

  /**
   * The client secret, decrypted
   */
  get secret() {
    const secret = encryption.decrypt<string>(this.clientSecret, SECRET_PURPOSE)
    if (!secret) {
      throw new Error(`Cannot decrypt the client secret of identity provider "${this.id}"`)
    }
    return secret
  }
}
