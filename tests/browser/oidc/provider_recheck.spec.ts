import { DateTime } from 'luxon'
import type { Page } from 'playwright'
import { test, timeTravel } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import ProviderRequestService from '#services/provider_request_service'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import { setupOrganizationProvider } from '#tests/helpers/fake_provider'
import {
  appCallback,
  authorizeUrl,
  giveAccess,
  setupApp,
  setupMember,
  signIn,
  MEMBER,
} from '#tests/helpers/oidc'

const BUTTON = 'Continue with your company account'
const reachLocalProvider = () => new ProviderRequestService({ allowLocal: true })

/**
 * How many days from now the only grant expires
 */
async function grantLifetimeInDays() {
  const grant = await db.from('oidc_grants').firstOrFail()
  return DateTime.fromJSDate(grant.expires_at).diffNow('days').days
}

/**
 * Counts the times the browser is sent to the provider
 */
function visitsToProvider(page: Page, issuer: string) {
  const visits: string[] = []
  page.on('request', (request) => {
    if (request.url().startsWith(`${issuer}/auth?`)) {
      visits.push(request.url())
    }
  })
  return visits
}

/**
 * A sign-in through the identity provider counts for a day. After that
 * the provider is asked again, so someone disabled there loses access.
 */
test.group('Daily re-check with the identity provider', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a sign-in through the provider gets tokens for a day, a password for 14', async ({
    assert,
    swap,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    const sara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, client)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    const callback = appCallback(page, 'https://invoices.acme.test/callback')
    await page.getByRole('button', { name: BUTTON, exact: true }).click()
    await callback

    assert.closeTo(await grantLifetimeInDays(), 1, 0.01)

    await db.from('oidc_grants').delete()
    await db.from('oidc_sessions').delete()
    const guest = await organization.createMember({
      email: 'auditor@firm.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
      password: 'correct-horse',
    })
    await giveAccess(guest, client)
    const other = await browserContext.browser()!.newContext()
    const guestPage = await other.newPage()
    await guestPage.goto(authorizeUrl(organization, staging, client))
    const guestCallback = appCallback(guestPage, 'https://invoices.acme.test/callback')
    await signIn(guestPage, 'auditor@firm.test', 'correct-horse')
    await guestCallback
    await other.close()

    assert.closeTo(await grantLifetimeInDays(), 14, 0.01)
  })

  test('within a day the member is let through, after a day they go back through the provider', async ({
    assert,
    swap,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization)
    const invoices = await setupApp(staging, 'invoices')
    const payroll = await setupApp(staging, 'payroll')
    const sara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, invoices, payroll)

    const page = await browserContext.newPage()
    const visits = visitsToProvider(page, provider.issuer)
    await page.goto(authorizeUrl(organization, staging, invoices))
    const first = appCallback(page, 'https://invoices.acme.test/callback')
    await page.getByRole('button', { name: BUTTON, exact: true }).click()
    await first
    assert.lengthOf(visits, 1)

    timeTravel('23 hours')
    const second = appCallback(page, 'https://payroll.acme.test/callback')
    page.goto(authorizeUrl(organization, staging, payroll)).catch(() => {})
    await second
    assert.lengthOf(visits, 1, 'no need to ask the provider again yet')

    timeTravel('2 hours')
    const third = appCallback(page, 'https://invoices.acme.test/callback')
    page.goto(authorizeUrl(organization, staging, invoices)).catch(() => {})
    const { searchParams } = await third

    assert.lengthOf(visits, 2, 'sent back through the provider, without a click')
    assert.isNotEmpty(searchParams.get('code'))
  })

  test('someone the provider no longer lets through is not signed in again', async ({
    assert,
    swap,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    const sara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, client)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    const callback = appCallback(page, 'https://invoices.acme.test/callback')
    await page.getByRole('button', { name: BUTTON, exact: true }).click()
    await callback

    /**
     * A day later the provider turns them away. Its own session is gone
     * too, as it would be for a disabled account.
     */
    timeTravel('25 hours')
    provider.cancels()
    await browserContext.clearCookies({ domain: '127.0.0.1' })
    const visits = visitsToProvider(page, provider.issuer)
    const reachedApp: string[] = []
    page.on('request', (request) => {
      if (request.url().startsWith('https://invoices.acme.test/callback')) {
        reachedApp.push(request.url())
      }
    })
    page.goto(authorizeUrl(organization, staging, client)).catch(() => {})

    await page.assertVisible(page.getByText('Sign-in was cancelled', { exact: true }))
    await page.assertVisible(page.getByRole('button', { name: BUTTON, exact: true }))
    assert.lengthOf(visits, 1, 'asked once, and not sent round again')
    assert.isEmpty(reachedApp)
  })

  test('a member who signs in with a password is not sent anywhere after a day', async ({
    assert,
    browserContext,
  }) => {
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    const guest = await setupMember(organization)
    await giveAccess(guest, client)

    const page = await browserContext.newPage()
    const visits = visitsToProvider(page, provider.issuer)
    await page.goto(authorizeUrl(organization, staging, client))
    const first = appCallback(page, 'https://invoices.acme.test/callback')
    await signIn(page, MEMBER.email, MEMBER.password)
    await first

    timeTravel('25 hours')
    const second = appCallback(page, 'https://invoices.acme.test/callback')
    page.goto(authorizeUrl(organization, staging, client)).catch(() => {})
    const { searchParams } = await second

    assert.isNotEmpty(searchParams.get('code'))
    assert.isEmpty(visits)
  })
})
