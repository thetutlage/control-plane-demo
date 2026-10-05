import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import type { Page } from 'playwright'
import { MemberStatus } from '#values/member_status'
import {
  authorizeUrl,
  exchangeCode,
  refresh,
  setupApp,
  setupMember,
  giveAccess,
  tokenRequest,
  visitIssuer,
} from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

/**
 * Fills the setup form with the given URLs and submits it
 */
async function fillSetupForm(
  page: Page,
  values: { appUrl: string; redirectUris: string; postLogoutRedirectUris?: string }
) {
  const form = page.locator('form')
  await form.getByLabel('App URL', { exact: true }).fill(values.appUrl)
  await form.getByLabel('Redirect URIs', { exact: true }).fill(values.redirectUris)
  if (values.postLogoutRedirectUris) {
    await form
      .getByLabel('Sign-out redirect URIs', { exact: true })
      .fill(values.postLogoutRedirectUris)
  }
  await form.getByRole('button', { name: 'Set up', exact: true }).click()
}

/**
 * The XSRF header the console expects on POST, PUT and DELETE requests
 * made outside a form
 */
async function xsrfHeaders(page: Page) {
  const cookies = await page.context().cookies()
  const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
  return { 'x-xsrf-token': decodeURIComponent(xsrf.value) }
}

test.group('Console apps', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('registering an app opens its Development tab, ready to set up', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.index', { org: 'acme' }))
    await page.getByRole('link', { name: 'Register app', exact: true }).click()
    await page.getByLabel('Name', { exact: true }).fill('Invoices')
    await page.getByLabel('Slug', { exact: true }).fill('invoices')
    await page.getByRole('button', { name: 'Register app', exact: true }).click()

    await page.assertPath(
      route('app_environments.show', { org: 'acme', app: 'invoices', environment: 'development' })
    )
    await page.assertVisible(page.getByText("Invoices hasn't reached Development yet"))
    await page.assertVisible(page.getByRole('link', { name: 'Set up in Development' }))
  })

  test('setting an app up in development shows its credentials, with the secret revealable', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await acme.organization.related('apps').create({ name: 'Invoices', slug: 'invoices' })
    const tab = route('app_environments.show', {
      org: 'acme',
      app: 'invoices',
      environment: 'development',
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(tab)
    await page.getByRole('link', { name: 'Set up in Development', exact: true }).click()
    await page.assertVisible(page.locator('.env-badge', { hasText: 'Development' }))
    await fillSetupForm(page, {
      appUrl: 'http://localhost:3000',
      redirectUris: 'http://localhost:3000/callback',
      postLogoutRedirectUris: 'http://localhost:3000/signed-out',
    })

    await page.assertPath(tab)
    const [setup] = await acme.development.related('appEnvironments').query()
    const panel = page.getByRole('region', { name: 'Setup', exact: true })
    await page.assertVisible(panel.getByText(setup.clientId, { exact: true }))
    await page.assertVisible(panel.getByText('http://localhost:3000/signed-out', { exact: true }))
    await page.assertVisible(panel.getByText(acme.development.issuerUrl('acme'), { exact: true }))
    await page.assertNotExists(panel.getByText(setup.secret, { exact: true }))
    await panel.getByRole('button', { name: 'Show', exact: true }).click()
    await page.assertVisible(panel.getByText(setup.secret, { exact: true }))

    await page.getByRole('link', { name: 'Apps', exact: true }).click()
    const row = page.getByRole('row', { name: /Invoices/ })
    await page.assertElementsCount(row.getByText('● Set up', { exact: true }), 1)
    await page.assertElementsCount(row.getByText('○ Not yet', { exact: true }), 2)
  })

  test('a production secret is shown once, right after the app is set up there', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await acme.organization.related('apps').create({ name: 'Invoices', slug: 'invoices' })
    const params = { org: 'acme', app: 'invoices', environment: 'production' }

    await browserContext.loginAs(acme.user)
    const page = await visit(route('app_environments.create', params))
    await fillSetupForm(page, {
      appUrl: 'https://invoices.acme.test',
      redirectUris: 'https://invoices.acme.test/callback',
    })
    await page.assertPath(route('app_environments.show', params))

    const [setup] = await acme.production.related('appEnvironments').query()
    const panel = page.getByRole('region', { name: 'Setup', exact: true })
    await page.assertVisible(panel.getByRole('alert'))
    await page.assertVisible(panel.getByText(setup.secret, { exact: true }))

    await page.reload()
    await page.assertNotExists(panel.getByRole('alert'))
    await page.assertNotExists(panel.getByText(setup.secret, { exact: true }))
    await page.assertNotExists(panel.getByRole('button', { name: 'Show' }))
    await page.assertVisible(panel.getByText(`••••••••${setup.clientSecretHint}`))
  })

  test('production rejects redirect and sign-out URIs without https', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await acme.organization.related('apps').create({ name: 'Invoices', slug: 'invoices' })
    const params = { org: 'acme', app: 'invoices', environment: 'production' }

    await browserContext.loginAs(acme.user)
    const page = await visit(route('app_environments.create', params))
    await fillSetupForm(page, {
      appUrl: 'https://invoices.acme.test',
      redirectUris: 'https://invoices.acme.test/callback\nhttp://localhost:3000/callback',
      postLogoutRedirectUris: 'http://localhost:3000',
    })

    await page.assertVisible(page.getByText('Line 2 must use https in production', { exact: true }))
    await page.assertVisible(page.getByText('Line 1 must use https in production', { exact: true }))
    await page.assertPath(route('app_environments.create', params))
  })

  test('a slug is taken once per organization', async ({ visit, route, browserContext }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.staging)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.create', { org: 'acme' }))
    await page.getByLabel('Name', { exact: true }).fill('Invoices')
    await page.getByLabel('Slug', { exact: true }).fill('invoices')
    await page.getByRole('button', { name: 'Register app', exact: true }).click()

    await page.assertVisible(page.getByText('The slug has already been taken'))
  })

  test('an environment tab lists who has access there, marking who is active', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(acme.production, 'invoices')
    const payroll = await setupApp(acme.production, 'payroll')
    const stagingInvoices = await setupApp(acme.staging, 'invoices')
    const addMember = (email: string) =>
      acme.organization.createMember({ email, fullName: null, status: MemberStatus.ACTIVE })

    await giveAccess(await setupMember(acme.organization), invoices)
    const memberBrowser = await browserContext.browser()!.newContext()
    await visitIssuer(memberBrowser, acme.organization, acme.production, invoices)
    await memberBrowser.close()

    const expired = await addMember('signed-out@acme.test')
    await giveAccess(expired, invoices)
    await db.table('oidc_sessions').insert({
      id: 'expired-session',
      organization_id: acme.organization.id,
      environment_id: acme.production.id,
      uid: 'expired-session-uid',
      actor_id: expired.actorId,
      payload: JSON.stringify({}),
      expires_at: new Date(Date.now() - 60_000),
      created_at: new Date(),
    })
    await giveAccess(await addMember('payroll@acme.test'), payroll)
    await giveAccess(await addMember('staging@acme.test'), stagingInvoices)

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('app_environments.show', { org: 'acme', app: 'invoices', environment: 'production' })
    )
    const members = page.getByRole('region', { name: 'Members', exact: true })
    await page.assertElementsCount(members.locator('tbody tr'), 2)
    const active = members.getByRole('row', { name: /sara@acme\.test/ })
    const inactive = members.getByRole('row', { name: /signed-out@acme\.test/ })
    await page.assertVisible(active.getByText('Active', { exact: true }))
    await page.assertVisible(active.getByText('Member', { exact: true }))
    await page.assertNotExists(inactive.getByText('Active', { exact: true }))
    await page.assertVisible(inactive.getByText('Never', { exact: true }))
    await page.assertNotExists(members.getByRole('row', { name: /payroll@acme\.test/ }))
    await page.assertNotExists(members.getByRole('row', { name: /staging@acme\.test/ }))
  })

  test('editing a setup saves its URLs, and the issuer uses them right away', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(acme.development)
    const tab = route('app_environments.show', {
      org: 'acme',
      app: 'invoices',
      environment: 'development',
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(tab)
    const panel = page.getByRole('region', { name: 'Setup', exact: true })
    await panel.getByRole('link', { name: 'Edit', exact: true }).click()

    const form = page.locator('form')
    await page.assertInputValue(form.getByLabel('App URL', { exact: true }), client.appUrl)
    await page.assertVisible(page.locator('.env-badge', { hasText: 'Development' }))
    await form
      .getByLabel('Redirect URIs', { exact: true })
      .fill('https://invoices.acme.test/auth/callback')
    await form.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertPath(tab)
    await page.assertVisible(
      panel.getByText('https://invoices.acme.test/auth/callback', { exact: true })
    )

    const oldRedirect = await fetch(authorizeUrl(acme.organization, acme.development, client), {
      redirect: 'manual',
    })
    assert.equal(oldRedirect.status, 400)
    assert.include(await oldRedirect.text(), 'invalid_redirect_uri')
  })

  test('editing checks the URLs against the environment', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.production)

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('app_environments.edit', { org: 'acme', app: 'invoices', environment: 'production' })
    )
    await page
      .locator('form')
      .getByLabel('Redirect URIs', { exact: true })
      .fill('http://localhost:3000/callback')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertVisible(page.getByText('Line 1 must use https in production', { exact: true }))
  })

  test('rotating a production secret shows the new one once, and the old one stops working', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(acme.production)
    const oldSecret = client.secret

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('app_environments.show', { org: 'acme', app: 'invoices', environment: 'production' })
    )
    const production = page.getByRole('region', { name: 'Setup', exact: true })

    await production.getByRole('button', { name: 'Rotate secret', exact: true }).click()
    await production.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.assertNotExists(production.getByRole('button', { name: 'Yes, rotate' }))

    await production.getByRole('button', { name: 'Rotate secret', exact: true }).click()
    await page.assertVisible(production.getByText(/The current secret stops working right away/))
    await production.getByRole('button', { name: 'Yes, rotate', exact: true }).click()
    await page.assertVisible(production.getByRole('alert'))

    await client.refresh()
    assert.notEqual(client.secret, oldSecret)
    await page.assertVisible(production.getByText(client.secret, { exact: true }))
    await page.reload()
    await page.assertNotExists(production.getByText(client.secret, { exact: true }))

    const token = (secret: string) =>
      tokenRequest(
        acme.organization,
        acme.production,
        { clientId: client.clientId, secret },
        { grant_type: 'authorization_code', code: 'not-a-real-code' }
      )
    const withOldSecret = await token(oldSecret)
    const withNewSecret = await token(client.secret)
    assert.equal(withOldSecret.body.error, 'invalid_client')
    assert.equal(withNewSecret.body.error, 'invalid_grant', 'authenticated, then refused the code')
  })

  test('removing an app from an environment signs members out of it there only', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(acme.production)
    const stagingClient = await setupApp(acme.staging)
    await giveAccess(await setupMember(acme.organization), client, stagingClient)
    const memberBrowser = await browserContext.browser()!.newContext()
    const code = await visitIssuer(memberBrowser, acme.organization, acme.production, client)
    const tokens = await exchangeCode(acme.organization, acme.production, client, code)
    await visitIssuer(memberBrowser, acme.organization, acme.staging, stagingClient)
    await memberBrowser.close()

    await browserContext.loginAs(acme.user)
    const params = { org: 'acme', app: 'invoices', environment: 'production' }
    const page = await visit(route('app_environments.show', params))
    const production = page.getByRole('region', { name: 'Setup', exact: true })
    await production.getByRole('button', { name: 'Remove from Production', exact: true }).click()
    await page.assertVisible(production.getByText(/signed out of it within 5 minutes/))
    await production.getByRole('button', { name: 'Yes, remove', exact: true }).click()

    await page.assertPath(route('app_environments.show', params))
    await page.assertVisible(page.getByText("Invoices hasn't reached Production yet"))
    assert.lengthOf(await db.from('oidc_grants').where('environment_id', acme.production.id), 0)
    assert.lengthOf(await db.from('oidc_grants').where('environment_id', acme.staging.id), 1)
    assert.lengthOf(await db.from('app_members'), 1, 'staging access stays')

    const refreshed = await refresh(
      acme.organization,
      acme.production,
      client,
      tokens.body.refresh_token
    )
    assert.equal(refreshed.body.error, 'invalid_client')
  })

  test('deleting an app removes it from every environment', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.production)
    await setupApp(acme.staging)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.show', { org: 'acme', app: 'invoices' }))
    await page.getByRole('button', { name: 'Delete app', exact: true }).click()
    await page.assertVisible(page.getByText(/removed from every environment/))
    await page.getByRole('button', { name: 'Yes, delete', exact: true }).click()

    await page.assertPath(route('apps.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('No apps yet'))
    assert.lengthOf(await db.from('app_environments'), 0)
  })

  test("another organization's app is not found, nor a setup that doesn't exist", async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    await setupApp(acme.staging, 'invoices')
    await setupApp(globex.production, 'billing')

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.index', { org: 'acme' }))
    const headers = await xsrfHeaders(page)

    const statusOf = async (path: string, method: 'get' | 'post' | 'delete' = 'get') => {
      const response = await page.request[method](path, { headers })
      return response.status()
    }

    const billing = '/w/acme/apps/billing'
    assert.equal(await statusOf(billing), 404)
    assert.equal(await statusOf(billing, 'delete'), 404)
    assert.equal(await statusOf(`${billing}/environments/production`), 404)

    for (const setupUrl of [
      `${billing}/environments/production`,
      '/w/acme/apps/invoices/environments/production',
    ]) {
      assert.equal(await statusOf(`${setupUrl}/edit`), 404, setupUrl)
      assert.equal(await statusOf(`${setupUrl}/secret`, 'post'), 404, setupUrl)
      assert.equal(await statusOf(setupUrl, 'delete'), 404, setupUrl)
    }
  })
})
