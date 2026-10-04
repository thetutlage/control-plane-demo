import { test } from '@japa/runner'
import type { BrowserContext } from 'playwright'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import type AppClient from '#models/app_client'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import { MemberStatus } from '#values/member_status'
import {
  appCallback,
  authorizeUrl,
  CODE_VERIFIER,
  setupAppClient,
  signIn,
  tokenRequest,
  verifyJwt,
} from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

const PASSWORD = 'correct-horse'
const DAY = 24 * 60 * 60 * 1000

async function setupMember(environment: Environment) {
  return environment.createMember({
    email: 'sara@acme.test',
    fullName: 'Sara',
    status: MemberStatus.ACTIVE,
    password: PASSWORD,
  })
}

/**
 * Sends a browser through the issuer, the way the app does, and returns
 * the code the app receives. The member signs in when the browser has no
 * session yet.
 */
async function visitIssuer(
  browserContext: BrowserContext,
  organization: Organization,
  environment: Environment,
  client: AppClient,
  scope = 'openid profile email'
) {
  const page = browserContext.pages()[0] ?? (await browserContext.newPage())
  const callback = appCallback(page, client.redirectUris[0])
  await page.goto(authorizeUrl(organization, environment, client, scope)).catch(() => {})
  if (page.url().includes('/sign-in/')) {
    await signIn(page, 'sara@acme.test', PASSWORD)
  }
  const { searchParams } = await callback
  return searchParams.get('code')!
}

function exchangeCode(
  organization: Organization,
  environment: Environment,
  client: AppClient,
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

function refresh(
  organization: Organization,
  environment: Environment,
  client: AppClient,
  refreshToken: string
) {
  return tokenRequest(organization, environment, client, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

test.group('Tokens', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the app exchanges the code for signed tokens about the member', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    const member = await setupMember(production)
    const issuer = production.issuerUrl(organization.slug)

    const code = await visitIssuer(browserContext, organization, production, client)
    const { status, body } = await exchangeCode(organization, production, client, code)

    assert.equal(status, 200)
    assert.equal(body.token_type, 'Bearer')
    assert.equal(body.expires_in, 300)
    assert.isString(body.refresh_token)

    const accessToken = await verifyJwt(body.access_token, `${issuer}/jwks`)
    assert.containsSubset(accessToken, {
      header: { alg: 'ES256', typ: 'at+jwt' },
      claims: { iss: issuer, aud: client.clientId, sub: String(member.actorId) },
    })
    assert.equal(accessToken!.claims.client_id, client.clientId)
    assert.equal(accessToken!.claims.exp - accessToken!.claims.iat, 5 * 60)

    const idToken = await verifyJwt(body.id_token, `${issuer}/jwks`)
    assert.containsSubset(idToken!.claims, {
      iss: issuer,
      aud: client.clientId,
      sub: String(member.actorId),
      name: 'Sara',
      email: 'sara@acme.test',
    })
    assert.equal(idToken!.claims.exp - idToken!.claims.iat, 60 * 60)
  })

  test('an app asking only for openid gets no details, but still a refresh token', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    await setupMember(production)

    const code = await visitIssuer(browserContext, organization, production, client, 'openid')
    const { body } = await exchangeCode(organization, production, client, code)

    const idToken = await verifyJwt(body.id_token, `${production.issuerUrl('acme')}/jwks`)
    assert.notProperty(idToken!.claims, 'name')
    assert.notProperty(idToken!.claims, 'email')
    assert.isString(body.refresh_token)
  })

  test('a wrong secret, a wrong verifier or a reused code gets no tokens', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    await setupMember(production)

    const code = await visitIssuer(browserContext, organization, production, client)

    const wrongSecret = await exchangeCode(organization, production, client, code, {
      secret: 'cp_live_wrong',
    })
    assert.equal(wrongSecret.status, 401)
    assert.equal(wrongSecret.body.error, 'invalid_client')

    const wrongVerifier = await exchangeCode(organization, production, client, code, {
      codeVerifier: CODE_VERIFIER.replace('a-', 'b-'),
    })
    assert.equal(wrongVerifier.status, 400)
    assert.equal(wrongVerifier.body.error, 'invalid_grant')

    const first = await exchangeCode(organization, production, client, code)
    assert.equal(first.status, 200)

    const reused = await exchangeCode(organization, production, client, code)
    assert.equal(reused.status, 400)
    assert.equal(reused.body.error, 'invalid_grant')

    const afterReuse = await refresh(organization, production, client, first.body.refresh_token)
    assert.equal(afterReuse.body.error, 'invalid_grant', 'a reused code revokes its tokens')
  })

  test('refresh tokens work without the session, until the grant expires', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    await setupMember(production)

    const code = await visitIssuer(browserContext, organization, production, client)
    const { body } = await exchangeCode(organization, production, client, code)

    await db.from('oidc_sessions').delete()
    const refreshed = await refresh(organization, production, client, body.refresh_token)
    assert.equal(refreshed.status, 200)
    assert.isNotNull(
      await verifyJwt(refreshed.body.access_token, `${production.issuerUrl('acme')}/jwks`)
    )

    await db.from('oidc_grants').update({ expires_at: new Date(Date.now() - 1000) })
    const expired = await refresh(organization, production, client, body.refresh_token)
    assert.equal(expired.status, 400)
    assert.equal(expired.body.error, 'invalid_grant')
  })

  test('grants and refresh tokens last 14 days, sessions 30', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    await setupMember(production)

    const code = await visitIssuer(browserContext, organization, production, client)
    await exchangeCode(organization, production, client, code)

    const expiresIn = async (table: string) => {
      const row = await db.from(table).firstOrFail()
      return (row.expires_at.getTime() - Date.now()) / DAY
    }
    assert.closeTo(await expiresIn('oidc_grants'), 14, 0.01)
    assert.closeTo(await expiresIn('oidc_refresh_tokens'), 14, 0.01)
    assert.closeTo(await expiresIn('oidc_sessions'), 30, 0.01)
  })

  test('every visit to the issuer creates a new grant', async ({ browserContext, assert }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    await setupMember(production)

    const first = await visitIssuer(browserContext, organization, production, client)
    await exchangeCode(organization, production, client, first)
    const second = await visitIssuer(browserContext, organization, production, client)
    const exchanged = await exchangeCode(organization, production, client, second)

    assert.equal(exchanged.status, 200)
    const grants = await db.from('oidc_grants').where('client_id', client.clientId)
    assert.lengthOf(grants, 2)
  })

  test('a suspended member cannot refresh', async ({ browserContext, assert }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    const member = await setupMember(production)

    const code = await visitIssuer(browserContext, organization, production, client)
    const { body } = await exchangeCode(organization, production, client, code)
    member.status = MemberStatus.SUSPENDED
    await member.save()

    const refreshed = await refresh(organization, production, client, body.refresh_token)
    assert.equal(refreshed.status, 400)
    assert.equal(refreshed.body.error, 'invalid_grant')
  })

  test("staging tokens do not verify with production's keys", async ({
    browserContext,
    assert,
  }) => {
    const { organization, production, staging } = await setupOnboardedOrganization({
      slug: 'acme',
    })
    const client = await setupAppClient(organization, staging)
    await setupMember(staging)

    const code = await visitIssuer(browserContext, organization, staging, client)
    const { body } = await exchangeCode(organization, staging, client, code)

    const stagingJwks = `${staging.issuerUrl('acme')}/jwks`
    const productionJwks = `${production.issuerUrl('acme')}/jwks`
    assert.isNotNull(await verifyJwt(body.access_token, stagingJwks))
    assert.isNull(await verifyJwt(body.access_token, productionJwks))
  })
})
