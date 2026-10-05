import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

test.group('Signup', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates the user, the organization and its environments, then opens the console', async ({
    visit,
    route,
    db,
  }) => {
    const page = await visit(route('new_account.create'))
    await page.getByLabel('Company name', { exact: true }).fill('Acme Inc.')
    await page.getByLabel('Login address', { exact: true }).fill('acme')
    await page.getByLabel('Full name', { exact: true }).fill('Ada Lovelace')
    await page.getByLabel('Email', { exact: true }).fill('ada@acme.test')
    await page.getByLabel('Password', { exact: true }).fill('secret1234')
    await page.getByLabel('Confirm password', { exact: true }).fill('secret1234')
    await page.getByRole('button', { name: 'Create organization', exact: true }).click()

    await page.assertPath(route('overview.show', { org: 'acme' }))

    await db.assertHas('users', { email: 'ada@acme.test' })
    await db.assertHas('organizations', { slug: 'acme', name: 'Acme Inc.' })
    await db.assertCount('environments', 3)
    await db.assertCount('user_orgs', 1)
    await db.assertEmpty('permission_catalogs')
  })

  test('rejects a login address with consecutive dashes', async ({ visit, route, db }) => {
    const page = await visit(route('new_account.create'))
    await page.getByLabel('Company name', { exact: true }).fill('Acme Inc.')
    await page.getByLabel('Login address', { exact: true }).fill('acme--staging')
    await page.getByLabel('Email', { exact: true }).fill('ada@acme.test')
    await page.getByLabel('Password', { exact: true }).fill('secret1234')
    await page.getByLabel('Confirm password', { exact: true }).fill('secret1234')
    await page.getByRole('button', { name: 'Create organization', exact: true }).click()

    await page.assertVisible(
      page.getByText('The organizationSlug field format is invalid', { exact: true })
    )
    await db.assertCount('organizations', 0)
  })

  test('rejects a login address another organization already uses', async ({
    visit,
    route,
    db,
  }) => {
    await setupOnboardedOrganization({ slug: 'acme' })

    const page = await visit(route('new_account.create'))
    await page.getByLabel('Company name', { exact: true }).fill('Another Acme')
    await page.getByLabel('Login address', { exact: true }).fill('acme')
    await page.getByLabel('Email', { exact: true }).fill('someone@else.test')
    await page.getByLabel('Password', { exact: true }).fill('secret1234')
    await page.getByLabel('Confirm password', { exact: true }).fill('secret1234')
    await page.getByRole('button', { name: 'Create organization', exact: true }).click()

    await page.assertVisible(
      page.getByText('The organizationSlug has already been taken', { exact: true })
    )
    await db.assertCount('organizations', 1)
  })

  test('rejects an email that already has a control plane account', async ({
    visit,
    route,
    db,
  }) => {
    await setupOnboardedOrganization({ slug: 'acme', email: 'ada@acme.test' })

    const page = await visit(route('new_account.create'))
    await page.getByLabel('Company name', { exact: true }).fill('Second Company')
    await page.getByLabel('Login address', { exact: true }).fill('second')
    await page.getByLabel('Email', { exact: true }).fill('ada@acme.test')
    await page.getByLabel('Password', { exact: true }).fill('secret1234')
    await page.getByLabel('Confirm password', { exact: true }).fill('secret1234')
    await page.getByRole('button', { name: 'Create organization', exact: true }).click()

    await page.assertVisible(page.getByText('The email has already been taken', { exact: true }))
    await db.assertCount('users', 1)
    await db.assertCount('organizations', 1)
  })
})
