import { OidcSessionSchema } from '#database/schema'

/**
 * A browser signed in at an environment's issuer, as stored by
 * oidc-provider (`app/oidc/storage_adapter.ts`). The console only reads
 * the columns copied out of `payload`, and never writes these rows.
 */
export default class OidcSession extends OidcSessionSchema {
  static table = 'oidc_sessions'
  static selfAssignPrimaryKey = true
}
