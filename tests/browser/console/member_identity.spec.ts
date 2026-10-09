import { test } from '@japa/runner'
import type { Browser } from 'playwright'
import { assertRecorded } from '#tests/helpers/audit'
import testUtils from '@adonisjs/core/services/test_utils'
import MemberIdentity from '#models/member_identity'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import type AppEnvironment from '#models/app_environment'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { MemberIdentityOrigin } from '#values/member_identity_origin'
import ProviderRequestService from '#services/provider_request_service'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import { SARA, setupOrganizationProvider } from '#tests/helpers/fake_provider'
import { appCallback, authorizeUrl, giveAccess, setupApp } from '#tests/helpers/oidc'

const PANEL = 'Account at your identity provider'

/**
 * Signs in through the provider in a browser of its own, as whoever the
 * provider is set to send. Returns whether the app got a code.
 */
async function signInThroughProvider(
  browser: Browser,
  organization: Organization,
  environment: Environment,
  client: AppEnvironment
) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(authorizeUrl(organization, environment, client))
  const callback = appCallback(page, client.redirectUris[0]).then(() => true)
  await page.getByRole('button', { name: 'Continue with your company account' }).click()

  const signedIn = await Promise.race([
    callback,
    page
      .getByRole('heading', { name: "We couldn't sign you in" })
      .waitFor()
      .then(() => false),
  ])
  await context.close()
  return signedIn
}

test.group('Console member identity', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a provider member who has not signed in yet has no account to show', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(acme.organization)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.show', { org: 'acme', member: sara.id }))
    const panel = page.getByRole('region', { name: PANEL, exact: true })

    await page.assertVisible(
      panel.getByText('They have not signed in through your identity provider yet.', {
        exact: false,
      })
    )
    await page.assertNotExists(panel.getByRole('button', { name: 'Dissociate this account' }))
  })

  test('a password member has no account at the provider', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(acme.organization)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.show', { org: 'acme', member: sara.id }))

    await page.assertVisible(page.getByRole('heading', { name: 'Signs in with a password' }))
    await page.assertNotExists(page.getByRole('region', { name: PANEL, exact: true }))
  })

  test("the page shows a member's account at the provider after they sign in", async ({
    assert,
    swap,
    visit,
    route,
    browserContext,
  }) => {
    swap(ProviderRequestService, () => new ProviderRequestService({ allowLocal: true }))
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(acme.organization)
    const client = await setupApp(acme.production)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, client)
    assert.isTrue(
      await signInThroughProvider(
        browserContext.browser()!,
        acme.organization,
        acme.production,
        client
      )
    )

    const identity = await MemberIdentity.findByOrFail('memberId', sara.id)
    assert.equal(identity.origin, MemberIdentityOrigin.MATCHED_BY_EMAIL)
    assert.equal(identity.email, 'sara@acme.test')
    assert.isNotNull(identity.lastSignedInAt)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.show', { org: 'acme', member: sara.id }))
    const panel = page.getByRole('region', { name: PANEL, exact: true })
    await page.assertVisible(panel.getByText(SARA.sub, { exact: true }))
    await page.assertVisible(
      panel.getByText('Added by an admin, then matched by email', { exact: true })
    )
    await page.assertNotExists(panel.getByText('Email at the provider', { exact: true }))
  })

  test('someone who joined on their own is shown as such, with the email the provider sends', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(acme.organization)
    const dev = await acme.organization.createMember({
      email: 'dev@acme.test',
      fullName: 'Dev',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await MemberIdentity.create({
      organizationId: acme.organization.id,
      identityProviderId: provider.identityProvider.id,
      memberId: dev.id,
      subject: '00u-dev',
      origin: MemberIdentityOrigin.JOINED,
      email: 'dev.patel@acme.test',
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.show', { org: 'acme', member: dev.id }))
    const panel = page.getByRole('region', { name: PANEL, exact: true })

    await page.assertVisible(
      panel.getByText('Joined on their own through your identity provider', { exact: true })
    )
    await page.assertVisible(panel.getByText('dev.patel@acme.test', { exact: false }))
  })

  test('dissociating lets a member whose account was recreated at the provider sign in again', async ({
    assert,
    swap,
    visit,
    route,
    db,
    browserContext,
  }) => {
    swap(ProviderRequestService, () => new ProviderRequestService({ allowLocal: true }))
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(acme.organization)
    const client = await setupApp(acme.production)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, client)
    const browser = browserContext.browser()!
    const signInAgain = () =>
      signInThroughProvider(browser, acme.organization, acme.production, client)

    assert.isTrue(await signInAgain())
    await db.assertCount('oidc_sessions', 1)

    provider.signsInAs({ ...SARA, sub: '00u-sara-recreated' })
    assert.isFalse(await signInAgain(), 'a new ID with a tied email must be refused')

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.show', { org: 'acme', member: sara.id }))
    const panel = page.getByRole('region', { name: PANEL, exact: true })
    await panel.getByRole('button', { name: 'Dissociate this account', exact: true }).click()
    await page.assertVisible(
      panel.getByText('Whoever your provider next signs in with the email sara@acme.test', {
        exact: false,
      })
    )
    await panel.getByRole('button', { name: 'Yes, dissociate', exact: true }).click()

    await page.assertVisible(
      page.getByText('Dissociated sara@acme.test from their account at your identity provider.', {
        exact: true,
      })
    )
    await page.assertVisible(
      panel.getByText('They have not signed in through your identity provider yet.', {
        exact: false,
      })
    )
    await db.assertEmpty('member_identities')
    await db.assertEmpty('oidc_sessions')
    await sara.refresh()
    assert.equal(sara.signInMethod, MemberSignInMethod.PROVIDER)
    await assertRecorded(acme.organization, 'access.identity_dissociated', {
      count: 1,
      actor: acme.user.email,
      subjects: ['member: sara@acme.test'],
      data: { providerId: SARA.sub },
    })

    assert.isTrue(await signInAgain())
    await db.assertHas('member_identities', { member_id: sara.id, subject: '00u-sara-recreated' })
    await db.assertCount('members', 1)
  })

  test("another organization's member can't be dissociated", async ({
    assert,
    visit,
    route,
    db,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const provider = await setupOrganizationProvider(acme.organization)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    const identity = await MemberIdentity.create({
      organizationId: acme.organization.id,
      identityProviderId: provider.identityProvider.id,
      memberId: sara.id,
      subject: SARA.sub,
    })

    await browserContext.loginAs(globex.user)
    const page = await visit(route('members.index', { org: 'globex' }))
    const cookies = await page.context().cookies()
    const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
    const response = await page.request.delete(
      `${route('members.show', { org: 'globex', member: sara.id })}/identities/${identity.id}`,
      { headers: { 'x-xsrf-token': decodeURIComponent(xsrf.value) } }
    )

    assert.equal(response.status(), 404)
    await db.assertCount('member_identities', 1)
  })
})
