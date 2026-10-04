import { createHash } from 'node:crypto'
import App from '#models/app'
import type Environment from '#models/environment'
import type Organization from '#models/organization'

export const CODE_VERIFIER = 'a-code-verifier-that-is-at-least-forty-three-characters-long'

/**
 * Registers an app and configures its client in one environment, with a
 * single redirect URI on the app's own (fake) host
 */
export async function setupAppClient(
  organization: Organization,
  environment: Environment,
  slug = 'invoices'
) {
  const app = await App.firstOrCreate(
    { organizationId: organization.id, slug },
    { name: slug.charAt(0).toUpperCase() + slug.slice(1) }
  )
  const appUrl = `https://${slug}.acme.test`

  return environment.createAppClient(app, {
    appUrl,
    redirectUris: [`${appUrl}/callback`],
  })
}

/**
 * The URL an app sends a member's browser to, to start signing in
 */
export function authorizeUrl(
  organization: Organization,
  environment: Environment,
  client: { clientId: string; redirectUris: string[] }
) {
  const url = new URL(`${environment.issuerUrl(organization.slug)}/auth`)
  url.search = new URLSearchParams({
    client_id: client.clientId,
    response_type: 'code',
    scope: 'openid offline_access',
    redirect_uri: client.redirectUris[0],
    state: 'state-from-the-app',
    code_challenge: createHash('sha256').update(CODE_VERIFIER).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString()
  return url.toString()
}
