import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { MemberStatus } from '#values/member_status'
import { EnvironmentKind } from '#values/environment_kind'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

test.group('Console isolation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a members page lists only that environment’s members', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const active = { fullName: null, status: MemberStatus.ACTIVE }
    await acme.production.createMember({ ...active, email: 'prod@acme.test' })
    await acme.staging.createMember({ ...active, email: 'staging@acme.test' })
    await globex.production.createMember({ ...active, email: 'prod@globex.test' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme', environment: 'production' }))

    await page.assertVisible(page.getByRole('cell', { name: 'prod@acme.test', exact: true }))
    await page.assertNotExists(page.getByRole('cell', { name: 'staging@acme.test', exact: true }))
    await page.assertNotExists(page.getByRole('cell', { name: 'prod@globex.test', exact: true }))
  })

  test('the console opens on production, then on the environment last opened', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('organizations.show', { org: 'acme' }))
    await page.assertPath(route('overview.show', { org: 'acme', environment: 'production' }))

    await page.goto(route('roles.index', { org: 'acme', environment: 'staging' }))
    await page.goto(route('organizations.show', { org: 'acme' }))
    await page.assertPath(route('overview.show', { org: 'acme', environment: 'staging' }))
  })

  test('the environment switcher keeps the section, and the nav follows it', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const member = await acme.production.createMember({
      email: 'prod@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })
    await acme.staging.createMember({
      email: 'staging@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('members.show', { org: 'acme', environment: 'production', member: member.id })
    )
    await page.getByRole('combobox', { name: 'Environment', exact: true }).selectOption('staging')

    await page.assertPath(route('members.index', { org: 'acme', environment: 'staging' }))
    await page.assertVisible(page.getByRole('cell', { name: 'staging@acme.test', exact: true }))

    await page.getByRole('link', { name: 'Roles', exact: true }).click()
    await page.assertPath(route('roles.index', { org: 'acme', environment: 'staging' }))
    await page.assertInputValue(
      page.getByRole('combobox', { name: 'Environment', exact: true }),
      'staging'
    )
  })

  test('an organization the user does not belong to is not found', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupOnboardedOrganization({ slug: 'globex' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('overview.show', { org: 'acme', environment: 'production' }))
    const response = await page.request.get(
      route('overview.show', { org: 'globex', environment: 'production' })
    )

    assert.equal(response.status(), 404)
    assert.notInclude(response.url(), route('session.create'))
  })

  test('an environment of another organization is not found', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    await globex.organization
      .related('environments')
      .create({ name: 'QA', slug: 'qa', kind: EnvironmentKind.STAGING })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('overview.show', { org: 'acme', environment: 'production' }))
    const response = await page.request.get(
      route('members.index', { org: 'acme', environment: 'qa' })
    )

    assert.equal(response.status(), 404)
  })

  test('console pages require a signed-in user', async ({ visit, route }) => {
    const page = await visit(route('members.index', { org: 'acme', environment: 'production' }))

    await page.assertPath(route('session.create'))
  })
})
