import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { linkIn } from '#tests/helpers/mail'
import { MemberStatus } from '#values/member_status'
import { assertRecorded, auditEvents } from '#tests/helpers/audit'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import { setupConnectedProvider } from '#tests/helpers/identity_providers'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import ResetPasswordNotification from '#mails/reset_password_notification'
import {
  appCallback,
  authorizeUrl,
  exchangeCode,
  giveAccess,
  MEMBER,
  setupApp,
  setupMember,
  signIn,
  tokenRequest,
  visitIssuer,
} from '#tests/helpers/oidc'

/**
 * What the sign-in pages record. Sign-ins through the identity provider
 * are covered with the provider's own tests.
 */
test.group('Sign-in audit events', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a sign-in with a password is recorded, in its environment', async ({
    browserContext,
    assert,
  }) => {
    const { organization, staging } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(staging)
    const sara = await setupMember(organization)
    await giveAccess(sara, client)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, staging, client))
    const callback = appCallback(page, client.redirectUris[0])
    await signIn(page, MEMBER.email, MEMBER.password)
    await callback

    const [event] = await assertRecorded(organization, 'sign_in.succeeded', {
      count: 1,
      actor: MEMBER.email,
      subjects: [`member: ${MEMBER.email}`, 'app: Invoices'],
      summary: `${MEMBER.email} signed in to Invoices in Staging with a password`,
      data: { method: 'password' },
    })
    assert.equal(event.environmentId, staging.id)
    assert.equal(event.category, 'sign_in')
    assert.isNull(event.batchId)
  })

  test('each refused password is recorded with its real reason, behind the one message', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    await setupConnectedProvider(organization)
    await setupMember(organization)
    const others = [
      { email: 'suspended@acme.test', status: MemberStatus.SUSPENDED, password: 'correct-horse' },
      {
        email: 'via-provider@acme.test',
        status: MemberStatus.ACTIVE,
        signInMethod: MemberSignInMethod.PROVIDER,
      },
      { email: 'no-password@acme.test', status: MemberStatus.ACTIVE },
    ]
    for (const member of others) {
      await organization.createMember({ fullName: null, ...member })
    }

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, production, client))
    const attempts = [
      { email: 'nobody@acme.test', reason: 'unknown_email', known: false },
      { email: MEMBER.email, reason: 'wrong_password', known: true },
      { email: 'suspended@acme.test', reason: 'not_active', known: true },
      { email: 'via-provider@acme.test', reason: 'signs_in_with_the_provider', known: true },
      { email: 'no-password@acme.test', reason: 'no_password_set', known: true },
    ]
    for (const { email } of attempts) {
      await signIn(page, email, 'not-the-password')
      await page.assertVisible(page.getByText('Email or password is incorrect', { exact: true }))
      await page.reload()
    }

    for (const { email, reason, known } of attempts) {
      await assertRecorded(organization, 'sign_in.refused', {
        actor: null,
        subjects: ['app: Invoices', ...(known ? [`member: ${email}`] : [])],
        data: { method: 'password', reason, email },
      })
    }
    const refused = await auditEvents(organization, 'sign_in.refused')
    assert.lengthOf(refused, 5)
    assert.notInclude(JSON.stringify(refused), 'not-the-password', 'a password is never recorded')
  })

  test('a member with no access to the app is recorded as denied, once, and not as signed in', async ({
    browserContext,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    await setupMember(organization)

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, production, client))
    await signIn(page, MEMBER.email, MEMBER.password)
    await page.assertVisible(page.getByText("You don't have access to Invoices"))
    await page.reload()
    await page.assertVisible(page.getByText("You don't have access to Invoices"))

    await assertRecorded(organization, 'sign_in.succeeded', { count: 0 })
    await assertRecorded(organization, 'sign_in.access_denied', {
      count: 1,
      actor: MEMBER.email,
      subjects: [`member: ${MEMBER.email}`, 'app: Invoices'],
      summary: `${MEMBER.email} has no access to Invoices in Production`,
    })
  })

  test('a member already signed in is recorded for the second app too, without a sign-in page', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(production, 'invoices')
    const payroll = await setupApp(production, 'payroll')
    await giveAccess(await setupMember(organization), invoices, payroll)

    await visitIssuer(browserContext, organization, production, invoices)
    await visitIssuer(browserContext, organization, production, payroll)

    const events = await assertRecorded(organization, 'sign_in.succeeded', { count: 2 })
    await assertRecorded(organization, 'sign_in.succeeded', {
      subjects: [`member: ${MEMBER.email}`, 'app: Invoices'],
      data: { method: 'password' },
    })
    await assertRecorded(organization, 'sign_in.succeeded', {
      subjects: [`member: ${MEMBER.email}`, 'app: Payroll'],
      summary: `${MEMBER.email} signed in to Payroll in Production, already signed in`,
      data: { method: 'session' },
    })
    assert.isString(events[1].context.requestId)
    assert.equal(events[1].environmentId, production.id)
  })

  test('a token request an app gets wrong is recorded, with the app as the actor', async ({
    browserContext,
    assert,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(production, 'invoices')
    await giveAccess(await setupMember(organization), invoices)
    const code = await visitIssuer(browserContext, organization, production, invoices)

    const wrongSecret = await exchangeCode(organization, production, invoices, code, {
      secret: 'not-the-secret',
    })
    const first = await exchangeCode(organization, production, invoices, code)
    const usedTwice = await exchangeCode(organization, production, invoices, code)
    const unknownApp = await tokenRequest(
      organization,
      production,
      { clientId: 'nobody-we-know', secret: 'whatever' },
      { grant_type: 'authorization_code', code: 'a-code' }
    )

    assert.equal(wrongSecret.body.error, 'invalid_client')
    assert.equal(first.status, 200)
    assert.equal(usedTwice.body.error, 'invalid_grant')
    assert.equal(unknownApp.body.error, 'invalid_client')

    const refused = await assertRecorded(organization, 'sign_in.token_request_refused', {
      count: 2,
      actor: 'Invoices',
      subjects: ['app: Invoices'],
      summary: 'A token request from Invoices in Production was refused: invalid_client',
      data: { error: 'invalid_client', grantType: 'authorization_code' },
    })
    await assertRecorded(organization, 'sign_in.token_request_refused', {
      data: { error: 'invalid_grant', grantType: 'authorization_code' },
    })
    const stored = JSON.stringify(refused)
    assert.notInclude(stored, 'not-the-secret')
    assert.notInclude(stored, code)
    assert.equal(refused[0].actor?.type, 'app')
    assert.equal(refused[0].environmentId, production.id)
  })

  test('a sign-in an app starts wrongly is recorded, and an ordinary refusal is not', async ({
    browserContext,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const invoices = await setupApp(production, 'invoices')
    await setupMember(organization)

    const page = await browserContext.newPage()
    const wrong = new URL(authorizeUrl(organization, production, invoices))
    wrong.searchParams.set('redirect_uri', 'https://evil.test/callback')
    await page.goto(wrong.toString())
    await page.assertVisible(page.getByText('invalid_redirect_uri', { exact: true }))

    await assertRecorded(organization, 'sign_in.authorization_request_refused', {
      count: 1,
      actor: 'Invoices',
      subjects: ['app: Invoices'],
      data: { error: 'invalid_redirect_uri', redirectUri: 'https://evil.test/callback' },
    })

    /**
     * A member with no access going back to the app is `access_denied`
     * to the app, which is not the app getting anything wrong
     */
    const denied = appCallback(page, invoices.redirectUris[0])
    await page.goto(authorizeUrl(organization, production, invoices))
    await signIn(page, MEMBER.email, MEMBER.password)
    await page.getByRole('button', { name: /back/i }).click()
    await denied

    await assertRecorded(organization, 'sign_in.authorization_request_refused', { count: 1 })
    await assertRecorded(organization, 'sign_in.access_denied', { count: 1 })
  })

  test('asking for a reset link and setting the password are recorded, for members only', async ({
    visit,
    route,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupMember(acme.organization)
    const mailer = mail.fake()
    const origin = acme.staging.issuerOrigin('acme')

    const page = await visit(`${origin}${route('password_resets.create')}`)
    for (const email of ['nobody@acme.test', MEMBER.email]) {
      await page.getByLabel('Email', { exact: true }).fill(email)
      await page.getByRole('button', { name: 'Send link', exact: true }).click()
      await page.assertVisible(page.getByText('If that email signs in with a password', {}))
      await page.reload()
    }

    const [requested] = await assertRecorded(
      acme.organization,
      'sign_in.password_reset_requested',
      { count: 1, actor: MEMBER.email, subjects: [`member: ${MEMBER.email}`] }
    )
    assert.equal(requested.environmentId, acme.staging.id)

    const [reset] = mailer.mails.queued((queued) => queued instanceof ResetPasswordNotification)
    await page.goto(await linkIn(reset))
    await page.getByLabel('Password', { exact: true }).fill('a-new-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('a-new-password')
    await page.getByRole('button', { name: 'Set password', exact: true }).click()
    await page.assertVisible(page.getByRole('heading', { name: 'Password set' }))

    const everything = await auditEvents(acme.organization)
    await assertRecorded(acme.organization, 'sign_in.password_set', {
      count: 1,
      actor: MEMBER.email,
      subjects: [`member: ${MEMBER.email}`],
    })
    assert.notInclude(JSON.stringify(everything), 'a-new-password')
  })
})
