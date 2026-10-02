import { promisify } from 'node:util'
import { generateKeyPair } from 'node:crypto'
import type { JWK } from 'oidc-provider'
import string from '@adonisjs/core/helpers/string'
import { belongsTo } from '@adonisjs/lucid/orm'
import encryption from '@adonisjs/core/services/encryption'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { SigningKeySchema } from '#database/schema'
import Environment from '#models/environment'

const PURPOSE = 'signing_keys.private_jwk'

export default class SigningKey extends SigningKeySchema {
  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>

  /**
   * Generates a new ES256 key pair. JWKs are a protocol format the
   * encryption service does not produce, hence `node:crypto`.
   */
  static async generateAttributes() {
    const { privateKey } = await promisify(generateKeyPair)('ec', { namedCurve: 'P-256' })
    const jwk = privateKey.export({ format: 'jwk' })

    return {
      kid: string.random(16),
      alg: 'ES256',
      privateJwk: encryption.encrypt(jwk, { purpose: PURPOSE }),
    }
  }

  /**
   * The private key as a JWK, in the shape oidc-provider's `jwks` option
   * expects.
   */
  toJwk(): JWK {
    const jwk = encryption.decrypt<JWK>(this.privateJwk, PURPOSE)
    if (!jwk) {
      throw new Error(`Cannot decrypt signing key "${this.kid}"`)
    }
    return { ...jwk, kid: this.kid, alg: this.alg, use: 'sig' }
  }
}
