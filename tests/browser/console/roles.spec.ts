import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import PermissionCatalog from '#models/permission_catalog'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

test.group('Console roles', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('flags role keys that are missing from the environment’s catalogue', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const scope = { organizationId: acme.organization.id, environmentId: acme.staging.id }
    await PermissionCatalog.create({
      ...scope,
      permissions: { 'billing:invoice.read': { description: 'View invoices' } },
      hash: null,
      gitSha: null,
      syncedAt: DateTime.now(),
    })
    await Role.create({
      ...scope,
      name: 'Finance',
      description: null,
      permissions: ['billing:invoice.read', 'payroll:run.view'],
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('roles.index', { org: 'acme' }, { qs: { environment: 'staging' } })
    )

    await page.assertVisible(page.getByRole('cell', { name: 'Finance', exact: true }))
    await page.assertVisible(page.getByText('1 missing from catalogue', { exact: true }))
    await page.assertNotExists(page.getByRole('status'))
  })

  test('says so when the environment has not synced a catalogue', async ({
    visit,
    route,
    browserContext,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await Role.create({
      organizationId: acme.organization.id,
      environmentId: acme.production.id,
      name: 'Finance',
      description: null,
      permissions: ['billing:invoice.read'],
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('roles.index', { org: 'acme' }, { qs: { environment: 'production' } })
    )

    await page.assertVisible(
      page.getByText('No catalogue synced for this environment yet.', { exact: true })
    )
    await page.assertNotExists(page.getByText('1 missing from catalogue', { exact: true }))
  })
})
