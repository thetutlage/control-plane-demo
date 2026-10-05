import { test } from '@japa/runner'
import type { Page } from 'playwright'
import testUtils from '@adonisjs/core/services/test_utils'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import {
  authorizeUrl,
  exchangeCode,
  refresh,
  setupApp,
  setupMember,
  giveAccess,
  visitIssuer,
} from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

/**
 * The URL an app sends a member's browser to, to sign them out
 */
function signOutUrl(
  organization: Organization,
  environment: Environment,
  params: Record<string, string> = {}
) {
  const url = new URL(`${environment.issuerUrl(organization.slug)}/session/end`)
  url.search = new URLSearchParams(params).toString()
  return url.toString()
}

/**
 * Apps live on hosts that do not exist: the request the browser starts to
 * the app is enough
 */
function appRequest(page: Page, url: string) {
  return page
    .waitForRequest((request) => request.url().startsWith(url))
    .then((request) => new URL(request.url()))
}

test.group('Logout', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('signing out of one app signs the member out of every app in the browser', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(production, 'invoices')
    const payroll = await setupApp(production, 'payroll')
    await giveAccess(await setupMember(organization), invoices, payroll)

    const invoicesCode = await visitIssuer(browserContext, organization, production, invoices)
    const invoicesTokens = await exchangeCode(organization, production, invoices, invoicesCode)
    const payrollCode = await visitIssuer(browserContext, organization, production, payroll)
    const payrollTokens = await exchangeCode(organization, production, payroll, payrollCode)

    const page = await browserContext.newPage()
    const requested: string[] = []
    page.on('request', (request) => requested.push(request.url()))
    const signedOut = appRequest(page, 'https://invoices.acme.test/signed-out')
    await page
      .goto(
        signOutUrl(organization, production, {
          id_token_hint: invoicesTokens.body.id_token,
          post_logout_redirect_uri: 'https://invoices.acme.test/signed-out',
          state: 'state-from-the-app',
        })
      )
      .catch(() => {})

    const { searchParams } = await signedOut
    assert.equal(searchParams.get('state'), 'state-from-the-app')

    for (const [client, tokens] of [
      [invoices, invoicesTokens],
      [payroll, payrollTokens],
    ] as const) {
      const refreshed = await refresh(organization, production, client, tokens.body.refresh_token)
      assert.equal(refreshed.body.error, 'invalid_grant', client.redirectUris[0])
    }

    await page.goto(authorizeUrl(organization, production, payroll))
    await page.assertVisible(page.getByRole('heading', { name: 'Sign in to acme Inc.' }))
  })

  test('a sign-out link without the app’s ID token asks first', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(production)
    await giveAccess(await setupMember(organization), invoices)

    const code = await visitIssuer(browserContext, organization, production, invoices)
    const tokens = await exchangeCode(organization, production, invoices, code)

    const page = await browserContext.newPage()
    await page.goto(signOutUrl(organization, production))
    await page.assertVisible(page.getByRole('heading', { name: 'Sign out?' }))
    await page.getByRole('button', { name: 'Sign out' }).click()

    await page.assertVisible(page.getByRole('heading', { name: "You're signed out" }))
    const refreshed = await refresh(organization, production, invoices, tokens.body.refresh_token)
    assert.equal(refreshed.body.error, 'invalid_grant')
  })

  test('a sign-out redirect URI the app did not register is refused', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(production)
    await giveAccess(await setupMember(organization), invoices)

    const code = await visitIssuer(browserContext, organization, production, invoices)
    const tokens = await exchangeCode(organization, production, invoices, code)

    const page = await browserContext.newPage()
    const response = await page.goto(
      signOutUrl(organization, production, {
        id_token_hint: tokens.body.id_token,
        post_logout_redirect_uri: 'https://invoices.acme.test/elsewhere',
      })
    )

    assert.equal(response?.status(), 400)
    await page.assertVisible(page.getByRole('heading', { name: "We couldn't sign you out" }))
    await page.assertVisible(page.getByText('invalid_request', { exact: true }))
  })
})
