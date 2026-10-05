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
    const page = await visit(
      route('members.index', { org: 'acme' }, { qs: { environment: 'production' } })
    )

    await page.assertVisible(page.getByRole('cell', { name: 'prod@acme.test', exact: true }))
    await page.assertNotExists(page.getByRole('cell', { name: 'staging@acme.test', exact: true }))
    await page.assertNotExists(page.getByRole('cell', { name: 'prod@globex.test', exact: true }))
  })

  test('pages show production until another environment is picked', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme' }))

    await page.assertInputValue(
      page.getByRole('combobox', { name: 'Environment', exact: true }),
      'production'
    )
  })

  test('the environment switcher keeps the current page, and the choice carries over', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await acme.staging.createMember({
      email: 'staging@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme' }))
    await page.getByRole('combobox', { name: 'Environment', exact: true }).selectOption('staging')

    await page.assertVisible(page.getByRole('cell', { name: 'staging@acme.test', exact: true }))
    await page.assertPath(route('members.index', { org: 'acme' }))
    assert.include(page.url(), 'environment=staging')

    await page.getByRole('link', { name: 'Roles', exact: true }).click()
    await page.assertPath(route('roles.index', { org: 'acme' }))
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
    const page = await visit(route('overview.show', { org: 'acme' }))
    const response = await page.request.get(route('overview.show', { org: 'globex' }))

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
    const page = await visit(route('overview.show', { org: 'acme' }))
    const response = await page.request.get(
      route('members.index', { org: 'acme' }, { qs: { environment: 'qa' } })
    )

    assert.equal(response.status(), 404)
  })

  test('console pages require a signed-in user', async ({ visit, route }) => {
    const page = await visit(route('members.index', { org: 'acme' }))

    await page.assertPath(route('session.create'))
  })
})
