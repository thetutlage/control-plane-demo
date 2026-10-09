import { test } from '@japa/runner'
import type { Page } from 'playwright'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import SetPasswordNotification from '#mails/set_password_notification'
import { assertRecorded, auditEvents } from '#tests/helpers/audit'
import { setupConnectedProvider } from '#tests/helpers/identity_providers'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import { giveAccess, MEMBER, setupApp, setupMember } from '#tests/helpers/oidc'

/**
 * Makes the console's requests the way its forms do, without the pages:
 * every test here is about what a change records, not how it is asked
 * for. A change that worked redirects.
 */
async function consoleFor(page: Page) {
  const cookies = await page.context().cookies()
  const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
  const options = (data?: object) => ({
    headers: { 'x-xsrf-token': decodeURIComponent(xsrf.value) },
    data,
    maxRedirects: 0,
  })
  const done = async (response: Awaited<ReturnType<Page['request']['post']>>) => {
    if (response.status() !== 302) {
      throw new Error(`Expected a redirect, got ${response.status()}: ${await response.text()}`)
    }
  }

  return {
    post: async (url: string, data?: object) => done(await page.request.post(url, options(data))),
    put: async (url: string, data?: object) => done(await page.request.put(url, options(data))),
    delete: async (url: string) => done(await page.request.delete(url, options())),
  }
}

/**
 * Every access and configuration change in the console records an audit
 * event, saved with the change (plan §3, "Audit events")
 */
test.group('Console audit events', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('signing up records the organization, as its first event', async ({ visit, route }) => {
    const page = await visit(route('new_account.create'))
    await page.getByLabel('Company name', { exact: true }).fill('Acme Inc.')
    await page.getByLabel('Login address', { exact: true }).fill('acme')
    await page.getByLabel('Full name', { exact: true }).fill('Ada Owner')
    await page.getByLabel('Email', { exact: true }).fill('ada@acme.test')
    await page.getByLabel('Password', { exact: true }).fill('secret1234')
    await page.getByLabel('Confirm password', { exact: true }).fill('secret1234')
    await page.getByRole('button', { name: 'Create organization', exact: true }).click()
    await page.assertPath(route('overview.show', { org: 'acme' }))

    const organization = await Organization.findByOrFail('slug', 'acme')
    await assertRecorded(organization, 'configuration.organization_created', {
      count: 1,
      actor: 'ada@acme.test',
      subjects: [],
      data: { name: 'Acme Inc.', slug: 'acme' },
    })
  })

  test('adding a member, sending their link again and signing them out are recorded', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const mailer = mail.fake()
    await browserContext.loginAs(acme.user)
    const console = await consoleFor(await visit(route('members.index', { org: 'acme' })))

    await console.post('/w/acme/members', {
      fullName: 'Sara Lee',
      email: 'sara@acme.test',
      signsInWith: 'password',
    })
    const sara = await acme.organization.related('members').query().firstOrFail()
    await console.post(`/w/acme/members/${sara.id}/password-resets`)
    await console.delete(`/w/acme/members/${sara.id}/sessions`)

    await assertRecorded(acme.organization, 'access.member_added', {
      count: 1,
      actor: acme.user.email,
      subjects: ['member: sara@acme.test'],
      summary: `${acme.user.email} added sara@acme.test, to sign in with a password`,
      data: { signInMethod: 'password' },
    })
    await assertRecorded(acme.organization, 'access.password_setup_sent', {
      count: 1,
      subjects: ['member: sara@acme.test'],
    })
    await assertRecorded(acme.organization, 'access.signed_out_everywhere', {
      count: 1,
      subjects: ['member: sara@acme.test'],
    })
    mailer.mails.assertQueuedCount(SetPasswordNotification, 2)
  })

  test('creating, changing and deleting a role are recorded, and an unchanged save is not', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const setup = await setupApp(acme.production)
    const member = await setupMember(acme.organization)
    await giveAccess(member, setup)
    const onlyRole = await acme.organization.related('roles').query().firstOrFail()
    await browserContext.loginAs(acme.user)
    const console = await consoleFor(await visit(route('roles.index', { org: 'acme' })))

    await console.post('/w/acme/roles', { name: 'Finance', description: null, permissions: [] })
    const finance = await acme.organization
      .related('roles')
      .query()
      .where('name', 'Finance')
      .firstOrFail()
    await console.put(`/w/acme/roles/${finance.id}`, {
      name: 'Finance',
      description: null,
      permissions: [],
    })
    await console.put(`/w/acme/roles/${finance.id}`, {
      name: 'Accounts',
      description: 'Sees invoices',
      permissions: [],
    })
    await console.delete(`/w/acme/roles/${finance.id}`)
    await console.delete(`/w/acme/roles/${onlyRole.id}`)

    await assertRecorded(acme.organization, 'access.role_created', {
      count: 1,
      subjects: ['role: Finance'],
      data: { permissions: [] },
    })
    await assertRecorded(acme.organization, 'access.role_changed', {
      count: 1,
      summary: `${acme.user.email} changed the role Finance`,
      subjects: ['role: Accounts'],
      data: {
        before: { name: 'Finance', description: null, permissions: [] },
        after: { name: 'Accounts', description: 'Sees invoices', permissions: [] },
      },
    })
    await assertRecorded(acme.organization, 'access.role_deleted', {
      count: 2,
      subjects: ['role: Accounts'],
      data: { membersWhoLostAccess: 0 },
    })
    await assertRecorded(acme.organization, 'access.role_deleted', {
      subjects: [`role: ${onlyRole.name}`],
      data: { membersWhoLostAccess: 1 },
    })
  })

  test('giving and removing access to an app are recorded, with the roles', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.staging)
    const member = await setupMember(acme.organization)
    const viewer = await acme.organization
      .related('roles')
      .create({ name: 'Viewer', description: null, permissions: [] })
    await browserContext.loginAs(acme.user)
    const console = await consoleFor(await visit(route('members.index', { org: 'acme' })))
    const members = '/w/acme/apps/invoices/environments/staging/members'

    await console.post(members, { memberId: member.id, roleIds: [viewer.id] })
    await console.delete(`${members}/${member.id}`)

    const [granted] = await assertRecorded(acme.organization, 'access.granted', {
      count: 1,
      actor: acme.user.email,
      subjects: [`member: ${MEMBER.email}`, 'app: Invoices', 'role: Viewer'],
      summary: `${acme.user.email} gave ${MEMBER.email} access to Invoices in Staging`,
      data: { roles: ['Viewer'] },
    })
    const [revoked] = await assertRecorded(acme.organization, 'access.revoked', {
      count: 1,
      subjects: [`member: ${MEMBER.email}`, 'app: Invoices', 'role: Viewer'],
      data: { roles: ['Viewer'] },
    })
    if (granted.environmentId !== acme.staging.id || revoked.environmentId !== acme.staging.id) {
      throw new Error('Access events must belong to the environment the access is in')
    }
  })

  test('an app, its setup and its secret are recorded, without the secret', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await browserContext.loginAs(acme.user)
    const console = await consoleFor(await visit(route('apps.index', { org: 'acme' })))
    const setup = '/w/acme/apps/payroll/environments/staging'
    const urls = {
      appUrl: 'https://payroll.acme.test',
      redirectUris: 'https://payroll.acme.test/callback',
      postLogoutRedirectUris: '',
    }

    await console.post('/w/acme/apps', { name: 'Payroll', slug: 'payroll' })
    await console.post(setup, urls)
    await console.put(setup, urls)
    await console.put(setup, { ...urls, appUrl: 'https://pay.acme.test' })
    await console.post(`${setup}/secret`)
    const rotated = await acme.staging.related('appEnvironments').query().firstOrFail()
    const { secret } = rotated
    await console.delete(setup)
    await console.delete('/w/acme/apps/payroll')

    const about = { actor: acme.user.email, subjects: ['app: Payroll'] }
    await assertRecorded(acme.organization, 'configuration.app_created', { count: 1, ...about })
    await assertRecorded(acme.organization, 'configuration.app_set_up', {
      count: 1,
      ...about,
      data: { appUrl: 'https://payroll.acme.test' },
    })
    await assertRecorded(acme.organization, 'configuration.app_setup_changed', {
      count: 1,
      ...about,
      summary: `${acme.user.email} changed the URLs of Payroll in Staging`,
    })
    await assertRecorded(acme.organization, 'configuration.client_secret_rotated', {
      count: 1,
      ...about,
    })
    await assertRecorded(acme.organization, 'configuration.app_setup_removed', {
      count: 1,
      ...about,
    })
    await assertRecorded(acme.organization, 'configuration.app_deleted', { count: 1, ...about })

    const everything = JSON.stringify(await auditEvents(acme.organization))
    assert.notInclude(everything, secret, 'a client secret must never be recorded')
  })

  test('removing the provider records it and each member it switches, as one batch', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const provider = await setupConnectedProvider(acme.organization)
    for (const email of ['ana@acme.test', 'ben@acme.test']) {
      await acme.organization.createMember({
        email,
        fullName: null,
        status: MemberStatus.ACTIVE,
        signInMethod: MemberSignInMethod.PROVIDER,
      })
    }
    await browserContext.loginAs(acme.user)
    const console = await consoleFor(
      await visit(route('identity_providers.index', { org: 'acme' }))
    )

    await console.delete(`/w/acme/settings/identity-providers/${provider.id}`)

    const [removed] = await assertRecorded(
      acme.organization,
      'configuration.identity_provider_removed',
      { count: 1, data: { membersSwitched: 2 } }
    )
    const switched = await assertRecorded(acme.organization, 'access.sign_in_method_changed', {
      count: 2,
      data: { before: 'provider', after: 'password' },
    })
    assert.isNotNull(removed.batchId)
    assert.deepEqual(
      switched.map(({ batchId }) => batchId),
      [removed.batchId, removed.batchId]
    )
  })

  test("another organization's console finds none of these events", async ({ assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const setup = await setupApp(acme.production)
    const member = await setupMember(acme.organization)
    await giveAccess(member, setup)

    assert.lengthOf(await auditEvents(globex.organization), 0)
  })
})
