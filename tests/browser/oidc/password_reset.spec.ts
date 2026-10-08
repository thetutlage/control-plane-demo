import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { linkIn } from '#tests/helpers/mail'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import SetPasswordNotification from '#mails/set_password_notification'
import ResetPasswordNotification from '#mails/reset_password_notification'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'
import {
  appCallback,
  authorizeUrl,
  giveAccess,
  MEMBER,
  setupApp,
  setupMember,
  signIn,
  visitIssuer,
} from '#tests/helpers/oidc'

const SENT = 'If that email signs in with a password, we sent it a link.'

/**
 * The link in the one email of a kind the mailer holds
 */
function linkQueued(
  mailer: ReturnType<typeof mail.fake>,
  kind: typeof SetPasswordNotification | typeof ResetPasswordNotification
) {
  const [queued] = mailer.mails.queued((candidate) => candidate instanceof kind)
  return linkIn(queued)
}

test.group('Password reset', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a member asks for a link from the sign-in page, sets a new password and signs in with it', async ({
    browserContext,
    assert,
    db,
  }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    const sara = await setupMember(organization)
    await giveAccess(sara, client)
    const mailer = mail.fake()

    const page = await browserContext.newPage()
    await page.goto(authorizeUrl(organization, production, client))
    await page.getByRole('link', { name: 'Forgot password?', exact: true }).click()
    await page.assertVisible(page.getByRole('heading', { name: 'Forgot password' }))
    await page.getByLabel('Email', { exact: true }).fill(MEMBER.email)
    await page.getByRole('button', { name: 'Send link', exact: true }).click()
    await page.assertVisible(page.getByText(SENT, { exact: true }))

    const [reset] = mailer.mails.queued((queued) => queued instanceof ResetPasswordNotification)
    reset.message.assertTo(MEMBER.email)
    reset.message.assertSubject('Reset your password for acme Inc.')
    const link = await linkIn(reset)
    assert.match(link, /^http:\/\/acme\.localhost:\d+\/password-resets\//)

    const linkPage = await browserContext.newPage()
    await linkPage.goto(link)
    await linkPage.assertVisible(linkPage.getByText(`for ${MEMBER.email} at acme Inc.`))
    await linkPage.getByLabel('Password', { exact: true }).fill('a-new-password')
    await linkPage.getByLabel('Confirm password', { exact: true }).fill('a-new-password')
    await linkPage.getByRole('button', { name: 'Set password', exact: true }).click()
    await linkPage.assertVisible(linkPage.getByRole('heading', { name: 'Password set' }))
    await db.assertEmpty('password_reset_tokens')

    await page.getByRole('link', { name: 'Back to sign in', exact: true }).click()
    await page.assertVisible(page.getByRole('heading', { name: 'Sign in to acme Inc.' }))
    await signIn(page, MEMBER.email, MEMBER.password)
    await page.assertVisible(page.getByText('Email or password is incorrect', { exact: true }))

    const callback = appCallback(page, client.redirectUris[0])
    await signIn(page, MEMBER.email, 'a-new-password')
    const { searchParams } = await callback
    assert.isNotEmpty(searchParams.get('code'))
  })

  test('a link works once', async ({ browserContext }) => {
    const { organization } = await setupOnboardedOrganization({ slug: 'acme' })
    const sara = await setupMember(organization)
    const mailer = mail.fake()
    await sara.sendPasswordSetup()
    const link = await linkQueued(mailer, SetPasswordNotification)

    const page = await browserContext.newPage()
    await page.goto(link)
    await page.getByLabel('Password', { exact: true }).fill('a-new-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('a-new-password')
    await page.getByRole('button', { name: 'Set password', exact: true }).click()
    await page.assertVisible(page.getByRole('heading', { name: 'Password set' }))

    await page.goto(link)
    await page.assertVisible(page.getByRole('heading', { name: 'This link no longer works' }))
    await page.assertNotExists(page.getByLabel('Password', { exact: true }))
    await page.getByRole('link', { name: 'Send me a new link', exact: true }).click()
    await page.assertVisible(page.getByRole('heading', { name: 'Forgot password' }))
  })

  test('a member added by an admin sets their first password from the email', async ({
    browserContext,
    assert,
  }) => {
    const { organization } = await setupOnboardedOrganization({ slug: 'acme' })
    const sara = await organization.createMember({
      email: 'sara@acme.test',
      fullName: 'Sara',
      status: MemberStatus.ACTIVE,
    })
    const mailer = mail.fake()
    await sara.sendPasswordSetup()

    const page = await browserContext.newPage()
    await page.goto(await linkQueued(mailer, SetPasswordNotification))
    await page.getByLabel('Password', { exact: true }).fill('my-first-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('my-first-password')
    await page.getByRole('button', { name: 'Set password', exact: true }).click()
    await page.assertVisible(page.getByRole('heading', { name: 'Password set' }))

    await sara.refresh()
    assert.isTrue(await sara.verifyPassword('my-first-password'))
  })

  test('setting a password signs the member out everywhere', async ({ browserContext, db }) => {
    const { organization, production } = await setupOnboardedOrganization({ slug: 'acme' })
    const client = await setupApp(production)
    const sara = await setupMember(organization)
    await giveAccess(sara, client)
    await visitIssuer(browserContext, organization, production, client)
    await db.assertCount('oidc_sessions', 1)
    const mailer = mail.fake()
    await sara.sendPasswordSetup()

    const page = await browserContext.newPage()
    await page.goto(await linkQueued(mailer, SetPasswordNotification))
    await page.getByLabel('Password', { exact: true }).fill('a-new-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('a-new-password')
    await page.getByRole('button', { name: 'Set password', exact: true }).click()
    await page.assertVisible(page.getByRole('heading', { name: 'Password set' }))

    await db.assertEmpty('oidc_sessions')
    await db.assertEmpty('oidc_grants')
  })

  test('the two passwords must match, and be long enough', async ({ browserContext, assert }) => {
    const { organization } = await setupOnboardedOrganization({ slug: 'acme' })
    const sara = await setupMember(organization)
    const mailer = mail.fake()
    await sara.sendPasswordSetup()

    const page = await browserContext.newPage()
    await page.goto(await linkQueued(mailer, SetPasswordNotification))
    await page.getByLabel('Password', { exact: true }).fill('a-new-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('another-password')
    await page.getByRole('button', { name: 'Set password', exact: true }).click()
    await page.assertVisible(page.getByText('The two passwords must match', { exact: true }))

    await page.getByLabel('Password', { exact: true }).fill('short')
    await page.getByLabel('Confirm password', { exact: true }).fill('short')
    await page.getByRole('button', { name: 'Set password', exact: true }).click()
    await page.assertVisible(page.getByText('The password field must have at least 8 characters'))

    await sara.refresh()
    assert.isTrue(await sara.verifyPassword(MEMBER.password))
  })

  test('the answer is the same for an email that gets no link', async ({ visit, route, db }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    await acme.organization.createMember({
      email: 'via-provider@acme.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
      signInMethod: MemberSignInMethod.PROVIDER,
    })
    await acme.organization.createMember({
      email: 'suspended@acme.test',
      fullName: null,
      status: MemberStatus.SUSPENDED,
    })
    await globex.organization.createMember({
      email: 'elsewhere@globex.test',
      fullName: null,
      status: MemberStatus.ACTIVE,
    })
    const mailer = mail.fake()
    const origin = acme.production.issuerOrigin('acme')

    const page = await visit(`${origin}${route('password_resets.create')}`)
    for (const email of [
      'nobody@acme.test',
      'via-provider@acme.test',
      'suspended@acme.test',
      'elsewhere@globex.test',
    ]) {
      await page.getByLabel('Email', { exact: true }).fill(email)
      await page.getByRole('button', { name: 'Send link', exact: true }).click()
      await page.assertVisible(page.getByText(SENT, { exact: true }))
      await page.reload()
    }

    mailer.mails.assertNoneQueued()
    await db.assertEmpty('password_reset_tokens')
  })

  test('asking twice within a minute sends one email', async ({ visit, route }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupMember(acme.organization)
    const mailer = mail.fake()

    const page = await visit(
      `${acme.production.issuerOrigin('acme')}${route('password_resets.create')}`
    )
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.getByLabel('Email', { exact: true }).fill(MEMBER.email)
      await page.getByRole('button', { name: 'Send link', exact: true }).click()
      await page.assertVisible(page.getByText(SENT, { exact: true }))
      await page.reload()
    }

    mailer.mails.assertQueuedCount(ResetPasswordNotification, 1)
  })

  test('a link asked for in staging points at staging, and says so', async ({
    visit,
    route,
    assert,
  }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    await setupMember(acme.organization)
    const mailer = mail.fake()

    const page = await visit(
      `${acme.staging.issuerOrigin('acme')}${route('password_resets.create')}`
    )
    await page.assertVisible(page.getByRole('note'))
    await page.getByLabel('Email', { exact: true }).fill(MEMBER.email)
    await page.getByRole('button', { name: 'Send link', exact: true }).click()
    await page.assertVisible(page.getByText(SENT, { exact: true }))

    const [reset] = mailer.mails.queued((queued) => queued instanceof ResetPasswordNotification)
    reset.message.assertSubject('[STAGING] Reset your password for acme Inc.')
    assert.match(await linkIn(reset), /^http:\/\/acme--staging\.localhost:\d+\/password-resets\//)
  })

  test("a link does not work on another organization's host", async ({ browserContext }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const globex = await setupOnboardedOrganization({ slug: 'globex' })
    const sara = await setupMember(acme.organization)
    const mailer = mail.fake()
    await sara.sendPasswordSetup()
    const link = await linkQueued(mailer, SetPasswordNotification)

    const page = await browserContext.newPage()
    await page.goto(
      link.replace(acme.production.issuerOrigin('acme'), globex.production.issuerOrigin('globex'))
    )
    await page.assertVisible(page.getByRole('heading', { name: 'This link no longer works' }))
  })

  test('a link stops working once the member is switched to the identity provider', async ({
    browserContext,
    db,
  }) => {
    const { organization } = await setupOnboardedOrganization({ slug: 'acme' })
    const sara = await setupMember(organization)
    const mailer = mail.fake()
    await sara.sendPasswordSetup()
    const link = await linkQueued(mailer, SetPasswordNotification)

    await sara.signInWith(MemberSignInMethod.PROVIDER)

    await db.assertEmpty('password_reset_tokens')
    const page = await browserContext.newPage()
    await page.goto(link)
    await page.assertVisible(page.getByRole('heading', { name: 'This link no longer works' }))
  })
})
