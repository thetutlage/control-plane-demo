import { test } from '@japa/runner'
import type { Page } from 'playwright'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import AppMember from '#models/app_member'
import { MemberStatus } from '#values/member_status'
import {
  authorizeUrl,
  exchangeCode,
  giveAccess,
  MEMBER,
  refresh,
  setupApp,
  setupMember,
  visitIssuer,
} from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

/**
 * The XSRF header the console expects on requests made outside a form
 */
async function xsrfHeaders(page: Page) {
  const cookies = await page.context().cookies()
  const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
  return { 'x-xsrf-token': decodeURIComponent(xsrf.value), 'accept': 'application/json' }
}

test.group('Console app members', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an admin gives a member access with roles, and they can sign in', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(acme.staging)
    await setupMember(acme.organization)
    await acme.organization.related('roles').create({ name: 'Finance', permissions: [] })
    await acme.organization.related('roles').create({ name: 'Reports viewer', permissions: [] })

    await browserContext.loginAs(acme.user)
    const tab = route('app_environments.show', {
      org: 'acme',
      app: 'invoices',
      environment: 'staging',
    })
    const page = await visit(tab)
    await page.assertVisible(page.getByText('Nobody can sign in to Invoices here yet.'))
    await page.getByRole('link', { name: 'Add member', exact: true }).click()
    await page
      .getByLabel('Member', { exact: true })
      .selectOption({ label: `Sara (${MEMBER.email})` })
    await page.getByRole('checkbox', { name: 'Finance', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Reports viewer', exact: true }).check()
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertPath(tab)
    const row = page.getByRole('region', { name: 'Members' }).getByRole('row', { name: /sara/ })
    await page.assertVisible(row.getByText('Finance', { exact: true }))
    await page.assertVisible(row.getByText('Reports viewer', { exact: true }))
    await page.assertVisible(row.getByText('Never', { exact: true }))

    const memberBrowser = await browserContext.browser()!.newContext()
    const code = await visitIssuer(memberBrowser, acme.organization, acme.staging, invoices)
    await memberBrowser.close()
    assert.isNotEmpty(code)
  })

  test('access needs at least one role', async ({ visit, route, browserContext, assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.staging)
    await setupMember(acme.organization)
    await acme.organization.related('roles').create({ name: 'Finance', permissions: [] })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('app_members.create', { org: 'acme', app: 'invoices', environment: 'staging' })
    )
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertVisible(page.getByText(/roleIds field must be defined|at least 1/))
    assert.lengthOf(await AppMember.all(), 0)
  })

  test('editing a member’s roles keeps their access', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(acme.production)
    const member = await setupMember(acme.organization)
    await giveAccess(member, invoices)
    const finance = await acme.organization
      .related('roles')
      .create({ name: 'Finance', permissions: [] })

    await browserContext.loginAs(acme.user)
    const params = { org: 'acme', app: 'invoices', environment: 'production' }
    const page = await visit(route('app_environments.show', params))
    await page.getByRole('link', { name: 'Edit roles', exact: true }).click()
    await page.assertChecked(page.getByRole('checkbox', { name: 'Member', exact: true }))
    await page.getByRole('checkbox', { name: 'Member', exact: true }).uncheck()
    await page.getByRole('checkbox', { name: 'Finance', exact: true }).check()
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertPath(route('app_environments.show', params))
    const appMember = await AppMember.query().preload('roles').firstOrFail()
    assert.deepEqual(
      appMember.roles.map(({ id }) => id),
      [finance.id]
    )
  })

  test('changing a member’s roles is recorded in the audit log, with the change', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const setup = await setupApp(acme.production)
    const member = await setupMember(acme.organization)
    await giveAccess(member, setup)
    const finance = await acme.organization
      .related('roles')
      .create({ name: 'Finance', description: null, permissions: [] })

    await browserContext.loginAs(acme.user)
    const params = { org: 'acme', app: 'invoices', environment: 'production' }
    const page = await visit(route('app_environments.show', params))
    await page.getByRole('link', { name: 'Edit roles', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Finance', exact: true }).check()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.assertPath(route('app_environments.show', params))

    const events = await acme.organization.related('auditEvents').query().preload('refs')
    assert.lengthOf(events, 1)
    const [event] = events
    assert.equal(event.action, 'access.roles_changed')
    assert.equal(event.category, 'access')
    assert.equal(
      event.summary,
      `${acme.user.email} changed the roles of ${MEMBER.email} on Invoices in Production`
    )
    assert.equal(event.environmentId, acme.production.id)
    assert.deepEqual(event.data, { before: ['Member'], after: ['Finance', 'Member'] })
    assert.deepInclude(event.actor!.serialize(), { type: 'user', refId: String(acme.user.id) })
    assert.deepEqual(
      event.subjects.map(({ type, label }) => `${type}: ${label}`),
      [`member: ${MEMBER.email}`, 'app: Invoices', 'role: Finance']
    )
    assert.isNotNull(event.batchId)
    assert.isString(event.context.requestId)
    assert.isString(event.context.ip)
    assert.isString(event.context.userAgent)
    assert.notProperty(event.context, 'organizationId', 'the tenant is in columns')

    /**
     * The member's own events and the role's include it; saving the same
     * roles again records nothing
     */
    const involving = (type: string, id: number) =>
      acme.organization
        .related('auditEvents')
        .query()
        .withScopes((scopes) => scopes.involving({ type, id }))
    assert.lengthOf(await involving('member', member.id), 1)
    assert.lengthOf(await involving('role', finance.id), 1)

    await page.getByRole('link', { name: 'Edit roles', exact: true }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.assertPath(route('app_environments.show', params))
    assert.lengthOf(await acme.organization.related('auditEvents').query(), 1)
  })

  test('removing a member’s access signs them out of the app, in that environment only', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const production = await setupApp(acme.production)
    const staging = await setupApp(acme.staging)
    const member = await setupMember(acme.organization)
    await giveAccess(member, production, staging)

    const memberBrowser = await browserContext.browser()!.newContext()
    const code = await visitIssuer(memberBrowser, acme.organization, acme.production, production)
    const tokens = await exchangeCode(acme.organization, acme.production, production, code)
    const stagingCode = await visitIssuer(memberBrowser, acme.organization, acme.staging, staging)
    const stagingTokens = await exchangeCode(acme.organization, acme.staging, staging, stagingCode)

    await browserContext.loginAs(acme.user)
    const params = { org: 'acme', app: 'invoices', environment: 'production' }
    const page = await visit(route('app_members.edit', { ...params, member: member.id }))
    await page.getByRole('button', { name: 'Remove access', exact: true }).click()
    await page.assertVisible(page.getByText(/signed out of it within 5 minutes/))
    await page.getByRole('button', { name: 'Yes, remove', exact: true }).click()

    await page.assertPath(route('app_environments.show', params))
    await page.assertVisible(page.getByText('Nobody can sign in to Invoices here yet.'))

    const refreshed = await refresh(
      acme.organization,
      acme.production,
      production,
      tokens.body.refresh_token
    )
    const stagingRefreshed = await refresh(
      acme.organization,
      acme.staging,
      staging,
      stagingTokens.body.refresh_token
    )
    assert.equal(refreshed.body.error, 'invalid_grant')
    assert.isString(stagingRefreshed.body.access_token)

    const memberPage = await memberBrowser.newPage()
    await memberPage.goto(authorizeUrl(acme.organization, acme.production, production))
    await memberPage.assertVisible(
      memberPage.getByRole('heading', { name: "You don't have access to Invoices" })
    )
    await memberBrowser.close()
  })

  test('deleting a role takes access away only from members left with no role', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(acme.production)
    const only = await acme.organization.createMember({
      email: 'only@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })
    const both = await acme.organization.createMember({
      email: 'both@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })
    await giveAccess(only, invoices)
    await giveAccess(both, invoices)
    const finance = await acme.organization
      .related('roles')
      .create({ name: 'Finance', permissions: [] })
    const bothAccess = await AppMember.query().where('actor_id', both.actorId).firstOrFail()
    const memberRole = await acme.organization
      .related('roles')
      .query()
      .where('name', 'Member')
      .firstOrFail()
    await bothAccess.syncRoles([memberRole.id, finance.id])

    await browserContext.loginAs(acme.user)
    const page = await visit(route('roles.edit', { org: 'acme', role: memberRole.id }))
    await page.getByRole('button', { name: 'Delete role', exact: true }).click()
    await page.assertVisible(page.getByText(/taken away from 2 members/))
    await page.getByRole('button', { name: 'Yes, delete', exact: true }).click()
    await page.assertPath(route('roles.index', { org: 'acme' }))

    const remaining = await db.from('app_members')
    assert.lengthOf(remaining, 1)
    assert.equal(remaining[0].actor_id, both.actorId)
  })

  test('another organization’s member cannot be given access', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    await setupApp(acme.production)
    const globexMember = await setupMember(globex.organization)
    const role = await acme.organization
      .related('roles')
      .create({ name: 'Finance', permissions: [] })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('roles.index', { org: 'acme' }))
    const base = '/w/acme/apps/invoices/environments/production/members'

    const forged = await page.request.post(base, {
      headers: await xsrfHeaders(page),
      data: { memberId: globexMember.id, roleIds: [role.id] },
    })
    const edit = await page.request.get(`${base}/${globexMember.id}/edit`)

    assert.equal(forged.status(), 422)
    assert.equal(edit.status(), 404)
    assert.lengthOf(await AppMember.all(), 0)
  })
})
