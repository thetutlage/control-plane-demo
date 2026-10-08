import { belongsTo, column } from '@adonisjs/lucid/orm'
import encryption from '@adonisjs/core/services/encryption'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { IdentityProviderSchema } from '#database/schema'
import Organization from '#models/organization'

const SECRET_PURPOSE = 'identity_providers.client_secret'

/**
 * The company's own identity provider, which its staff sign in with: the
 * OIDC client the company created there, and its staff email domains
 */
export default class IdentityProvider extends IdentityProviderSchema {
  /**
   * pg would send a JS array as a Postgres array, not as JSON
   */
  @column({ prepare: (value: string[]) => JSON.stringify(value) })
  declare domains: string[]

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

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
