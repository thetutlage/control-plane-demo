import db from '@adonisjs/lucid/services/db'
import { errors } from 'oidc-provider'
import type { Adapter, AdapterPayload } from 'oidc-provider'
import AppClient from '#models/app_client'
import type Environment from '#models/environment'

/**
 * Where each oidc-provider record type is stored, and which payload fields
 * are copied into their own columns. Record types without a table are not
 * stored: reads find nothing and saving fails loudly. Clients are the one
 * exception, read from `app_clients`.
 */
const TABLES: Record<
  string,
  { name: string; consumable: boolean; columns(payload: AdapterPayload): Record<string, unknown> }
> = {
  Interaction: {
    name: 'oidc_interactions',
    consumable: false,
    columns: () => ({}),
  },
  Session: {
    name: 'oidc_sessions',
    consumable: false,
    columns: (payload) => ({
      uid: payload.uid,
      actor_id: payload.accountId ? Number(payload.accountId) : null,
    }),
  },
  Grant: {
    name: 'oidc_grants',
    consumable: false,
    columns: (payload) => ({
      actor_id: Number(payload.accountId),
      client_id: payload.clientId,
    }),
  },
  AuthorizationCode: {
    name: 'oidc_authorization_codes',
    consumable: true,
    columns: (payload) => ({ grant_id: payload.grantId }),
  },
  RefreshToken: {
    name: 'oidc_refresh_tokens',
    consumable: true,
    columns: (payload) => ({ grant_id: payload.grantId }),
  },
}

/**
 * Stores oidc-provider's records for one environment. The issuer middleware
 * creates one per record type and request, so every query is limited to
 * that request's environment.
 */
export default class OidcStorageAdapter implements Adapter {
  #model: string
  #environment: Environment
  #table: (typeof TABLES)[string] | undefined

  constructor(model: string, environment: Environment) {
    this.#model = model
    this.#environment = environment
    this.#table = TABLES[model]
  }

  #query(name: string) {
    return db.from(name).where('environment_id', this.#environment.id)
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn?: number) {
    if (!this.#table) {
      throw new Error(`oidc-provider ${this.#model} records are not stored`)
    }
    if (!expiresIn) {
      throw new Error(`oidc-provider saved a ${this.#model} record without an expiry`)
    }

    const columns = this.#table.columns(payload)
    await db
      .table(this.#table.name)
      .insert({
        id,
        organization_id: this.#environment.organizationId,
        environment_id: this.#environment.id,
        payload: JSON.stringify(payload),
        expires_at: new Date(Date.now() + expiresIn * 1000),
        created_at: new Date(),
        ...columns,
      })
      .onConflict('id')
      .merge(['payload', 'expires_at', ...Object.keys(columns)])
  }

  async find(id: string) {
    return this.#model === 'Client' ? this.#findClient(id) : this.#findBy('id', id)
  }

  async findByUid(uid: string) {
    return this.#model === 'Session' ? this.#findBy('uid', uid) : undefined
  }

  /**
   * Only the device flow looks records up by user code, and it is not
   * enabled.
   */
  async findByUserCode() {
    return undefined
  }

  /**
   * Marks a code or refresh token as used. oidc-provider checks whether the
   * record was used before calling this, but not atomically, so two
   * requests racing with the same record would both pass its check. The
   * conditional update lets exactly one of them through.
   */
  async consume(id: string) {
    if (!this.#table?.consumable) {
      return
    }

    const updated = await this.#query(this.#table.name)
      .where('id', id)
      .whereNull('consumed_at')
      .update({ consumed_at: new Date() })

    if (Number(updated) === 0) {
      throw new errors.InvalidGrant(`${this.#model} already used`)
    }
  }

  async destroy(id: string) {
    if (this.#table) {
      await this.#query(this.#table.name).where('id', id).delete()
    }
  }

  /**
   * Deletes the codes or refresh tokens of a grant. Deleting the grant row
   * itself (`destroy`) also deletes them, through the foreign keys.
   */
  async revokeByGrantId(grantId: string) {
    if (this.#table?.consumable) {
      await this.#query(this.#table.name).where('grant_id', grantId).delete()
    }
  }

  /**
   * Clients are not stored by oidc-provider: they are the environment's
   * app clients, and every client gets the same settings.
   */
  async #findClient(clientId: string): Promise<AdapterPayload | undefined> {
    const client = await AppClient.query()
      .where('environment_id', this.#environment.id)
      .where('client_id', clientId)
      .first()

    if (!client) {
      return undefined
    }

    return {
      client_id: client.clientId,
      client_secret: client.secret,
      redirect_uris: client.redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
      id_token_signed_response_alg: 'ES256',
    }
  }

  async #findBy(column: 'id' | 'uid', value: string): Promise<AdapterPayload | undefined> {
    if (!this.#table) {
      return undefined
    }

    const row = await this.#query(this.#table.name)
      .where(column, value)
      .where('expires_at', '>', new Date())
      .first()

    if (!row) {
      return undefined
    }

    const consumedAt: Date | null = row.consumed_at ?? null
    return consumedAt
      ? { ...row.payload, consumed: Math.floor(consumedAt.getTime() / 1000) }
      : row.payload
  }
}
