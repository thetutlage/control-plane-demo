import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  authorizeUrl,
  exchangeCode,
  MEMBER,
  refresh,
  setupApp,
  setupMember,
  visitIssuer,
} from '#tests/helpers/oidc'
import { MemberStatus } from '#values/member_status'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

test.group('Console members', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an admin adds a member who can sign in right away', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme', environment: 'staging' }))
    await page.getByRole('link', { name: 'Add member', exact: true }).click()
    await page.getByLabel('Full name', { exact: true }).fill('Sara Lee')
    await page.getByLabel('Email', { exact: true }).fill('sara@acme.test')
    await page.getByLabel('Password', { exact: true }).fill('correct-horse')
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertPath(route('members.index', { org: 'acme', environment: 'staging' }))
    await page.assertVisible(page.getByRole('cell', { name: 'sara@acme.test', exact: true }))

    const member = await acme.staging.related('members').query().firstOrFail()
    assert.equal(member.status, MemberStatus.ACTIVE)
    assert.notEqual(member.password, 'correct-horse', 'the password must be hashed')
    assert.isTrue(await member.verifyPassword('correct-horse'))
  })

  test('an email can be added once per environment', async ({ visit, route, browserContext }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await acme.staging.createMember({
      email: 'sara@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.create', { org: 'acme', environment: 'staging' }))
    await page.getByLabel('Email', { exact: true }).fill('sara@acme.test')
    await page.getByLabel('Password', { exact: true }).fill('correct-horse')
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertVisible(page.getByText('The email has already been taken'))
  })

  test('a form adds to the environment in its URL, even after switching elsewhere', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const form = await visit(route('members.create', { org: 'acme', environment: 'staging' }))
    const elsewhere = await visit(
      route('members.index', { org: 'acme', environment: 'production' })
    )
    await elsewhere.close()

    await form.getByLabel('Email', { exact: true }).fill('sara@acme.test')
    await form.getByLabel('Password', { exact: true }).fill('correct-horse')
    await form.getByRole('button', { name: 'Add member', exact: true }).click()

    await form.assertVisible(form.getByRole('cell', { name: 'sara@acme.test', exact: true }))
    await form.assertPath(route('members.index', { org: 'acme', environment: 'staging' }))
  })

  test('a member page shows their active sessions and the apps they have used', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(acme.production)
    const member = await setupMember(acme.production)

    const memberBrowser = await browserContext.browser()!.newContext()
    await visitIssuer(memberBrowser, acme.organization, acme.production, invoices)
    await visitIssuer(memberBrowser, acme.organization, acme.production, invoices)
    await memberBrowser.close()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme', environment: 'production' }))
    const row = page.getByRole('row', { name: new RegExp(MEMBER.email) })
    await page.assertVisible(row.getByRole('cell', { name: '1', exact: true }))

    await row.getByRole('link', { name: MEMBER.email, exact: true }).click()
    await page.assertPath(
      route('members.show', { org: 'acme', environment: 'production', member: member.id })
    )
    const sessions = page.getByRole('region', { name: 'Active sessions', exact: true })
    const apps = page.getByRole('region', { name: 'Apps used', exact: true })
    await page.assertElementsCount(sessions.locator('tbody tr'), 1)
    await page.assertVisible(apps.getByRole('link', { name: 'Invoices', exact: true }))

    assert.lengthOf(await db.from('member_apps'), 1, 'one row per member and app')
  })

  test('signing a member out everywhere ends every app on every browser', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(acme.production, 'invoices')
    const payroll = await setupApp(acme.production, 'payroll')
    const member = await setupMember(acme.production)
    const other = await acme.production.createMember({
      email: 'other@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
      password: MEMBER.password,
    })

    const laptop = await browserContext.browser()!.newContext()
    const phone = await browserContext.browser()!.newContext()
    const invoicesCode = await visitIssuer(laptop, acme.organization, acme.production, invoices)
    const invoicesTokens = await exchangeCode(
      acme.organization,
      acme.production,
      invoices,
      invoicesCode
    )
    const payrollCode = await visitIssuer(phone, acme.organization, acme.production, payroll)
    const payrollTokens = await exchangeCode(
      acme.organization,
      acme.production,
      payroll,
      payrollCode
    )
    await db.table('oidc_sessions').insert({
      id: 'other-session',
      organization_id: acme.organization.id,
      environment_id: acme.production.id,
      uid: 'other-session-uid',
      actor_id: other.actorId,
      payload: JSON.stringify({}),
      expires_at: new Date(Date.now() + 60_000),
      created_at: new Date(),
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('members.show', { org: 'acme', environment: 'production', member: member.id })
    )
    await page.getByRole('button', { name: 'Sign out everywhere', exact: true }).click()
    await page.assertVisible(page.getByText(/signed out of every app, on every browser/))
    await page.getByRole('button', { name: 'Yes, sign out', exact: true }).click()
    await page.assertVisible(page.getByText('Not signed in on any browser.'))
    await page.assertVisible(page.getByRole('link', { name: 'Invoices', exact: true }))

    for (const [client, tokens] of [
      [invoices, invoicesTokens],
      [payroll, payrollTokens],
    ] as const) {
      const refreshed = await refresh(
        acme.organization,
        acme.production,
        client,
        tokens.body.refresh_token
      )
      assert.equal(refreshed.body.error, 'invalid_grant', client.redirectUris[0])
    }
    assert.lengthOf(await db.from('oidc_sessions').where('actor_id', other.actorId), 1)

    const laptopPage = await laptop.newPage()
    await laptopPage.goto(authorizeUrl(acme.organization, acme.production, invoices))
    await laptopPage.getByRole('heading', { name: 'Sign in to acme Inc.' }).waitFor()
    await laptop.close()
    await phone.close()
  })

  test('a member of another environment or organization is not found', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const stagingMember = await setupMember(acme.staging)
    const globexMember = await setupMember(globex.production)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('overview.show', { org: 'acme', environment: 'production' }))
    const cookies = await browserContext.cookies()
    const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
    const headers = { 'x-xsrf-token': decodeURIComponent(xsrf.value) }

    for (const member of [stagingMember, globexMember]) {
      const memberUrl = `/w/acme/production/members/${member.id}`
      const show = await page.request.get(memberUrl)
      const signOut = await page.request.delete(`${memberUrl}/sessions`, { headers })

      assert.equal(show.status(), 404)
      assert.equal(signOut.status(), 404)
    }
  })
})
