import string from '@adonisjs/core/helpers/string'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import encryption from '@adonisjs/core/services/encryption'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { AppEnvironmentSchema } from '#database/schema'
import { EnvironmentKind } from '#values/environment_kind'
import App from '#models/app'
import Environment from '#models/environment'

const SECRET_PURPOSE = 'app_environments.client_secret'

/**
 * An app set up in one environment: the OAuth client it signs in with
 * there
 */
export default class AppEnvironment extends AppEnvironmentSchema {
  /**
   * pg would send a JS array as a Postgres array, not as JSON
   */
  @column({ prepare: (value: string[]) => JSON.stringify(value) })
  declare redirectUris: string[]

  /**
   * Where the app may send members after signing them out
   */
  @column({ prepare: (value: string[]) => JSON.stringify(value) })
  declare postLogoutRedirectUris: string[]

  @belongsTo(() => App)
  declare app: BelongsTo<typeof App>

  @belongsTo(() => Environment)
  declare environment: BelongsTo<typeof Environment>

  /**
   * A new client ID and secret. The secret's prefix shows which kind of
   * environment it belongs to: `cp_live_` for production, `cp_test_` for
   * every other environment.
   */
  static generateCredentials(kind: EnvironmentKind) {
    return { clientId: `app_${string.random(24)}`, ...this.generateSecret(kind) }
  }

  /**
   * A new client secret, encrypted, with its hint
   */
  static generateSecret(kind: EnvironmentKind) {
    const prefix = kind === EnvironmentKind.PRODUCTION ? 'cp_live_' : 'cp_test_'
    const secret = `${prefix}${string.random(40)}`

    return {
      clientSecret: encryption.encrypt(secret, { purpose: SECRET_PURPOSE }),
      clientSecretHint: secret.slice(-4),
    }
  }

  /**
   * Replaces the client secret. The old one stops working as soon as this
   * is saved: an app has one secret per environment at a time.
   */
  rotateSecret(kind: EnvironmentKind) {
    const { clientSecret, clientSecretHint } = AppEnvironment.generateSecret(kind)
    this.clientSecret = clientSecret
    this.clientSecretHint = clientSecretHint
    return this.save()
  }

  /**
   * The client secret, decrypted
   */
  get secret() {
    const secret = encryption.decrypt<string>(this.clientSecret, SECRET_PURPOSE)
    if (!secret) {
      throw new Error(`Cannot decrypt the secret of client "${this.clientId}"`)
    }
    return secret
  }
}
