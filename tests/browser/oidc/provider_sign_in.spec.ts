import { test } from '@japa/runner'
import type { Page } from 'playwright'
import { events } from '#generated/events'
import emitter from '@adonisjs/core/services/emitter'
import testUtils from '@adonisjs/core/services/test_utils'
import Member from '#models/member'
import MemberIdentity from '#models/member_identity'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import ProviderRequestService from '#services/provider_request_service'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import { SARA, setupOrganizationProvider } from '#tests/helpers/fake_provider'
import { appCallback, authorizeUrl, giveAccess, setupApp, signIn } from '#tests/helpers/oidc'

const BUTTON = 'Continue with your company account'

/**
 * Lets the app reach the provider running on this machine
 */
const reachLocalProvider = () => new ProviderRequestService({ allowLocal: true })

function continueWithProvider(page: Page) {
  return page.getByRole('button', { name: BUTTON, exact: true }).click()
}

/**
 * Starts a sign-in and stops the browser at the provider's door, to
 * return the `state` it was sent with. The browser keeps the cookies of
 * a sign-in in progress.
 */
async function stateSentToProvider(page: Page, issuer: string) {
  await page.route(`${issuer}/**`, (route) => route.abort())
  const sent = page.waitForRequest((request) => request.url().startsWith(`${issuer}/auth`))
  await continueWithProvider(page)
  const request = await sent
  return new URL(request.url()).searchParams.get('state')!
}

test.group('Sign-in with the identity provider', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a member set to the provider signs in with their company account', async ({
    assert,
    swap,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    using fakeEmitter = emitter.fake([events.MemberSignedInWithProvider])
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    const sara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: null,
      status: MemberStatus.INVITED,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, client)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    const callback = appCallback(page, 'https://invoices.acme.test/callback')
    await continueWithProvider(page)

    const { searchParams } = await callback
    assert.isNotEmpty(searchParams.get('code'))
    assert.equal(searchParams.get('state'), 'state-from-the-app')

    await sara.refresh()
    assert.equal(sara.status, MemberStatus.ACTIVE)
    assert.equal(sara.fullName, 'Sara Lee')
    assert.isNull(sara.password)
    const identity = await MemberIdentity.findByOrFail('memberId', sara.id)
    assert.equal(identity.subject, SARA.sub)
    assert.equal(identity.identityProviderId, provider.identityProvider.id)
    fakeEmitter.assertEmitted(events.MemberSignedInWithProvider, ({ data }) => {
      return data.member.id === sara.id && data.how === 'matched_by_email'
    })
  })

  test('someone no admin added is refused', async ({ swap, db, browserContext }) => {
    swap(ProviderRequestService, reachLocalProvider)
    using fakeEmitter = emitter.fake([events.ProviderSignInRefused])
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(organization)
    const client = await setupApp(staging)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    await continueWithProvider(page)

    await page.assertVisible(page.getByRole('heading', { name: "We couldn't sign you in" }))
    await db.assertEmpty('members')
    fakeEmitter.assertEmitted(events.ProviderSignInRefused, ({ data }) => {
      return data.reason === 'not_a_member' && data.email === 'sara@acme.test'
    })
  })

  test('a member set to a password is refused by the provider, and stays on a password', async ({
    assert,
    swap,
    db,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    using fakeEmitter = emitter.fake([events.ProviderSignInRefused])
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(organization, { admitsNewcomers: true })
    const client = await setupApp(staging)
    const sara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      password: 'correct-horse',
    })
    await giveAccess(sara, client)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    await continueWithProvider(page)

    await page.assertVisible(page.getByRole('heading', { name: "We couldn't sign you in" }))
    await sara.refresh()
    assert.equal(sara.signInMethod, MemberSignInMethod.PASSWORD)
    await db.assertEmpty('member_identities')
    fakeEmitter.assertEmitted(events.ProviderSignInRefused, ({ data }) => {
      return data.reason === 'signs_in_with_a_password'
    })
  })

  test('a member set to the provider is refused by the password form', async ({
    browserContext,
  }) => {
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    const sara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      password: 'correct-horse',
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, client)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    await signIn(page, 'sara@acme.test', 'correct-horse')

    await page.assertVisible(page.getByText('Email or password is incorrect', { exact: true }))
  })

  test('with newcomers admitted, someone new becomes a member with no access', async ({
    assert,
    swap,
    db,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    using fakeEmitter = emitter.fake([events.MemberSignedInWithProvider])
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization, { admitsNewcomers: true })
    const client = await setupApp(staging)
    provider.signsInAs({ sub: '00u-dev', email: 'Designer@Gmail.com', name: 'Dev Patel' })

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    await continueWithProvider(page)

    await page.assertVisible(page.getByText("You don't have access to Invoices"))
    const member = await Member.findByOrFail('email', 'designer@gmail.com')
    assert.equal(member.status, MemberStatus.ACTIVE)
    assert.equal(member.fullName, 'Dev Patel')
    assert.isNull(member.password)
    assert.equal(member.signInMethod, MemberSignInMethod.PROVIDER)
    await db.assertHas('member_identities', { member_id: member.id, subject: '00u-dev' })
    fakeEmitter.assertEmitted(events.MemberSignedInWithProvider, ({ data }) => {
      return data.member.id === member.id && data.how === 'created'
    })
  })

  test('a returning member is found by their ID, and their email follows the provider', async ({
    assert,
    swap,
    db,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    using fakeEmitter = emitter.fake([events.MemberSignedInWithProvider])
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    const sara = await organization.createMember({
      email: 'sara.before@acme.test',
      fullName: 'Sara Before',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, client)
    await MemberIdentity.create({
      organizationId: organization.id,
      identityProviderId: provider.identityProvider.id,
      memberId: sara.id,
      subject: SARA.sub,
    })

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    const callback = appCallback(page, 'https://invoices.acme.test/callback')
    await continueWithProvider(page)
    await callback

    await sara.refresh()
    assert.equal(sara.email, 'sara@acme.test')
    assert.equal(sara.fullName, 'Sara Lee')
    await db.assertCount('members', 1)
    await db.assertCount('member_identities', 1)
    fakeEmitter.assertEmitted(events.MemberSignedInWithProvider, ({ data }) => {
      return data.how === 'returning'
    })
  })

  test('an email already tied to another account is refused, never relinked', async ({
    swap,
    db,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    using fakeEmitter = emitter.fake([events.ProviderSignInRefused])
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    const formerSara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: 'The Sara who left',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(formerSara, client)
    await MemberIdentity.create({
      organizationId: organization.id,
      identityProviderId: provider.identityProvider.id,
      memberId: formerSara.id,
      subject: '00u-the-sara-who-left',
    })

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    await continueWithProvider(page)

    await page.assertVisible(page.getByRole('heading', { name: "We couldn't sign you in" }))
    await page.assertVisible(page.getByText('sign_in_refused', { exact: true }))
    await db.assertCount('member_identities', 1)
    await db.assertMissing('member_identities', { subject: SARA.sub })
    fakeEmitter.assertEmitted(events.ProviderSignInRefused, ({ data }) => {
      return data.reason === 'email_belongs_to_another_account' && data.email === 'sara@acme.test'
    })
  })

  test('{title} is refused')
    .with([
      {
        title: 'an email the provider calls unverified',
        account: { sub: '00u-x', email: 'x@acme.test', email_verified: false },
        reason: 'email_unverified',
      },
      { title: 'an account with no email', account: { sub: '00u-x' }, reason: 'no_email' },
    ])
    .run(async ({ swap, db, browserContext }, { account, reason }) => {
      swap(ProviderRequestService, reachLocalProvider)
      using fakeEmitter = emitter.fake([events.ProviderSignInRefused])
      const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
      const provider = await setupOrganizationProvider(organization)
      const client = await setupApp(staging)
      provider.signsInAs(account)

      const page = await browserContext.newPage()
      await page.goto(authorizeUrl(organization, staging, client))
      await continueWithProvider(page)

      await page.assertVisible(page.getByRole('heading', { name: "We couldn't sign you in" }))
      await db.assertEmpty('members')
      fakeEmitter.assertEmitted(events.ProviderSignInRefused, ({ data }) => data.reason === reason)
    })

  test('a suspended member is refused', async ({ swap, db, browserContext }) => {
    swap(ProviderRequestService, reachLocalProvider)
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    const sara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.SUSPENDED,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await giveAccess(sara, client)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    await continueWithProvider(page)

    await page.assertVisible(page.getByRole('heading', { name: "We couldn't sign you in" }))
    await db.assertEmpty('member_identities')
  })

  test('cancelling at the provider returns to the sign-in page', async ({
    swap,
    db,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization)
    const client = await setupApp(staging)
    provider.cancels()

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    await continueWithProvider(page)

    await page.assertVisible(page.getByText('Sign-in was cancelled', { exact: true }))
    await page.assertVisible(page.getByRole('button', { name: BUTTON, exact: true }))
    await db.assertEmpty('members')
  })

  test('without a provider, the sign-in page only has the password form', async ({
    browserContext,
  }) => {
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(staging)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))

    await page.assertVisible(page.getByRole('button', { name: 'Sign in', exact: true }))
    await page.assertNotExists(page.getByRole('button', { name: BUTTON, exact: true }))
  })

  test('the callback forwards the answer to the issuer host that started the sign-in', async ({
    assert,
    swap,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupOrganizationProvider(organization)
    const client = await setupApp(staging)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    const signInId = new URL(page.url()).pathname.split('/').at(-1)
    const state = await stateSentToProvider(page, provider.issuer)

    const callback = new URL(organization.signInCallbackUrl())
    callback.search = new URLSearchParams({
      code: 'the-code',
      state,
      iss: provider.issuer,
      next: 'https://evil.example.com',
    }).toString()
    const response = await page.request.get(callback.href, { maxRedirects: 0 })

    assert.equal(response.status(), 302)
    assert.equal(response.headers()['referrer-policy'], 'no-referrer')
    const target = new URL(response.headers()['location'])
    assert.equal(target.origin, new URL(staging.issuerUrl('acme')).origin)
    assert.equal(target.pathname, `/sign-in/${signInId}/provider/callback`)
    assert.deepEqual(Object.fromEntries(target.searchParams), {
      code: 'the-code',
      state,
      iss: provider.issuer,
    })
  })

  test('the callback refuses {title}')
    .with([
      { title: 'a state that was tampered with', slug: 'acme', tamper: true },
      { title: "another organization's path", slug: 'globex', tamper: false },
    ])
    .run(async ({ assert, swap, browserContext }, { slug, tamper }) => {
      swap(ProviderRequestService, reachLocalProvider)
      const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
      await setupOnboardedOrganization({ slug: 'globex' })
      const provider = await setupOrganizationProvider(organization)
      const client = await setupApp(staging)

      const page = await browserContext.newPage()
      await page.goto(authorizeUrl(organization, staging, client))
      const state = await stateSentToProvider(page, provider.issuer)

      const callback = new URL(`/sign-in/callback/${slug}`, organization.signInCallbackUrl())
      callback.search = new URLSearchParams({
        code: 'the-code',
        state: tamper ? state.replace(/.$/, (last) => (last === 'A' ? 'B' : 'A')) : state,
      }).toString()
      const response = await page.request.get(callback.href, { maxRedirects: 0 })

      assert.equal(response.status(), 400)
      assert.include(await response.text(), 'This sign-in has expired')
    })

  test('an answer can only be used in the browser that started the sign-in', async ({
    assert,
    swap,
    db,
    browser,
    browserContext,
  }) => {
    swap(ProviderRequestService, reachLocalProvider)
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOrganizationProvider(organization)
    const client = await setupApp(staging)

    /**
     * The victim's browser is stopped on its way back from the provider,
     * and the URL it was heading to is opened somewhere else
     */
    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    await page.route('**/sign-in/callback/**', (route) => route.abort())
    const answer = page.waitForRequest((request) => request.url().includes('/sign-in/callback/'))
    await continueWithProvider(page)
    const answered = await answer
    const stolen = answered.url()

    const elsewhere = await browser.newContext()
    const response = await elsewhere.request.get(stolen)
    const body = await response.text()
    await elsewhere.close()

    assert.equal(response.status(), 400)
    assert.include(body, 'This sign-in has expired')
    await db.assertEmpty('members')
  })
})
