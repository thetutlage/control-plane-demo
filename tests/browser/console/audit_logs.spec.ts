import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import App from '#models/app'
import { actions } from '#audit/actions'
import { auditStore } from '#audit/store'
import { Collector, Scope } from '#auditlogs/index'
import type Organization from '#models/organization'
import { setupApp, setupMember } from '#tests/helpers/oidc'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

/**
 * A scope that writes to an organization's audit log, as a request from
 * a browser would
 */
function scopeFor(organization: Organization) {
  return new Scope(actions, new Collector(auditStore), {
    organizationId: organization.id,
    requestId: 'req-1',
    ip: '203.0.113.7',
    userAgent: 'A test browser',
  })
}

/**
 * An organization with one event in each category: a member added and an
 * app registered, which belong to no environment, and a sign-in refused
 * in staging
 */
async function setupEvents(slug = 'acme') {
  const organization = await setupOnboardedOrganization({ slug })
  const sara = await setupMember(organization.organization)
  const setup = await setupApp(organization.staging)
  const invoices = await App.findOrFail(setup.appId)

  const scope = scopeFor(organization.organization)
  scope.record('access.member_added', organization.user, sara)
  scope.record('configuration.app_created', organization.user, invoices)
  scope
    .child(scope.writer, { environmentId: organization.staging.id })
    .record(
      'sign_in.refused',
      invoices,
      organization.staging,
      'password',
      'wrong_password',
      sara.email,
      sara
    )
  await scope.flush()

  return {
    ...organization,
    sara,
    added: `${organization.user.email} added sara@acme.test, to sign in with a password`,
    registered: `${organization.user.email} registered the app Invoices`,
    refused: 'Sign-in to Invoices in Staging was refused for sara@acme.test',
  }
}

test.group('Console audit logs', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an admin reads the organization’s events, newest first', async ({
    visit,
    route,
    assert,
    browserContext,
  }) => {
    const acme = await setupEvents()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('overview.show', { org: 'acme' }))
    await page.getByRole('link', { name: 'Audit logs', exact: true }).click()
    await page.assertPath(route('audit_logs.index', { org: 'acme' }))

    const rows = page.getByRole('row')
    await page.assertElementsCount(rows, 4)
    assert.deepEqual(await page.locator('.event > summary').allTextContents(), [
      acme.refused,
      acme.registered,
      acme.added,
    ])

    /**
     * Only the event of an environment is tagged with it
     */
    await page.assertVisible(rows.nth(1).getByText('Staging', { exact: true }))
    await page.assertNotExists(rows.nth(2).locator('.env-badge'))
  })

  test('an event opens to everything kept about it', async ({ visit, route, browserContext }) => {
    const acme = await setupEvents()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('audit_logs.index', { org: 'acme' }))
    const refused = page.getByRole('row').filter({ hasText: acme.refused })
    await page.assertNotVisible(refused.getByText('sign_in.refused', { exact: true }))

    await refused.getByText(acme.refused, { exact: true }).click()

    await page.assertVisible(refused.getByText('sign_in.refused', { exact: true }))
    await page.assertVisible(refused.getByText('Not a signed-in person', { exact: true }))
    await page.assertVisible(refused.getByText('wrong_password', { exact: true }))
    await page.assertVisible(refused.getByText('203.0.113.7', { exact: true }))
    await page.assertVisible(refused.getByText('A test browser', { exact: true }))
    await page.assertVisible(refused.getByText('req-1', { exact: true }))
  })

  test('the events are narrowed to a category, an environment, or both', async ({
    visit,
    route,
    assert,
    browserContext,
  }) => {
    const acme = await setupEvents()
    const summaries = () => page.locator('.event > summary').allTextContents()

    await browserContext.loginAs(acme.user)
    const page = await visit(route('audit_logs.index', { org: 'acme' }))

    await page.getByRole('link', { name: 'Access', exact: true }).click()
    await page.assertUrlContains('category=access')
    assert.deepEqual(await summaries(), [acme.added])

    await page.getByRole('link', { name: 'Sign-in', exact: true }).click()
    await page.assertUrlContains('category=sign_in')
    assert.deepEqual(await summaries(), [acme.refused])

    await page.getByRole('link', { name: 'Production', exact: true }).click()
    await page.assertUrlContains('environment=production')
    await page.assertUrlContains('category=sign_in')
    await page.assertVisible(page.getByText('Nothing was recorded that matches.', { exact: true }))

    await page.getByRole('link', { name: 'All', exact: true }).click()
    await page.getByRole('link', { name: 'Staging', exact: true }).click()
    await page.assertUrlContains('environment=staging')
    assert.deepEqual(await summaries(), [acme.refused])
  })

  test('older events are a page away, keeping the filters', async ({
    visit,
    route,
    assert,
    browserContext,
  }) => {
    const acme = await setupEvents()
    const scope = scopeFor(acme.organization)
    for (let sent = 0; sent < 51; sent++) {
      scope.record('access.password_setup_sent', acme.user, acme.sara)
    }
    await scope.flush()
    const summaries = () => page.locator('.event > summary').allTextContents()

    await browserContext.loginAs(acme.user)
    const page = await visit(
      route('audit_logs.index', { org: 'acme' }, { qs: { category: 'access' } })
    )
    await page.assertElementsCount(page.locator('.event'), 50)
    await page.assertNotExists(page.getByRole('link', { name: 'Newest events', exact: true }))

    await page.getByRole('link', { name: 'Older events', exact: true }).click()
    await page.assertUrlContains('before=')
    await page.assertUrlContains('category=access')
    assert.deepEqual(await summaries(), [
      `${acme.user.email} emailed sara@acme.test a link to set their password`,
      acme.added,
    ])
    await page.assertNotExists(page.getByRole('link', { name: 'Older events', exact: true }))

    await page.getByRole('link', { name: 'Newest events', exact: true }).click()
    await page.assertElementsCount(page.locator('.event'), 50)
  })

  test('an organization never sees another’s events', async ({
    visit,
    route,
    assert,
    browserContext,
  }) => {
    const acme = await setupEvents('acme')
    const globex = await setupOnboardedOrganization({ slug: 'globex' })

    await browserContext.loginAs(globex.user)
    const page = await visit(route('audit_logs.index', { org: 'globex' }))
    const visible = await page.locator('.event > summary').allTextContents()
    assert.notInclude(visible, acme.added)

    const response = await page.goto(route('audit_logs.index', { org: 'acme' }))
    assert.equal(response?.status(), 404)
  })
})
