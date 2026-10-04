import { test } from '@japa/runner'
import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import App from '#models/app'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

const REDIRECT_URI = 'https://invoices.acme.test/callback'
const CODE_VERIFIER = 'a-code-verifier-that-is-at-least-forty-three-characters-long'
const CODE_CHALLENGE = createHash('sha256').update(CODE_VERIFIER).digest('base64url')

async function setupClient(organization: Organization, environment: Environment) {
  const app = await App.create({
    organizationId: organization.id,
    name: 'Invoices',
    slug: 'invoices',
  })
  return environment.createAppClient(app, {
    appUrl: 'https://invoices.acme.test',
    redirectUris: [REDIRECT_URI],
  })
}

/**
 * Starts a sign-in at the environment's issuer, the way an app redirects a
 * member's browser to it, without following redirects.
 */
function authorize(
  organization: Organization,
  environment: Environment,
  params: Record<string, string>
) {
  const url = new URL(`${environment.issuerUrl(organization.slug)}/auth`)
  url.search = new URLSearchParams({
    response_type: 'code',
    scope: 'openid',
    redirect_uri: REDIRECT_URI,
    code_challenge: CODE_CHALLENGE,
    code_challenge_method: 'S256',
    ...params,
  }).toString()

  return fetch(url, { redirect: 'manual' })
}

/**
 * Exchanges a code at the token endpoint, authenticating the client with
 * HTTP Basic, the way an app's server does.
 */
async function exchangeCode(
  organization: Organization,
  environment: Environment,
  credentials: { clientId: string; secret: string }
) {
  const response = await fetch(new URL(`${environment.issuerUrl(organization.slug)}/token`), {
    method: 'POST',
    headers: {
      'authorization': `Basic ${btoa(`${credentials.clientId}:${credentials.secret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'not-a-real-code',
      redirect_uri: REDIRECT_URI,
      code_verifier: CODE_VERIFIER,
    }),
  })
  return { status: response.status, body: (await response.json()) as Record<string, any> }
}

test.group('OIDC clients', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a client gets credentials whose prefix shows its environment', async ({ assert }) => {
    const { organization, production, staging } = await setupOnboardedOrganization()
    const app = await App.create({
      organizationId: organization.id,
      name: 'Invoices',
      slug: 'invoices',
    })

    const live = await production.createAppClient(app, {
      appUrl: 'https://a.test',
      redirectUris: [],
    })
    const nonProduction = await staging.createAppClient(app, {
      appUrl: 'https://a.test',
      redirectUris: [],
    })

    assert.match(live.clientId, /^app_.{24}$/)
    assert.match(live.secret, /^cp_live_.{40}$/)
    assert.match(nonProduction.secret, /^cp_test_.{40}$/)
    assert.equal(live.clientSecretHint, live.secret.slice(-4))

    const stored = await db.from('app_clients').where('id', live.id).firstOrFail()
    assert.notInclude(stored.client_secret, live.secret, 'the secret must be encrypted at rest')
  })

  test('a registered client can start a sign-in', async ({ assert }) => {
    const { organization, production } = await setupOnboardedOrganization()
    const client = await setupClient(organization, production)

    const response = await authorize(organization, production, { client_id: client.clientId })

    assert.equal(response.status, 303)
    assert.match(response.headers.get('location')!, /^\/sign-in\/[\w-]+$/)
  })

  test('unknown clients and clients of other environments cannot start a sign-in', async ({
    assert,
  }) => {
    const { organization, production, staging } = await setupOnboardedOrganization()
    const stagingClient = await setupClient(organization, staging)

    for (const clientId of ['app_unknown', stagingClient.clientId]) {
      const response = await authorize(organization, production, { client_id: clientId })
      assert.equal(response.status, 400, clientId)
      assert.include(await response.text(), 'invalid_client')
    }
  })

  test('a redirect URI that is not registered is rejected', async ({ assert }) => {
    const { organization, production } = await setupOnboardedOrganization()
    const client = await setupClient(organization, production)

    const response = await authorize(organization, production, {
      client_id: client.clientId,
      redirect_uri: 'https://attacker.test/callback',
    })

    assert.equal(response.status, 400)
    assert.include(await response.text(), 'invalid_redirect_uri')
  })

  test('a sign-in without PKCE is rejected', async ({ assert }) => {
    const { organization, production } = await setupOnboardedOrganization()
    const client = await setupClient(organization, production)

    const url = new URL(`${production.issuerUrl(organization.slug)}/auth`)
    url.search = new URLSearchParams({
      client_id: client.clientId,
      response_type: 'code',
      scope: 'openid',
      redirect_uri: REDIRECT_URI,
    }).toString()
    const response = await fetch(url, { redirect: 'manual' })

    const location = new URL(response.headers.get('location')!)
    assert.equal(`${location.origin}${location.pathname}`, REDIRECT_URI)
    assert.equal(location.searchParams.get('error'), 'invalid_request')
    assert.include(location.searchParams.get('error_description'), 'PKCE')
  })

  test('the token endpoint authenticates clients with their secret', async ({ assert }) => {
    const { organization, production } = await setupOnboardedOrganization()
    const client = await setupClient(organization, production)

    const valid = await exchangeCode(organization, production, client)
    const invalid = await exchangeCode(organization, production, {
      clientId: client.clientId,
      secret: 'cp_live_wrong',
    })

    assert.equal(valid.status, 400)
    assert.equal(valid.body.error, 'invalid_grant', 'authenticated, then rejected the fake code')
    assert.equal(invalid.status, 401)
    assert.equal(invalid.body.error, 'invalid_client')
  })

  test('an unexpected failure is answered as a server error', async ({ assert }) => {
    const { organization, production } = await setupOnboardedOrganization()
    const client = await setupClient(organization, production)
    await db.from('app_clients').where('id', client.id).update({ client_secret: 'not-ciphertext' })

    const result = await exchangeCode(organization, production, client)

    assert.equal(result.status, 500)
    assert.equal(result.body.error, 'server_error')
  })
})
