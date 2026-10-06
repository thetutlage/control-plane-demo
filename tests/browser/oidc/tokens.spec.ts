import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import type Role from '#models/role'
import AppMember from '#models/app_member'
import type Member from '#models/member'
import PermissionCatalog from '#models/permission_catalog'
import type AppEnvironment from '#models/app_environment'
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

/**
 * Gives a member access to an app where it's set up, holding exactly these
 * roles
 */
async function giveRoles(member: Member, setup: AppEnvironment, ...roles: Role[]) {
  await giveAccess(member, setup)
  const appMember = await AppMember.query()
    .where('environment_id', setup.environmentId)
    .where('app_id', setup.appId)
    .where('actor_id', member.actorId)
    .firstOrFail()
  await appMember.syncRoles(roles.map(({ id }) => id))
  return appMember
}

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

test.group('Tokens | permissions', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the access token carries the keys of every role the member holds on the app, there', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production, staging } = await setupOnboardedOrganization({
      slug: 'acme',
    })
    const invoices = await setupApp(production)
    const stagingInvoices = await setupApp(staging)
    const payroll = await setupApp(production, 'payroll')
    const member = await setupMember(organization)
    const roles = organization.related('roles')
    const viewer = await roles.create({ name: 'Viewer', permissions: ['billing:invoice.read'] })
    const finance = await roles.create({
      name: 'Finance',
      permissions: ['billing:invoice.refund', 'billing:invoice.read'],
    })
    const tester = await roles.create({ name: 'Tester', permissions: ['billing:invoice.void'] })
    const payrollAdmin = await roles.create({
      name: 'Payroll admin',
      permissions: ['payroll:run.approve'],
    })
    await giveRoles(member, invoices, viewer, finance)
    await giveRoles(member, stagingInvoices, tester)
    await giveRoles(member, payroll, payrollAdmin)

    const code = await visitIssuer(browserContext, organization, production, invoices)
    const { body } = await exchangeCode(organization, production, invoices, code)

    const jwks = `${production.issuerUrl('acme')}/jwks`
    const accessToken = await verifyJwt(body.access_token, jwks)
    const idToken = await verifyJwt(body.id_token, jwks)
    assert.deepEqual(accessToken!.claims.permissions, [
      'billing:invoice.read',
      'billing:invoice.refund',
    ])
    assert.notProperty(idToken!.claims, 'permissions')
  })

  test('a change to the member’s roles reaches the app at its next refresh', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    const member = await setupMember(organization)
    const roles = organization.related('roles')
    const finance = await roles.create({
      name: 'Finance',
      permissions: ['billing:invoice.read', 'billing:invoice.refund'],
    })
    const viewer = await roles.create({ name: 'Viewer', permissions: ['billing:invoice.read'] })
    const appMember = await giveRoles(member, client, finance)

    const code = await visitIssuer(browserContext, organization, production, client)
    const { body } = await exchangeCode(organization, production, client, code)
    await appMember.syncRoles([viewer.id])
    finance.permissions = []
    await finance.save()
    const refreshed = await refresh(organization, production, client, body.refresh_token)

    const jwks = `${production.issuerUrl('acme')}/jwks`
    const before = await verifyJwt(body.access_token, jwks)
    const after = await verifyJwt(refreshed.body.access_token, jwks)
    assert.deepEqual(before!.claims.permissions, ['billing:invoice.read', 'billing:invoice.refund'])
    assert.deepEqual(after!.claims.permissions, ['billing:invoice.read'])
  })

  /**
   * Environments run different versions of an app. Production may still
   * check a key that the catalogue dropped when a newer version stopped
   * using it; filtering tokens through the catalogue would take it away
   * from production the moment the catalogue syncs (plan §3).
   */
  test('a key missing from the catalogue stays in the token', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    const member = await setupMember(organization)
    await PermissionCatalog.create({
      organizationId: organization.id,
      permissions: { 'billing:invoice.read': { description: 'View invoices' } },
      hash: null,
      gitSha: null,
      syncedAt: DateTime.now(),
    })
    const finance = await organization.related('roles').create({
      name: 'Finance',
      permissions: ['billing:invoice.read', 'billing:invoice.void'],
    })
    await giveRoles(member, client, finance)

    const code = await visitIssuer(browserContext, organization, production, client)
    const { body } = await exchangeCode(organization, production, client, code)

    const accessToken = await verifyJwt(body.access_token, `${production.issuerUrl('acme')}/jwks`)
    assert.deepEqual(accessToken!.claims.permissions, [
      'billing:invoice.read',
      'billing:invoice.void',
    ])
  })
})
