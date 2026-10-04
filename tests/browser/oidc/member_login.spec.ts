import { test } from '@japa/runner'
import type { Page } from 'playwright'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { MemberStatus } from '#values/member_status'
import { authorizeUrl, setupAppClient } from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

const PASSWORD = 'correct-horse'

/**
 * Apps live on hosts that do not exist, so the browser's visit to an app's
 * callback fails. The request it starts is enough: it carries the code.
 */
function appCallback(page: Page, url: string) {
  return page
    .waitForRequest((request) => request.url().startsWith(url))
    .then((request) => new URL(request.url()))
}

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

test.group('Member login', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a member signs in and is sent back to the app with a code', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    await production.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      password: PASSWORD,
    })

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, production, client))

    await page.assertVisible(page.getByRole('heading', { name: 'Sign in to acme Inc.' }))
    await page.assertVisible(page.getByText('to continue to Invoices', { exact: true }))
    await page.assertNotExists(page.getByRole('note'))

    const callback = appCallback(page, 'https://invoices.acme.test/callback')
    await signIn(page, 'sara@acme.test', PASSWORD)

    const { searchParams } = await callback
    assert.isNotEmpty(searchParams.get('code'))
    assert.equal(searchParams.get('state'), 'state-from-the-app')
  })

  test('a signed-in member opens a second app without seeing the login page', async ({
    browserContext,
    assert,
  }) => {
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupAppClient(organization, staging, 'invoices')
    const payroll = await setupAppClient(organization, staging, 'payroll')
    await staging.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      password: PASSWORD,
    })

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, invoices))
    await page.assertVisible(page.getByRole('note'))
    const invoicesCallback = appCallback(page, 'https://invoices.acme.test/callback')
    await signIn(page, 'sara@acme.test', PASSWORD)
    await invoicesCallback

    const requested: string[] = []
    page.on('request', (request) => requested.push(request.url()))
    const payrollCallback = appCallback(page, 'https://payroll.acme.test/callback')
    await page.goto(authorizeUrl(organization, staging, payroll)).catch(() => {})

    const { searchParams } = await payrollCallback
    assert.isNotEmpty(searchParams.get('code'))
    assert.notExists(
      requested.find((url) => url.includes('/sign-in/')),
      'the login page must not be shown'
    )
  })

  test('sign-in is refused with the same message for every bad attempt', async ({
    browserContext,
  }) => {
    const { organization, production, staging } = await setupOnboardedOrganization({
      slug: 'acme',
    })
    const client = await setupAppClient(organization, production)
    await production.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      password: PASSWORD,
    })
    await production.createMember({
      email: 'suspended@acme.test',
      fullName: null,
      status: MemberStatus.SUSPENDED,
      password: PASSWORD,
    })
    await production.createMember({
      email: 'invited@acme.test',
      fullName: null,
      status: MemberStatus.INVITED,
    })
    await staging.createMember({
      email: 'staging-only@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
      password: PASSWORD,
    })

    const attempts = [
      ['sara@acme.test', 'wrong-password'],
      ['nobody@acme.test', PASSWORD],
      ['suspended@acme.test', PASSWORD],
      ['invited@acme.test', PASSWORD],
      ['staging-only@acme.test', PASSWORD],
    ]

    const page = await browserContext.newPage()
    for (const [email, password] of attempts) {
      await page.goto(authorizeUrl(organization, production, client))
      await signIn(page, email, password)

      await page.assertVisible(page.getByText('Email or password is incorrect'))
      await page.assertVisible(page.getByRole('heading', { name: 'Sign in to acme Inc.' }))
    }
  })

  test('requests the app cannot be told about get the error page', async ({ browserContext }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })

    const page = await browserContext.newPage()
    await page.goto(
      authorizeUrl(organization, production, {
        clientId: 'app_unknown',
        redirectUris: ['https://invoices.acme.test/callback'],
      })
    )

    await page.assertVisible(page.getByRole('heading', { name: "We couldn't sign you in" }))
    await page.assertVisible(page.getByText('invalid_client', { exact: true }))
    await page.assertNotExists(page.getByText('client is invalid'))
  })

  test('a sign-in that does not exist in this browser has expired', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })

    const page = await browserContext.newPage()
    const response = await page.goto(
      `${production.issuerUrl(organization.slug).replace(/\/oauth$/, '')}/sign-in/made-up-id`
    )

    assert.equal(response?.status(), 400)
    await page.assertVisible(page.getByRole('heading', { name: 'This sign-in has expired' }))
  })

  test('a sign-in that expires while the page is open asks to start again', async ({
    browserContext,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(organization, production)
    await production.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      password: PASSWORD,
    })

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, production, client))
    await page.getByRole('heading', { name: 'Sign in to acme Inc.' }).waitFor()
    await db.from('oidc_interactions').delete()
    await signIn(page, 'sara@acme.test', PASSWORD)

    await page.assertVisible(page.getByRole('heading', { name: 'This sign-in has expired' }))
  })

  test('a link to an issuer that does not exist shows the error page', async ({
    browserContext,
    assert,
  }) => {
    const consoleUrl = new URL(env.get('APP_URL'))
    const page = await browserContext.newPage()
    const response = await page.goto(
      `${consoleUrl.protocol}//nobody.${consoleUrl.host}/oauth/auth?client_id=app_x`
    )

    assert.equal(response?.status(), 404)
    await page.assertVisible(page.getByRole('heading', { name: "This sign-in link isn't valid" }))
  })

  test('other pages on an issuer host show the sign-in error page', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })

    const page = await browserContext.newPage()
    const response = await page.goto(
      `${production.issuerUrl(organization.slug).replace(/\/oauth$/, '')}/no-such-page`
    )

    assert.equal(response?.status(), 404)
    await page.assertVisible(page.getByRole('heading', { name: "This sign-in link isn't valid" }))
  })

  test('the sign-in page does not exist on the console host', async ({ visit, route, assert }) => {
    const page = await visit(route('session.create'))
    const response = await page.request.get('/sign-in/abc')

    assert.equal(response.status(), 404)
  })
})
