import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import type { Page } from 'playwright'
import { events } from '#generated/events'
import emitter from '@adonisjs/core/services/emitter'
import testUtils from '@adonisjs/core/services/test_utils'
import type Organization from '#models/organization'
import MemberIdentity from '#models/member_identity'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import SetPasswordNotification from '#mails/set_password_notification'
import ProviderSignInNotification from '#mails/provider_sign_in_notification'
import ProviderDiscoveryService from '#services/provider_discovery_service'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import { giveAccess, MEMBER, setupApp, setupMember, visitIssuer } from '#tests/helpers/oidc'
import {
  PROVIDER,
  setupConnectedProvider,
  StubbedProviderDiscovery,
} from '#tests/helpers/identity_providers'

/**
 * A member who signs in with a password
 */
function passwordMember(organization: Organization, email: string) {
  return organization.createMember({
    email,
    fullName: null,
    status: MemberStatus.ACTIVE,
    password: 'correct-horse',
  })
}

async function xsrfHeaders(page: Page) {
  const cookies = await page.context().cookies()
  const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
  return { 'x-xsrf-token': decodeURIComponent(xsrf.value) }
}

/**
 * How a member signs in is an admin's choice, and only an admin's action
 * changes it.
 */
test.group('Console provider members', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('connecting a provider changes nobody, then asks who signs in with it', async ({
    assert,
    visit,
    route,
    swap,
    browserContext,
  }) => {
    swap(ProviderDiscoveryService, () => new StubbedProviderDiscovery())
    using fakeEmitter = emitter.fake([events.MemberSignInMethodChanged])
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const ana = await passwordMember(acme.organization, 'ana@acme.test')
    const ben = await passwordMember(acme.organization, 'ben@acme.test')
    const cho = await passwordMember(acme.organization, 'cho@acme.test')

    await browserContext.loginAs(acme.user)
    const page = await visit(route('identity_providers.create', { org: 'acme' }))
    await page.getByLabel('Issuer URL', { exact: true }).fill(PROVIDER.issuer)
    await page.getByLabel('Client ID', { exact: true }).fill(PROVIDER.clientId)
    await page.getByLabel('Client secret', { exact: true }).fill(PROVIDER.clientSecret)
    await page.getByRole('button', { name: 'Connect', exact: true }).click()

    await page.assertVisible(
      page.getByRole('heading', { name: 'Who signs in with your identity provider?' })
    )
    for (const member of [ana, ben, cho]) {
      await member.refresh()
      assert.equal(member.signInMethod, MemberSignInMethod.PASSWORD)
    }

    await page.getByLabel('ana@acme.test', { exact: true }).check()
    await page.getByLabel('cho@acme.test', { exact: true }).check()
    await page.getByRole('button', { name: 'Switch 2 to the provider', exact: true }).click()

    await page.assertVisible(
      page.getByText('2 members now sign in with your identity provider.', { exact: true })
    )
    await page.assertNotExists(page.getByLabel('ana@acme.test', { exact: true }))
    await page.assertVisible(page.getByLabel('ben@acme.test', { exact: true }))
    await Promise.all([ana.refresh(), ben.refresh(), cho.refresh()])
    assert.equal(ana.signInMethod, MemberSignInMethod.PROVIDER)
    assert.equal(ben.signInMethod, MemberSignInMethod.PASSWORD)
    assert.equal(cho.signInMethod, MemberSignInMethod.PROVIDER)
    fakeEmitter.assertEmittedCount(events.MemberSignInMethodChanged, 2)
  })

  test('switching everyone leaves nothing to ask, and says so on the Authentication page', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const identityProvider = await setupConnectedProvider(acme.organization)
    await passwordMember(acme.organization, 'ana@acme.test')
    await passwordMember(acme.organization, 'ben@acme.test')

    await browserContext.loginAs(acme.user)
    const page = await visit(route('identity_providers.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('2 still sign in with a password.'))
    await page.getByRole('link', { name: 'Choose who switches', exact: true }).click()
    await page.assertPath(
      route('identity_providers.members.create', { org: 'acme', provider: identityProvider.id })
    )
    await page.getByLabel('Everyone (2)', { exact: true }).check()
    await page.getByRole('button', { name: 'Switch 2 to the provider', exact: true }).click()

    await page.assertPath(route('identity_providers.index', { org: 'acme' }))
    await page.assertVisible(
      page.getByText('2 members now sign in with your identity provider.', { exact: true })
    )
    await page.assertVisible(page.getByText('2 members sign in with it.'))
    await page.assertNotExists(page.getByRole('link', { name: 'Choose who switches' }))
  })

  test('a switched member is signed out everywhere', async ({
    visit,
    route,
    db,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupConnectedProvider(acme.organization)
    const client = await setupApp(acme.staging)
    const sara = await setupMember(acme.organization)
    await giveAccess(sara, client)
    await browserContext.loginAs(acme.user)
    await visitIssuer(browserContext, acme.organization, acme.staging, client)
    await db.assertCount('oidc_sessions', 1)
    await db.assertCount('oidc_grants', 1)

    const page = await visit(route('members.show', { org: 'acme', member: sara.id }))
    await page.assertVisible(page.getByRole('heading', { name: 'Signs in with a password' }))
    await page
      .getByRole('button', { name: 'Switch to your identity provider', exact: true })
      .click()

    await page.assertVisible(
      page.getByText(`${MEMBER.email} now signs in with your identity provider.`, { exact: true })
    )
    await page.assertVisible(
      page.getByRole('heading', { name: 'Signs in with your identity provider' })
    )
    await db.assertEmpty('oidc_sessions')
    await db.assertEmpty('oidc_grants')
  })

  test('a member is switched back to a password from their page', async ({
    assert,
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupConnectedProvider(acme.organization)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    const mailer = mail.fake()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.show', { org: 'acme', member: sara.id }))
    await page.assertNotExists(
      page.getByRole('button', { name: 'Email a link to set a password', exact: true })
    )
    await page.getByRole('button', { name: 'Switch to a password', exact: true }).click()

    await page.assertVisible(
      page.getByText(
        'sara@acme.test now signs in with a password. We emailed them a link to set it.',
        { exact: true }
      )
    )
    await page.assertVisible(page.getByText('They have not set a password yet.'))
    await sara.refresh()
    assert.equal(sara.signInMethod, MemberSignInMethod.PASSWORD)
    mailer.mails.assertQueued(SetPasswordNotification, ({ message }) =>
      message.hasTo('sara@acme.test')
    )
  })

  test("without a provider, a member's page offers no switch", async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const sara = await passwordMember(acme.organization, 'sara@acme.test')

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.show', { org: 'acme', member: sara.id }))

    await page.assertVisible(page.getByRole('heading', { name: 'Signs in with a password' }))
    await page.assertNotExists(page.getByRole('button', { name: /^Switch to (a|your)/ }))
  })

  test('adding a member set to the provider stores no password, and tells them', async ({
    assert,
    visit,
    route,
    db,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupConnectedProvider(acme.organization)
    const mailer = mail.fake()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.create', { org: 'acme' }))
    await page.assertChecked(page.getByRole('radio', { name: /^Your identity provider/ }))
    await page.assertNotExists(page.getByLabel('Password', { exact: true }))
    await page.getByLabel('Email', { exact: true }).fill('sara@acme.test')
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertVisible(
      page.getByText('sara@acme.test can now sign in with your identity provider.', {
        exact: true,
      })
    )
    const sara = await acme.organization.related('members').query().firstOrFail()
    assert.equal(sara.signInMethod, MemberSignInMethod.PROVIDER)
    assert.isNull(sara.password)
    mailer.mails.assertQueued(ProviderSignInNotification, ({ message }) =>
      message.hasTo('sara@acme.test')
    )
    mailer.mails.assertNotQueued(SetPasswordNotification)
    await db.assertEmpty('password_reset_tokens')
  })

  test('adding a member set to a password emails them a link to set it', async ({
    assert,
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupConnectedProvider(acme.organization)
    const mailer = mail.fake()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.create', { org: 'acme' }))
    await page.getByRole('radio', { name: /^A password/ }).check()
    await page.getByLabel('Email', { exact: true }).fill('auditor@firm.test')
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertVisible(
      page.getByText('Emailed auditor@firm.test a link to set their password.', { exact: true })
    )
    const auditor = await acme.organization.related('members').query().firstOrFail()
    assert.equal(auditor.signInMethod, MemberSignInMethod.PASSWORD)
    assert.isNull(auditor.password)
    mailer.mails.assertQueued(SetPasswordNotification, ({ message }) =>
      message.hasTo('auditor@firm.test')
    )
    mailer.mails.assertNotQueued(ProviderSignInNotification)
  })

  test('people the provider lets through are refused until the admin lets them join', async ({
    assert,
    visit,
    route,
    swap,
    browserContext,
  }) => {
    swap(ProviderDiscoveryService, () => new StubbedProviderDiscovery())
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const identityProvider = await setupConnectedProvider(acme.organization)
    assert.isFalse(identityProvider.admitsNewcomers)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('identity_providers.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('Are refused', { exact: true }))
    await page.getByRole('link', { name: 'Edit', exact: true }).click()
    await page.getByLabel('People my provider lets through can join without being added').check()
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertVisible(
      page.getByText('Can join when your provider lets them through, with no access', {
        exact: true,
      })
    )
    await identityProvider.refresh()
    assert.isTrue(identityProvider.admitsNewcomers)
  })

  test('replacing the provider needs a confirmation, then clears the ties to the old one', async ({
    assert,
    visit,
    route,
    swap,
    db,
    browserContext,
  }) => {
    swap(ProviderDiscoveryService, () => new StubbedProviderDiscovery())
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const identityProvider = await setupConnectedProvider(acme.organization)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await MemberIdentity.create({
      organizationId: acme.organization.id,
      identityProviderId: identityProvider.id,
      memberId: sara.id,
      subject: '00u-sara-at-the-old-provider',
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('identity_providers.edit', { org: 'acme', provider: identityProvider.id })
    )
    await page.getByLabel('Issuer URL', { exact: true }).fill('https://accounts.google.com')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.assertVisible(
      page.getByText(
        'This is a different provider. Confirm below that members will be matched by email again',
        { exact: true }
      )
    )
    await db.assertCount('member_identities', 1)

    await page.getByLabel("I'm replacing the provider").check()
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertPath(route('identity_providers.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('https://accounts.google.com', { exact: true }))
    await db.assertEmpty('member_identities')
    await sara.refresh()
    assert.equal(sara.signInMethod, MemberSignInMethod.PROVIDER)
  })

  test('saving other details keeps the ties', async ({
    visit,
    route,
    swap,
    db,
    browserContext,
  }) => {
    swap(ProviderDiscoveryService, () => new StubbedProviderDiscovery())
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const identityProvider = await setupConnectedProvider(acme.organization)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await MemberIdentity.create({
      organizationId: acme.organization.id,
      identityProviderId: identityProvider.id,
      memberId: sara.id,
      subject: '00u-sara',
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('identity_providers.edit', { org: 'acme', provider: identityProvider.id })
    )
    await page.getByLabel('Client ID', { exact: true }).fill('0oa-rotated')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertPath(route('identity_providers.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('0oa-rotated', { exact: true }))
    await db.assertCount('member_identities', 1)
  })

  test('removing the provider says who it affects, and switches them to a password', async ({
    assert,
    visit,
    route,
    db,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupConnectedProvider(acme.organization)
    const sara = await acme.organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await passwordMember(acme.organization, 'auditor@firm.test')
    const mailer = mail.fake()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('identity_providers.index', { org: 'acme' }))
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await page.assertVisible(
      page.getByText(
        'They switch to a password, are signed out everywhere, and get an email to set one.',
        { exact: false }
      )
    )
    await page.getByRole('button', { name: 'Yes, remove', exact: true }).click()

    await page.assertVisible(
      page.getByText(
        'Removed your identity provider. 1 member now signs in with a password, and got an email to set one.',
        { exact: true }
      )
    )
    await db.assertEmpty('identity_providers')
    await sara.refresh()
    assert.equal(sara.signInMethod, MemberSignInMethod.PASSWORD)
    mailer.mails.assertQueuedCount(SetPasswordNotification, 1)
    mailer.mails.assertQueued(SetPasswordNotification, ({ message }) =>
      message.hasTo('sara@acme.test')
    )
  })

  test("another organization's members and provider are out of reach", async ({
    assert,
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const acmeProvider = await setupConnectedProvider(acme.organization)
    const globexProvider = await setupConnectedProvider(globex.organization)
    const ana = await passwordMember(acme.organization, 'ana@acme.test')
    const acmeStaff = await acme.organization.createMember({
      email: 'staff@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })

    await browserContext.loginAs(globex.user)
    const page = await visit(route('identity_providers.index', { org: 'globex' }))
    const headers = await xsrfHeaders(page)
    const own = `/w/globex/settings/identity-providers/${globexProvider.id}/members`
    const theirs = `/w/globex/settings/identity-providers/${acmeProvider.id}/members`

    const forged = await page.request.post(own, {
      headers,
      data: { memberIds: [ana.id] },
      maxRedirects: 0,
    })
    const wrongProvider = await page.request.post(theirs, {
      headers,
      data: { memberIds: [ana.id] },
    })
    const switchedBack = await page.request.delete(`${own}/${acmeStaff.id}`, { headers })

    assert.equal(forged.status(), 302)
    assert.equal(wrongProvider.status(), 404)
    assert.equal(switchedBack.status(), 404)
    await Promise.all([ana.refresh(), acmeStaff.refresh()])
    assert.equal(ana.signInMethod, MemberSignInMethod.PASSWORD)
    assert.equal(acmeStaff.signInMethod, MemberSignInMethod.PROVIDER)
  })
})
