import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import type { Page } from 'playwright'
import {
  authorizeUrl,
  exchangeCode,
  refresh,
  setupApp,
  setupMember,
  tokenRequest,
  visitIssuer,
} from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

/**
 * Fills the register form with a name, a slug and the given URLs
 */
async function fillRegisterForm(
  page: Page,
  values: { slug: string; appUrl: string; redirectUris: string; postLogoutRedirectUris?: string }
) {
  const form = page.locator('form')
  await form.getByLabel('Name', { exact: true }).fill('Invoices')
  await form.getByLabel('Slug', { exact: true }).fill(values.slug)
  await form.getByLabel('App URL', { exact: true }).fill(values.appUrl)
  await form.getByLabel('Redirect URIs', { exact: true }).fill(values.redirectUris)
  if (values.postLogoutRedirectUris) {
    await form
      .getByLabel('Sign-out redirect URIs', { exact: true })
      .fill(values.postLogoutRedirectUris)
  }
  await form.getByRole('button', { name: 'Register app', exact: true }).click()
}

test.group('Console apps', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('registering a development app shows its credentials, with the secret revealable', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.index', { org: 'acme', environment: 'development' }))
    await page.getByRole('link', { name: 'Register app', exact: true }).click()
    await page.assertVisible(page.locator('.env-badge', { hasText: 'Development' }))
    await fillRegisterForm(page, {
      slug: 'invoices',
      appUrl: 'http://localhost:3000',
      redirectUris: 'http://localhost:3000/callback',
      postLogoutRedirectUris: 'http://localhost:3000/signed-out',
    })

    await page.assertPath(
      route('app_settings.show', { org: 'acme', environment: 'development', app: 'invoices' })
    )
    const [app] = await acme.development.related('apps').query()
    const client = page.getByRole('region', { name: 'Client', exact: true })
    await page.assertVisible(client.getByText(app.clientId, { exact: true }))
    await page.assertVisible(client.getByText('http://localhost:3000/signed-out', { exact: true }))
    await page.assertVisible(client.getByText(acme.development.issuerUrl('acme'), { exact: true }))
    await page.assertNotExists(client.getByText(app.secret, { exact: true }))

    await client.getByRole('button', { name: 'Show', exact: true }).click()
    await page.assertVisible(client.getByText(app.secret, { exact: true }))
  })

  test('a production secret is shown once, right after the app is registered', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.create', { org: 'acme', environment: 'production' }))
    await fillRegisterForm(page, {
      slug: 'invoices',
      appUrl: 'https://invoices.acme.test',
      redirectUris: 'https://invoices.acme.test/callback',
    })
    await page.assertPath(
      route('app_settings.show', { org: 'acme', environment: 'production', app: 'invoices' })
    )

    const [app] = await acme.production.related('apps').query()
    const client = page.getByRole('region', { name: 'Client', exact: true })
    await page.assertVisible(client.getByRole('alert'))
    await page.assertVisible(client.getByText(app.secret, { exact: true }))

    await page.reload()
    await page.assertNotExists(client.getByRole('alert'))
    await page.assertNotExists(client.getByText(app.secret, { exact: true }))
    await page.assertNotExists(client.getByRole('button', { name: 'Show' }))
    await page.assertVisible(client.getByText(`••••••••${app.clientSecretHint}`))
  })

  test('production rejects redirect and sign-out URIs without https', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.create', { org: 'acme', environment: 'production' }))
    await fillRegisterForm(page, {
      slug: 'invoices',
      appUrl: 'https://invoices.acme.test',
      redirectUris: 'https://invoices.acme.test/callback\nhttp://localhost:3000/callback',
      postLogoutRedirectUris: 'http://localhost:3000',
    })

    await page.assertVisible(page.getByText('Line 2 must use https in production', { exact: true }))
    await page.assertVisible(page.getByText('Line 1 must use https in production', { exact: true }))
    await page.assertPath(route('apps.create', { org: 'acme', environment: 'production' }))
  })

  test('a slug is taken once per environment', async ({ visit, route, browserContext, assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.staging)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.create', { org: 'acme', environment: 'staging' }))
    await fillRegisterForm(page, {
      slug: 'invoices',
      appUrl: 'https://invoices.acme.test',
      redirectUris: 'https://invoices.acme.test/callback',
    })
    await page.assertVisible(page.getByText('The slug has already been taken'))

    await page.goto(route('apps.create', { org: 'acme', environment: 'production' }))
    await fillRegisterForm(page, {
      slug: 'invoices',
      appUrl: 'https://invoices.acme.test',
      redirectUris: 'https://invoices.acme.test/callback',
    })
    await page.assertPath(
      route('app_settings.show', { org: 'acme', environment: 'production', app: 'invoices' })
    )
    const [staging] = await acme.staging.related('apps').query()
    const [production] = await acme.production.related('apps').query()
    assert.notEqual(staging.clientId, production.clientId)
  })

  test('an app lists only in its own environment', async ({ visit, route, browserContext }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.staging, 'invoices')
    await setupApp(acme.production, 'payroll')

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.index', { org: 'acme', environment: 'production' }))

    await page.assertVisible(page.getByRole('link', { name: 'Payroll', exact: true }))
    await page.assertNotExists(page.getByRole('link', { name: 'Invoices', exact: true }))
  })

  test('editing an app saves its URLs, and the issuer uses them right away', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(acme.development)
    const settings = route('app_settings.show', {
      org: 'acme',
      environment: 'development',
      app: 'invoices',
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(settings)
    const development = page.getByRole('region', { name: 'Client', exact: true })
    await development.getByRole('link', { name: 'Edit', exact: true }).click()

    const form = page.locator('form')
    await page.assertInputValue(form.getByLabel('App URL', { exact: true }), client.appUrl)
    await page.assertVisible(page.locator('.env-badge', { hasText: 'Development' }))
    await form
      .getByLabel('Redirect URIs', { exact: true })
      .fill('https://invoices.acme.test/auth/callback')
    await form.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertPath(settings)
    await page.assertVisible(
      development.getByText('https://invoices.acme.test/auth/callback', { exact: true })
    )

    const oldRedirect = await fetch(authorizeUrl(acme.organization, acme.development, client), {
      redirect: 'manual',
    })
    assert.equal(oldRedirect.status, 400)
    assert.include(await oldRedirect.text(), 'invalid_redirect_uri')
  })

  test('editing checks the URLs against the app environment', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.production)

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('app_settings.edit', { org: 'acme', environment: 'production', app: 'invoices' })
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
      route('app_settings.show', { org: 'acme', environment: 'production', app: 'invoices' })
    )
    const production = page.getByRole('region', { name: 'Client', exact: true })

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

  test('removing an app signs members out of it right away', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(acme.production)
    await setupMember(acme.production)
    const memberBrowser = await browserContext.browser()!.newContext()
    const code = await visitIssuer(memberBrowser, acme.organization, acme.production, client)
    const tokens = await exchangeCode(acme.organization, acme.production, client, code)
    await memberBrowser.close()

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('app_settings.show', { org: 'acme', environment: 'production', app: 'invoices' })
    )
    const production = page.getByRole('region', { name: 'Client', exact: true })
    await production.getByRole('button', { name: 'Remove', exact: true }).click()
    await page.assertVisible(production.getByText(/signed out of it within 5 minutes/))
    await production.getByRole('button', { name: 'Yes, remove', exact: true }).click()

    await page.assertPath(route('apps.index', { org: 'acme', environment: 'production' }))
    await page.assertVisible(page.getByText('No apps yet'))
    assert.lengthOf(await db.from('oidc_grants'), 0)
    assert.lengthOf(await db.from('member_apps'), 0)

    const refreshed = await refresh(
      acme.organization,
      acme.production,
      client,
      tokens.body.refresh_token
    )
    assert.equal(refreshed.body.error, 'invalid_client')
  })

  test('an app of another environment or organization is not found', async ({
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
    const page = await visit(route('apps.index', { org: 'acme', environment: 'production' }))
    const cookies = await browserContext.cookies()
    const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
    const headers = { 'x-xsrf-token': decodeURIComponent(xsrf.value) }

    for (const slug of ['invoices', 'billing']) {
      const appUrl = `/w/acme/production/apps/${slug}`
      const show = await page.request.get(appUrl)
      const edit = await page.request.get(`${appUrl}/settings/edit`)
      const rotate = await page.request.post(`${appUrl}/secret`, { headers })
      const remove = await page.request.delete(appUrl, { headers })

      assert.equal(show.status(), 404, slug)
      assert.equal(edit.status(), 404, slug)
      assert.equal(rotate.status(), 404, slug)
      assert.equal(remove.status(), 404, slug)
    }
  })
})
