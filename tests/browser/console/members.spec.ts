import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { MemberStatus } from '#values/member_status'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

test.group('Console members', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an admin adds a member who can sign in right away', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.index', { org: 'acme', environment: 'staging' }))
    await page.getByRole('link', { name: 'Add member', exact: true }).click()
    await page.getByLabel('Full name', { exact: true }).fill('Sara Lee')
    await page.getByLabel('Email', { exact: true }).fill('sara@acme.test')
    await page.getByLabel('Password', { exact: true }).fill('correct-horse')
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertPath(route('members.index', { org: 'acme', environment: 'staging' }))
    await page.assertVisible(page.getByRole('cell', { name: 'sara@acme.test', exact: true }))

    const member = await acme.staging.related('members').query().firstOrFail()
    assert.equal(member.status, MemberStatus.ACTIVE)
    assert.notEqual(member.password, 'correct-horse', 'the password must be hashed')
    assert.isTrue(await member.verifyPassword('correct-horse'))
  })

  test('an email can be added once per environment', async ({ visit, route, browserContext }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await acme.staging.createMember({
      email: 'sara@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })

    await browserContext.loginAs(acme.user)
    const page = await visit(route('members.create', { org: 'acme', environment: 'staging' }))
    await page.getByLabel('Email', { exact: true }).fill('sara@acme.test')
    await page.getByLabel('Password', { exact: true }).fill('correct-horse')
    await page.getByRole('button', { name: 'Add member', exact: true }).click()

    await page.assertVisible(page.getByText('The email has already been taken'))
  })
})
