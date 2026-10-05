import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import App from '#models/app'
import {
  authorizeUrl,
  exchangeCode,
  refresh,
  setupAppClient,
  setupMember,
  tokenRequest,
  visitIssuer,
} from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

test.group('Console apps', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('registering an app leads to its page, with no clients yet', async ({
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

    await page.assertPath(route('apps.show', { org: 'acme', app: 'invoices' }))
    await page.assertVisible(page.getByRole('heading', { name: 'Invoices', exact: true }))
    await page.assertVisible(page.getByText(/can't sign members in here yet/))
  })

  test('a development client shows its credentials, with the secret revealable', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await App.create({ organizationId: acme.organization.id, name: 'Invoices', slug: 'invoices' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.show', { org: 'acme', app: 'invoices' }))
    await page
      .getByRole('combobox', { name: 'Environment', exact: true })
      .selectOption('development')
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    const development = page.getByRole('region', { name: 'Client', exact: true })
    await development.getByRole('link', { name: 'Configure', exact: true }).click()

    const form = page.locator('form')
    await page.assertNotExists(page.getByRole('combobox', { name: 'Environment' }))
    await page.assertVisible(page.locator('.env-badge', { hasText: 'Development' }))
    await form.getByLabel('App URL', { exact: true }).fill('http://localhost:3000')
    await form.getByLabel('Redirect URIs', { exact: true }).fill('http://localhost:3000/callback')
    await form
      .getByLabel('Sign-out redirect URIs', { exact: true })
      .fill('http://localhost:3000/signed-out')
    await form.getByRole('button', { name: 'Create client', exact: true }).click()

    await page.assertPath(route('apps.settings', { org: 'acme', app: 'invoices' }))
    const [client] = await acme.development.related('appClients').query()
    await page.assertVisible(development.getByText(client.clientId, { exact: true }))
    await page.assertVisible(
      development.getByText('http://localhost:3000/signed-out', { exact: true })
    )
    await page.assertVisible(
      development.getByText(acme.development.issuerUrl('acme'), { exact: true })
    )
    await page.assertNotExists(development.getByText(client.secret, { exact: true }))

    await development.getByRole('button', { name: 'Show', exact: true }).click()
    await page.assertVisible(development.getByText(client.secret, { exact: true }))
    await page.assertNotExists(development.getByRole('link', { name: 'Configure' }))
  })

  test('a production secret is shown once, right after the client is created', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await App.create({ organizationId: acme.organization.id, name: 'Invoices', slug: 'invoices' })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route(
        'apps.clients.create',
        { org: 'acme', app: 'invoices' },
        { qs: { environment: 'production' } }
      )
    )
    const form = page.locator('form')
    await form.getByLabel('App URL', { exact: true }).fill('https://invoices.acme.test')
    await form
      .getByLabel('Redirect URIs', { exact: true })
      .fill('https://invoices.acme.test/callback')
    await form.getByRole('button', { name: 'Create client', exact: true }).click()
    await page.assertPath(route('apps.settings', { org: 'acme', app: 'invoices' }))

    const [client] = await acme.production.related('appClients').query()
    const production = page.getByRole('region', { name: 'Client', exact: true })
    await page.assertVisible(production.getByRole('alert'))
    await page.assertVisible(production.getByText(client.secret, { exact: true }))

    await page.reload()
    await page.assertNotExists(production.getByRole('alert'))
    await page.assertNotExists(production.getByText(client.secret, { exact: true }))
    await page.assertNotExists(production.getByRole('button', { name: 'Show' }))
    await page.assertVisible(production.getByText(`••••••••${client.clientSecretHint}`))
  })

  test('production rejects redirect and sign-out URIs without https', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await App.create({ organizationId: acme.organization.id, name: 'Invoices', slug: 'invoices' })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route(
        'apps.clients.create',
        { org: 'acme', app: 'invoices' },
        { qs: { environment: 'production' } }
      )
    )
    const form = page.locator('form')
    await form.getByLabel('App URL', { exact: true }).fill('https://invoices.acme.test')
    await form
      .getByLabel('Redirect URIs', { exact: true })
      .fill('https://invoices.acme.test/callback\nhttp://localhost:3000/callback')
    await form.getByLabel('Sign-out redirect URIs', { exact: true }).fill('http://localhost:3000')
    await form.getByRole('button', { name: 'Create client', exact: true }).click()

    await page.assertVisible(page.getByText('Line 2 must use https in production', { exact: true }))
    await page.assertVisible(page.getByText('Line 1 must use https in production', { exact: true }))
    await page.assertPath(route('apps.clients.create', { org: 'acme', app: 'invoices' }))
  })

  test('an app of another organization is not found', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    await App.create({ organizationId: globex.organization.id, name: 'Billing', slug: 'billing' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.index', { org: 'acme' }))
    const response = await page.request.get(route('apps.show', { org: 'acme', app: 'billing' }))

    assert.equal(response.status(), 404)
  })

  test('editing a client saves its URLs, and the issuer uses them right away', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(acme.organization, acme.development)

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route(
        'apps.settings',
        { org: 'acme', app: 'invoices' },
        { qs: { environment: 'development' } }
      )
    )
    const development = page.getByRole('region', { name: 'Client', exact: true })
    await development.getByRole('link', { name: 'Edit', exact: true }).click()

    const form = page.locator('form')
    await page.assertInputValue(form.getByLabel('App URL', { exact: true }), client.appUrl)
    await page.assertNotExists(page.getByRole('combobox', { name: 'Environment' }))
    await page.assertVisible(page.locator('.env-badge', { hasText: 'Development' }))
    await form
      .getByLabel('Redirect URIs', { exact: true })
      .fill('https://invoices.acme.test/auth/callback')
    await form.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertPath(route('apps.settings', { org: 'acme', app: 'invoices' }))
    await page.assertVisible(
      development.getByText('https://invoices.acme.test/auth/callback', { exact: true })
    )

    const oldRedirect = await fetch(authorizeUrl(acme.organization, acme.development, client), {
      redirect: 'manual',
    })
    assert.equal(oldRedirect.status, 400)
    assert.include(await oldRedirect.text(), 'invalid_redirect_uri')
  })

  test('editing checks the URLs against the client environment', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(acme.organization, acme.production)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.clients.edit', { org: 'acme', client: client.id }))
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
    const client = await setupAppClient(acme.organization, acme.production)
    const oldSecret = client.secret

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route(
        'apps.settings',
        { org: 'acme', app: 'invoices' },
        { qs: { environment: 'production' } }
      )
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

  test('removing a client signs members out of the app right away', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupAppClient(acme.organization, acme.production)
    await setupMember(acme.production)
    const memberBrowser = await browserContext.browser()!.newContext()
    const code = await visitIssuer(memberBrowser, acme.organization, acme.production, client)
    const tokens = await exchangeCode(acme.organization, acme.production, client, code)
    await memberBrowser.close()

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route(
        'apps.settings',
        { org: 'acme', app: 'invoices' },
        { qs: { environment: 'production' } }
      )
    )
    const production = page.getByRole('region', { name: 'Client', exact: true })
    await production.getByRole('button', { name: 'Remove', exact: true }).click()
    await page.assertVisible(production.getByText(/signed out of it within 5 minutes/))
    await production.getByRole('button', { name: 'Yes, remove', exact: true }).click()

    await page.assertVisible(production.getByRole('link', { name: 'Configure', exact: true }))
    assert.lengthOf(await db.from('oidc_grants'), 0)

    const refreshed = await refresh(
      acme.organization,
      acme.production,
      client,
      tokens.body.refresh_token
    )
    assert.equal(refreshed.body.error, 'invalid_client')
  })

  test("another organization's client is not found", async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const globexClient = await setupAppClient(globex.organization, globex.production)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('apps.index', { org: 'acme' }))
    const clientUrl = `/w/acme/clients/${globexClient.id}`

    const cookies = await browserContext.cookies()
    const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
    const headers = { 'x-xsrf-token': decodeURIComponent(xsrf.value) }

    const edit = await page.request.get(`${clientUrl}/edit`)
    const rotate = await page.request.post(`${clientUrl}/secret`, { headers })
    const remove = await page.request.delete(clientUrl, { headers })

    assert.equal(edit.status(), 404)
    assert.equal(rotate.status(), 404)
    assert.equal(remove.status(), 404)
  })
})
