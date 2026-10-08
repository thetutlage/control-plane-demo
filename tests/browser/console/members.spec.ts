import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  authorizeUrl,
  exchangeCode,
  MEMBER,
  refresh,
  setupApp,
  setupMember,
  giveAccess,
  visitIssuer,
} from '#tests/helpers/oidc'
import { MemberStatus } from '#values/member_status'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import SetPasswordNotification from '#mails/set_password_notification'
import { linkIn } from '#tests/helpers/mail'

test.group('Console members', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an admin adds a member, who gets an email to set their password from', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const mailer = mail.fake()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme' }))
    await page.getByRole('link', { name: 'Add member', exact: true }).click()
    await page.assertNotExists(page.getByLabel('Password', { exact: true }))
    await page.getByLabel('Full name', { exact: true }).fill('Sara Lee')
    await page.getByLabel('Email', { exact: true }).fill('sara@acme.test')
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertPath(route('members.index', { org: 'acme' }))
    await page.assertVisible(
      page.getByText('Emailed sara@acme.test a link to set their password.', { exact: true })
    )

    const member = await acme.organization.related('members').query().firstOrFail()
    assert.equal(member.status, MemberStatus.ACTIVE)
    assert.equal(member.signInMethod, MemberSignInMethod.PASSWORD)
    assert.isNull(member.password)

    const [setup] = mailer.mails.queued((queued) => queued instanceof SetPasswordNotification)
    setup.message.assertTo('sara@acme.test')
    setup.message.assertSubject('Set your password for acme Inc.')
    assert.match(await linkIn(setup), /^http:\/\/acme\.localhost:\d+\/password-resets\//)
  })

  test('an admin emails a member the link to set a password again', async ({
    visit,
    route,
    assert,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
    })
    await sara.sendPasswordSetup()
    const mailer = mail.fake()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.show', { org: 'acme', member: sara.id }))
    await page.assertVisible(page.getByText('They have not set a password yet.'))
    await page.getByRole('button', { name: 'Email a link to set a password', exact: true }).click()

    await page.assertVisible(
      page.getByText('Emailed sara@acme.test a link to set their password.', { exact: true })
    )
    mailer.mails.assertQueuedCount(SetPasswordNotification, 1)
    assert.lengthOf(
      await db.from('password_reset_tokens'),
      1,
      'the link sent earlier must stop working'
    )
  })

  test('an email can be added once per organization', async ({ visit, route, browserContext }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.create', { org: 'acme' }))
    await page.getByLabel('Email', { exact: true }).fill('sara@acme.test')
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertVisible(page.getByText('The email has already been taken'))
  })

  test('a member page shows their sessions and apps in each environment', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const productionInvoices = await setupApp(acme.production)
    const stagingInvoices = await setupApp(acme.staging)
    const member = await setupMember(acme.organization)
    await giveAccess(member, productionInvoices, stagingInvoices)

    const memberBrowser = await browserContext.browser()!.newContext()
    await visitIssuer(memberBrowser, acme.organization, acme.production, productionInvoices)
    await visitIssuer(memberBrowser, acme.organization, acme.production, productionInvoices)
    await visitIssuer(memberBrowser, acme.organization, acme.staging, stagingInvoices)
    await memberBrowser.close()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme' }))
    const row = page.getByRole('row', { name: new RegExp(MEMBER.email) })
    await page.assertVisible(row.getByRole('cell', { name: '2', exact: true }))

    await row.getByRole('link', { name: MEMBER.email, exact: true }).click()
    await page.assertPath(route('members.show', { org: 'acme', member: member.id }))
    const production = page.getByRole('region', { name: 'Production', exact: true })
    const staging = page.getByRole('region', { name: 'Staging', exact: true })
    const development = page.getByRole('region', { name: 'Development', exact: true })
    await page.assertVisible(production.getByText('Signed in on 1 browser'))
    await page.assertVisible(production.getByRole('link', { name: 'Invoices', exact: true }))
    await page.assertVisible(staging.getByRole('link', { name: 'Invoices', exact: true }))
    await page.assertVisible(development.getByText('Not signed in on any browser'))
    await page.assertVisible(development.getByText('No access to any app here.'))

    assert.lengthOf(await db.from('app_members'), 2, 'one row per environment and app')
  })

  test('signing a member out everywhere ends every app on every browser, in every environment', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(acme.production, 'invoices')
    const payroll = await setupApp(acme.production, 'payroll')
    const stagingInvoices = await setupApp(acme.staging, 'invoices')
    const member = await setupMember(acme.organization)
    await giveAccess(member, invoices, payroll, stagingInvoices)
    const other = await acme.organization.createMember({
      email: 'other@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
      password: MEMBER.password,
    })

    const laptop = await browserContext.browser()!.newContext()
    const phone = await browserContext.browser()!.newContext()
    const signedIn = [
      { browser: laptop, environment: acme.production, client: invoices },
      { browser: phone, environment: acme.production, client: payroll },
      { browser: laptop, environment: acme.staging, client: stagingInvoices },
    ]
    const tokens = []
    for (const { browser, environment, client } of signedIn) {
      const code = await visitIssuer(browser, acme.organization, environment, client)
      tokens.push(await exchangeCode(acme.organization, environment, client, code))
    }
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
    const page = await visit(route('members.show', { org: 'acme', member: member.id }))
    await page.getByRole('button', { name: 'Sign out everywhere', exact: true }).click()
    await page.assertVisible(page.getByText(/signed out of every app, on every browser, in/))
    await page.getByRole('button', { name: 'Yes, sign out', exact: true }).click()
    await page.assertElementsCount(page.getByText('Not signed in on any browser'), 3)
    await page.assertVisible(page.getByRole('link', { name: 'Payroll', exact: true }))

    for (const [index, { environment, client }] of signedIn.entries()) {
      const refreshed = await refresh(
        acme.organization,
        environment,
        client,
        tokens[index].body.refresh_token
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

  test("another organization's member is not found", async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const globexMember = await setupMember(globex.organization)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('overview.show', { org: 'acme' }))
    const cookies = await browserContext.cookies()
    const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
    const headers = { 'x-xsrf-token': decodeURIComponent(xsrf.value) }

    const memberUrl = `/w/acme/members/${globexMember.id}`
    const show = await page.request.get(memberUrl)
    const signOut = await page.request.delete(`${memberUrl}/sessions`, { headers })

    assert.equal(show.status(), 404)
    assert.equal(signOut.status(), 404)
  })
})
