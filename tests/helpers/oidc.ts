import { createHash, createPublicKey, verify } from 'node:crypto'
import type { BrowserContext, Page } from 'playwright'
import App from '#models/app'
import Role from '#models/role'
import AppMember from '#models/app_member'
import type Member from '#models/member'
import type AppEnvironment from '#models/app_environment'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import { MemberStatus } from '#values/member_status'

export const CODE_VERIFIER = 'a-code-verifier-that-is-at-least-forty-three-characters-long'

/**
 * The member `setupMember` creates, and `visitIssuer` signs in as
 */
export const MEMBER = { email: 'sara@acme.test', password: 'correct-horse' }

export function setupMember(organization: Organization) {
  return organization.createMember({
    email: MEMBER.email,
    fullName: 'Sara',
    status: MemberStatus.ACTIVE,
    password: MEMBER.password,
  })
}

/**
 * Registers an app (once per organization) and sets it up in one
 * environment, with a single redirect URI and a single sign-out redirect
 * URI on the app's own (fake) host. Returns the setup: the app's client in
 * that environment.
 */
export async function setupApp(environment: Environment, slug = 'invoices') {
  const app = await App.firstOrCreate(
    { organizationId: environment.organizationId, slug },
    { name: slug.charAt(0).toUpperCase() + slug.slice(1) }
  )
  const appUrl = `https://${slug}.acme.test`

  return environment.setUpApp(app, {
    appUrl,
    redirectUris: [`${appUrl}/callback`],
    postLogoutRedirectUris: [`${appUrl}/signed-out`],
  })
}

/**
 * Gives a member access to apps where they're set up, with one role (a
 * "Member" role, created on first use), so they can sign in to them
 */
export async function giveAccess(member: Member, ...setups: AppEnvironment[]) {
  const role = await Role.firstOrCreate(
    { organizationId: member.organizationId, name: 'Member' },
    { description: null, permissions: [] }
  )

  for (const setup of setups) {
    const appMember = await AppMember.create({
      organizationId: setup.organizationId,
      environmentId: setup.environmentId,
      actorId: member.actorId,
      appId: setup.appId,
    })
    await appMember.syncRoles([role.id])
  }
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
 * Sends a browser through the issuer, the way the app does, and returns
 * the code the app receives. The member signs in when the browser has no
 * session yet.
 */
export async function visitIssuer(
  browserContext: BrowserContext,
  organization: Organization,
  environment: Environment,
  client: AppEnvironment,
  scope = 'openid profile email'
) {
  const page = await browserContext.newPage()
  const callback = appCallback(page, client.redirectUris[0])
  page.goto(authorizeUrl(organization, environment, client, scope)).catch(() => {})

  const signInShown = await Promise.race([
    callback.then(() => false),
    page.waitForURL(/\/sign-in\//).then(
      () => true,
      () => false
    ),
  ])
  if (signInShown) {
    await signIn(page, MEMBER.email, MEMBER.password)
  }

  const { searchParams } = await callback
  await page.close()
  return searchParams.get('code')!
}

export function exchangeCode(
  organization: Organization,
  environment: Environment,
  client: AppEnvironment,
  code: string,
  overrides: { secret?: string; codeVerifier?: string } = {}
) {
  return tokenRequest(
    organization,
    environment,
    { clientId: client.clientId, secret: overrides.secret ?? client.secret },
    {
      grant_type: 'authorization_code',
      code,
      redirect_uri: client.redirectUris[0],
      code_verifier: overrides.codeVerifier ?? CODE_VERIFIER,
    }
  )
}

export function refresh(
  organization: Organization,
  environment: Environment,
  client: AppEnvironment,
  refreshToken: string
) {
  return tokenRequest(organization, environment, client, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
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
