import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { MemberStatus } from '#values/member_status'
import { EnvironmentKind } from '#values/environment_kind'
import { setupApp } from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

test.group('Console isolation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a members page lists only that organization’s members', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const active = { fullName: null, status: MemberStatus.ACTIVE }
    await acme.organization.createMember({ ...active, email: 'ada@acme.test' })
    await globex.organization.createMember({ ...active, email: 'ada@globex.test' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme' }))

    await page.assertVisible(page.getByRole('cell', { name: 'ada@acme.test', exact: true }))
    await page.assertNotExists(page.getByRole('cell', { name: 'ada@globex.test', exact: true }))
  })

  test('the environments page lists each environment with its issuer', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupApp(acme.staging)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('overview.show', { org: 'acme' }))
    await page.getByRole('link', { name: 'Environments', exact: true }).click()

    await page.assertPath(route('environments.index', { org: 'acme' }))
    for (const environment of [acme.development, acme.staging, acme.production]) {
      const row = page.getByRole('row', { name: new RegExp(environment.name) })
      await page.assertVisible(row.getByText(environment.issuerUrl('acme'), { exact: true }))
    }
    await page.assertVisible(
      page.getByRole('row', { name: /Staging/ }).getByRole('cell', { name: '1', exact: true })
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
    await setupApp(acme.production)
    await globex.organization
      .related('environments')
      .create({ name: 'QA', slug: 'qa', kind: EnvironmentKind.STAGING })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('overview.show', { org: 'acme' }))
    const response = await page.request.get(
      route('app_environments.show', { org: 'acme', app: 'invoices', environment: 'qa' })
    )

    assert.equal(response.status(), 404)
  })

  test('console pages require a signed-in user', async ({ visit, route }) => {
    const page = await visit(route('members.index', { org: 'acme' }))

    await page.assertPath(route('session.create'))
  })
})
