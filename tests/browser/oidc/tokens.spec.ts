import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { MemberStatus } from '#values/member_status'
import {
  CODE_VERIFIER,
  exchangeCode,
  refresh,
  setupApp,
  setupMember,
  giveAccess,
  verifyJwt,
  visitIssuer,
} from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

const DAY = 24 * 60 * 60 * 1000

test.group('Tokens', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the app exchanges the code for signed tokens about the member', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    const member = await setupMember(organization)
    await giveAccess(member, client)
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
    const client = await setupApp(production)
    await giveAccess(await setupMember(organization), client)

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
    const client = await setupApp(production)
    await giveAccess(await setupMember(organization), client)

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

  test('refresh tokens work until the grant expires', async ({ browserContext, assert }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    await giveAccess(await setupMember(organization), client)

    const code = await visitIssuer(browserContext, organization, production, client)
    const { body } = await exchangeCode(organization, production, client, code)

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

  test('refresh tokens stop working when the session ends', async ({ browserContext, assert }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    await giveAccess(await setupMember(organization), client)

    const code = await visitIssuer(browserContext, organization, production, client)
    const { body } = await exchangeCode(organization, production, client, code)

    await db.from('oidc_sessions').delete()
    const refreshed = await refresh(organization, production, client, body.refresh_token)
    assert.equal(refreshed.status, 400)
    assert.equal(refreshed.body.error, 'invalid_grant')
  })

  test('grants and refresh tokens last 14 days, sessions 30', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    await giveAccess(await setupMember(organization), client)

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

  test("a new visit replaces the app's grant in that browser only", async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    await giveAccess(await setupMember(organization), client)

    const otherBrowser = await browserContext.browser()!.newContext()
    const elsewhere = await visitIssuer(otherBrowser, organization, production, client)
    const otherTokens = await exchangeCode(organization, production, client, elsewhere)
    await otherBrowser.close()

    const first = await visitIssuer(browserContext, organization, production, client)
    const firstTokens = await exchangeCode(organization, production, client, first)
    const second = await visitIssuer(browserContext, organization, production, client)
    const secondTokens = await exchangeCode(organization, production, client, second)

    const refreshFirst = await refresh(
      organization,
      production,
      client,
      firstTokens.body.refresh_token
    )
    const refreshSecond = await refresh(
      organization,
      production,
      client,
      secondTokens.body.refresh_token
    )
    const refreshOther = await refresh(
      organization,
      production,
      client,
      otherTokens.body.refresh_token
    )

    assert.equal(refreshFirst.body.error, 'invalid_grant', 'the replaced grant is revoked')
    assert.equal(refreshSecond.status, 200)
    assert.equal(refreshOther.status, 200, 'another browser keeps its grant')
    assert.lengthOf(await db.from('oidc_grants').where('client_id', client.clientId), 2)
  })

  test('a suspended member cannot refresh', async ({ browserContext, assert }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    const member = await setupMember(organization)
    await giveAccess(member, client)

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
    const client = await setupApp(staging)
    await giveAccess(await setupMember(organization), client)

    const code = await visitIssuer(browserContext, organization, staging, client)
    const { body } = await exchangeCode(organization, staging, client, code)

    const stagingJwks = `${staging.issuerUrl('acme')}/jwks`
    const productionJwks = `${production.issuerUrl('acme')}/jwks`
    assert.isNotNull(await verifyJwt(body.access_token, stagingJwks))
    assert.isNull(await verifyJwt(body.access_token, productionJwks))
  })
})
