import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import type { Page } from 'playwright'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import type Organization from '#models/organization'
import PermissionCatalog from '#models/permission_catalog'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

/**
 * Gives the organization a catalogue with a few billing and payroll keys
 */
function setupCatalog(organization: Organization) {
  return PermissionCatalog.create({
    organizationId: organization.id,
    permissions: {
      'billing:invoice.read': { description: 'View invoices' },
      'billing:invoice.refund': { description: 'Refund an invoice' },
      'payroll:run.approve': { description: 'Approve a payroll run' },
    },
    hash: null,
    gitSha: null,
    syncedAt: DateTime.now(),
  })
}

/**
 * The XSRF header the console expects on requests made outside a form
 */
async function xsrfHeaders(page: Page) {
  const cookies = await page.context().cookies()
  const xsrf = cookies.find(({ name }) => name === 'XSRF-TOKEN')!
  return { 'x-xsrf-token': decodeURIComponent(xsrf.value) }
}

test.group('Console roles', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an admin creates a role from the catalogue’s keys', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupCatalog(acme.organization)

    await browserContext.loginAs(acme.user)
    const page = await visit(route('roles.index', { org: 'acme' }))
    await page.getByRole('link', { name: 'New role', exact: true }).click()
    await page.getByLabel('Name', { exact: true }).fill('Finance Admin')
    await page.getByLabel('Description', { exact: true }).fill('Runs billing')
    await page.getByRole('checkbox', { name: /billing:invoice\.read/ }).check()
    await page.getByRole('checkbox', { name: /billing:invoice\.refund/ }).check()
    await page.getByRole('button', { name: 'Create role', exact: true }).click()

    await page.assertPath(route('roles.index', { org: 'acme' }))
    await page.assertVisible(page.getByRole('link', { name: 'Finance Admin', exact: true }))
    const role = await acme.organization.related('roles').query().firstOrFail()
    assert.equal(role.description, 'Runs billing')
    assert.sameMembers(role.permissions, ['billing:invoice.read', 'billing:invoice.refund'])
  })

  test('a role without permissions can be created before any catalogue is synced', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('roles.create', { org: 'acme' }))
    await page.assertVisible(page.getByText(/No catalogue synced yet/))
    await page.getByLabel('Name', { exact: true }).fill('Beta tester')
    await page.getByRole('button', { name: 'Create role', exact: true }).click()

    await page.assertPath(route('roles.index', { org: 'acme' }))
    const role = await acme.organization.related('roles').query().firstOrFail()
    assert.deepEqual(role.permissions, [])
  })

  test('a role name is taken once per organization, and keys must be in the catalogue', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    await setupCatalog(acme.organization)
    await acme.organization.related('roles').create({ name: 'Finance', permissions: [] })
    await globex.organization.related('roles').create({ name: 'Payroll', permissions: [] })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('roles.create', { org: 'acme' }))
    await page.getByLabel('Name', { exact: true }).fill('Finance')
    await page.getByRole('button', { name: 'Create role', exact: true }).click()
    await page.assertVisible(page.getByText('The name has already been taken'))

    const forged = await page.request.post('/w/acme/roles', {
      headers: { ...(await xsrfHeaders(page)), accept: 'application/json' },
      data: { name: 'Payroll', description: null, permissions: ['billing:invoice.delete'] },
    })
    assert.equal(forged.status(), 422, 'a key outside the catalogue is refused')
    assert.lengthOf(await acme.organization.related('roles').query().where('name', 'Payroll'), 0)
  })

  test('flags role keys that are missing from the catalogue, and keeps them on save', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupCatalog(acme.organization)
    const role = await Role.create({
      organizationId: acme.organization.id,
      name: 'Finance',
      description: null,
      permissions: ['billing:invoice.read', 'billing:invoice.void'],
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('roles.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('1 missing from catalogue', { exact: true }))
    await page.assertNotExists(page.getByRole('status'))

    await page.getByRole('link', { name: 'Finance', exact: true }).click()
    const missing = page.getByRole('checkbox', { name: /billing:invoice\.void/ })
    await page.assertChecked(missing)
    await page.getByRole('checkbox', { name: /payroll:run\.approve/ }).check()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.assertPath(route('roles.index', { org: 'acme' }))

    await role.refresh()
    assert.sameMembers(role.permissions, [
      'billing:invoice.read',
      'billing:invoice.void',
      'payroll:run.approve',
    ])

    await page.getByRole('link', { name: 'Finance', exact: true }).click()
    await page.getByRole('checkbox', { name: /billing:invoice\.void/ }).uncheck()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.assertPath(route('roles.index', { org: 'acme' }))
    await role.refresh()
    assert.notInclude(role.permissions, 'billing:invoice.void')
  })

  test('deleting a role asks first', async ({ visit, route, browserContext, assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const role = await acme.organization
      .related('roles')
      .create({ name: 'Finance', permissions: [] })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('roles.edit', { org: 'acme', role: role.id }))
    await page.getByRole('button', { name: 'Delete role', exact: true }).click()
    await page.assertVisible(page.getByText('Finance is deleted in every environment.'))
    await page.getByRole('button', { name: 'Yes, delete', exact: true }).click()

    await page.assertPath(route('roles.index', { org: 'acme' }))
    await page.assertVisible(page.getByText('No roles yet'))
    assert.lengthOf(await Role.all(), 0)
  })

  test("another organization's role is not found", async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const role = await globex.organization
      .related('roles')
      .create({ name: 'Payroll', permissions: [] })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('roles.index', { org: 'acme' }))
    const headers = await xsrfHeaders(page)
    const roleUrl = `/w/acme/roles/${role.id}`

    const edit = await page.request.get(`${roleUrl}/edit`)
    const update = await page.request.put(roleUrl, { headers, data: { name: 'Stolen' } })
    const remove = await page.request.delete(roleUrl, { headers })

    assert.equal(edit.status(), 404)
    assert.equal(update.status(), 404)
    assert.equal(remove.status(), 404)
  })
})
