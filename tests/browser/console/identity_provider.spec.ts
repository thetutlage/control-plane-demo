import { test } from '@japa/runner'
import type { Page } from 'playwright'
import { events } from '#generated/events'
import emitter from '@adonisjs/core/services/emitter'
import testUtils from '@adonisjs/core/services/test_utils'
import IdentityProvider from '#models/identity_provider'
import ProviderDiscoveryService from '#services/provider_discovery_service'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import {
  PROVIDER,
  setupConnectedProvider,
  StubbedProviderDiscovery,
} from '#tests/helpers/identity_providers'

/**
 * The XSRF header the console expects on POST, PUT and DELETE requests
 * made outside a form
 */
async function xsrfHeaders(page: Page) {
  const cookies = await page.context().cookies()
  const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
  return { 'x-xsrf-token': decodeURIComponent(xsrf.value) }
}

test.group('Console identity provider', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('connecting a provider saves it, with the secret encrypted and never shown', async ({
    assert,
    visit,
    route,
    swap,
    browserContext,
  }) => {
    swap(ProviderDiscoveryService, () => new StubbedProviderDiscovery())
    using fakeEmitter = emitter.fake([events.IdentityProviderConnected])
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('overview.show', { org: 'acme' }))
    await page.getByRole('link', { name: 'Authentication', exact: true }).click()
    await page.assertVisible(
      page.getByText('Members sign in with an email and password', { exact: true })
    )

    await page.getByRole('link', { name: 'Connect your identity provider', exact: true }).click()
    await page.assertVisible(page.getByText(acme.organization.signInCallbackUrl(), { exact: true }))

    await page.getByLabel('Issuer URL', { exact: true }).fill(PROVIDER.issuer)
    await page.getByLabel('Client ID', { exact: true }).fill(PROVIDER.clientId)
    await page.getByLabel('Client secret', { exact: true }).fill(PROVIDER.clientSecret)
    await page.getByRole('button', { name: 'Connect', exact: true }).click()

    await page.assertPath(route('identity_providers.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('Connected your identity provider.', { exact: true }))
    const panel = page.getByRole('region', { name: 'Identity provider', exact: true })
    await page.assertVisible(panel.getByText(PROVIDER.issuer, { exact: true }))
    await page.assertVisible(panel.getByText(PROVIDER.clientId, { exact: true }))
    await page.assertVisible(panel.getByText('••••••••wxyz', { exact: true }))
    await page.assertVisible(
      panel.getByText(acme.organization.signInCallbackUrl(), { exact: true })
    )
    assert.notInclude(await page.content(), PROVIDER.clientSecret)

    const identityProvider = await IdentityProvider.findByOrFail(
      'organizationId',
      acme.organization.id
    )
    assert.notInclude(identityProvider.clientSecret, PROVIDER.clientSecret)
    assert.equal(identityProvider.secret, PROVIDER.clientSecret)

    fakeEmitter.assertEmitted(events.IdentityProviderConnected, ({ data }) => {
      return data.identityProvider.id === identityProvider.id && data.user.id === acme.user.id
    })
  })

  test('the redirect URI is on the console host, with the organization in its path', async ({
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    const redirectUri = new URL(acme.organization.signInCallbackUrl())

    assert.equal(redirectUri.pathname, '/sign-in/callback/acme')
    assert.isFalse(redirectUri.host.startsWith('acme'))
  })

  test('an issuer URL the provider does not answer for is refused', async ({
    visit,
    route,
    swap,
    db,
    browserContext,
  }) => {
    swap(
      ProviderDiscoveryService,
      () => new StubbedProviderDiscovery({ 'https://acme.okta.com/typo': 'could not be reached' })
    )
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('identity_providers.create', { org: 'acme' }))
    await page.getByLabel('Issuer URL', { exact: true }).fill('https://acme.okta.com/typo')
    await page.getByLabel('Client ID', { exact: true }).fill(PROVIDER.clientId)
    await page.getByLabel('Client secret', { exact: true }).fill(PROVIDER.clientSecret)
    await page.getByRole('button', { name: 'Connect', exact: true }).click()

    await page.assertVisible(page.getByText('The issuer URL could not be reached', { exact: true }))
    await db.assertEmpty('identity_providers')
  })

  test('editing with a blank secret keeps the current one', async ({
    assert,
    visit,
    route,
    swap,
    browserContext,
  }) => {
    swap(ProviderDiscoveryService, () => new StubbedProviderDiscovery())
    using fakeEmitter = emitter.fake([events.IdentityProviderChanged])
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const identityProvider = await setupConnectedProvider(acme.organization)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('identity_providers.index', { org: 'acme' }))
    await page.getByRole('link', { name: 'Edit', exact: true }).click()
    await page.assertVisible(
      page.getByText('Leave blank to keep the current secret, ending in wxyz.', { exact: true })
    )
    await page.getByLabel('Client ID', { exact: true }).fill('0oa9z8y7x6')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertPath(route('identity_providers.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('0oa9z8y7x6', { exact: true }))

    await identityProvider.refresh()
    assert.equal(identityProvider.clientId, '0oa9z8y7x6')
    assert.equal(identityProvider.secret, PROVIDER.clientSecret)
    fakeEmitter.assertEmitted(events.IdentityProviderChanged)
  })

  test('editing with a new secret replaces it', async ({
    assert,
    visit,
    route,
    swap,
    browserContext,
  }) => {
    swap(ProviderDiscoveryService, () => new StubbedProviderDiscovery())
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const identityProvider = await setupConnectedProvider(acme.organization)

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('identity_providers.edit', { org: 'acme', provider: identityProvider.id })
    )
    await page.getByLabel('Client secret', { exact: true }).fill('a-rotated-secret-9876')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertVisible(page.getByText('••••••••9876', { exact: true }))
    await identityProvider.refresh()
    assert.equal(identityProvider.secret, 'a-rotated-secret-9876')
  })

  test('removing the provider asks first, then deletes it', async ({
    visit,
    route,
    db,
    browserContext,
  }) => {
    using fakeEmitter = emitter.fake([events.IdentityProviderRemoved])
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupConnectedProvider(acme.organization)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('identity_providers.index', { org: 'acme' }))
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await db.assertCount('identity_providers', 1)
    await page.getByRole('button', { name: 'Yes, remove', exact: true }).click()

    await page.assertVisible(
      page.getByText('Members sign in with an email and password', { exact: true })
    )
    await db.assertEmpty('identity_providers')
    fakeEmitter.assertEmitted(events.IdentityProviderRemoved, ({ data }) => {
      return data.identityProvider.issuer === PROVIDER.issuer
    })
  })

  test('an organization connects one provider', async ({ visit, route, browserContext }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupConnectedProvider(acme.organization)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('identity_providers.create', { org: 'acme' }))

    await page.assertPath(route('identity_providers.index', { org: 'acme' }))
    await page.assertVisible(
      page.getByText('An identity provider is already connected.', { exact: true })
    )
  })

  test("another organization's provider is out of reach", async ({
    assert,
    visit,
    route,
    db,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const identityProvider = await setupConnectedProvider(acme.organization)

    await browserContext.loginAs(globex.user)
    const own = await visit(route('identity_providers.index', { org: 'globex' }))
    await own.assertVisible(
      own.getByText('Members sign in with an email and password', { exact: true })
    )

    const theirs = await visit(route('identity_providers.index', { org: 'acme' }))
    await theirs.assertNotExists(theirs.getByText(PROVIDER.issuer, { exact: true }))

    /**
     * Acme's provider ID under Globex's own console URL
     */
    const theirPath = `/w/globex/settings/identity-providers/${identityProvider.id}`
    const edit = await own.request.get(`${theirPath}/edit`)
    const response = await own.request.delete(theirPath, { headers: await xsrfHeaders(own) })
    assert.equal(edit.status(), 404)
    assert.equal(response.status(), 404)
    await db.assertCount('identity_providers', 1)
  })
})
