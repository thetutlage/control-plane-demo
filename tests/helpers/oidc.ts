import { createHash, createPublicKey, verify } from 'node:crypto'
import type { Page } from 'playwright'
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
  client: { clientId: string; redirectUris: string[] },
  scope = 'openid'
) {
  const url = new URL(`${environment.issuerUrl(organization.slug)}/auth`)
  url.search = new URLSearchParams({
    client_id: client.clientId,
    response_type: 'code',
    scope,
    redirect_uri: client.redirectUris[0],
    state: 'state-from-the-app',
    code_challenge: createHash('sha256').update(CODE_VERIFIER).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString()
  return url.toString()
}

/**
 * Apps live on hosts that do not exist, so the browser's visit to an app's
 * callback fails. The request it starts is enough: it carries the code.
 */
export function appCallback(page: Page, url: string) {
  return page
    .waitForRequest((request) => request.url().startsWith(url))
    .then((request) => new URL(request.url()))
}

export async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

/**
 * Calls the token endpoint the way an app's server does, authenticating
 * the client with HTTP Basic
 */
export async function tokenRequest(
  organization: Organization,
  environment: Environment,
  client: { clientId: string; secret: string },
  params: Record<string, string>
) {
  const response = await fetch(`${environment.issuerUrl(organization.slug)}/token`, {
    method: 'POST',
    headers: {
      'authorization': `Basic ${btoa(`${client.clientId}:${client.secret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  })
  return { status: response.status, body: (await response.json()) as Record<string, any> }
}

/**
 * Checks a JWT's signature against an issuer's published keys, the way an
 * app does. Returns its header and claims, or null when no published key
 * signed it.
 */
export async function verifyJwt(token: string, jwksUrl: string) {
  const [header, payload, signature] = token.split('.')
  const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString())

  const response = await fetch(jwksUrl)
  const { keys } = (await response.json()) as { keys: Record<string, string>[] }
  const jwk = keys.find((key) => key.kid === decode(header).kid)
  if (!jwk) {
    return null
  }

  const valid = verify(
    'sha256',
    Buffer.from(`${header}.${payload}`),
    { key: createPublicKey({ key: jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' },
    Buffer.from(signature, 'base64url')
  )
  return valid ? { header: decode(header), claims: decode(payload) } : null
}
