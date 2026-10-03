import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import App from '#models/app'
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
    await page.assertElementsCount(page.getByText('No client yet.'), 3)
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
    const development = page.getByRole('region', { name: 'Development', exact: true })
    await development.getByRole('link', { name: 'Configure', exact: true }).click()

    const form = page.locator('form')
    await page.assertInputValue(form.getByLabel('Environment', { exact: true }), 'development')
    await form.getByLabel('App URL', { exact: true }).fill('http://localhost:3000')
    await form.getByLabel('Redirect URIs', { exact: true }).fill('http://localhost:3000/callback')
    await form.getByRole('button', { name: 'Create client', exact: true }).click()

    await page.assertPath(route('apps.show', { org: 'acme', app: 'invoices' }))
    const [client] = await acme.development.related('appClients').query()
    await page.assertVisible(development.getByText(client.clientId, { exact: true }))
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
    await page.assertPath(route('apps.show', { org: 'acme', app: 'invoices' }))

    const [client] = await acme.production.related('appClients').query()
    const production = page.getByRole('region', { name: 'Production', exact: true })
    await page.assertVisible(production.getByRole('alert'))
    await page.assertVisible(production.getByText(client.secret, { exact: true }))

    await page.reload()
    await page.assertNotExists(production.getByRole('alert'))
    await page.assertNotExists(production.getByText(client.secret, { exact: true }))
    await page.assertNotExists(production.getByRole('button', { name: 'Show' }))
    await page.assertVisible(production.getByText(`••••••••${client.clientSecretHint}`))
  })

  test('production rejects redirect URIs without https', async ({
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
    await form.getByRole('button', { name: 'Create client', exact: true }).click()

    await page.assertVisible(page.getByText('Line 2 must use https in production', { exact: true }))
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
})
