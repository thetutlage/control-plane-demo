import hash from '@adonisjs/core/services/hash'
import Member from '#models/member'
import { appOf, pendingSignIn } from '#oidc/pending_sign_in'
import { MemberStatus } from '#values/member_status'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import type { HttpContext } from '@adonisjs/core/http'
import { memberLoginValidator } from '#validators/member'
import { EnvironmentKind } from '#values/environment_kind'

/**
 * The issuer's sign-in page. When an app sends a member to `/oauth/auth` and
 * they have no session with the issuer yet, oidc-provider pauses that
 * request and sends them here with its ID. oidc-provider calls a paused
 * request an "interaction"; we call it a sign-in.
 *
 * A signed-in member without access to the app is sent here too, because
 * no grant is created for them and oidc-provider asks for consent instead
 * (`loadExistingGrant` in `createProvider`). The page then says they don't
 * have access.
 */
export default class SignInController {
  async show(ctx: HttpContext) {
    const signIn = await pendingSignIn(ctx)
    const { issuer, inertia, audit } = ctx
    const app = await appOf(issuer.environment, signIn)

    const props = {
      signInId: signIn.uid,
      organizationName: issuer.environment.organization.name,
      environmentName: issuer.environment.name,
      isProduction: issuer.environment.kind === EnvironmentKind.PRODUCTION,
      appName: app.name,
    }
    if (signIn.prompt.name === 'consent') {
      /**
       * Recorded each time the page is shown, so reloading it records
       * it again
       */
      const member = signIn.session
        ? await Member.findActive(issuer.environment, signIn.session.accountId)
        : null
      if (member) {
        audit.record('sign_in.access_denied', member, app, issuer.environment)
      }
      return inertia.render('sign_in/no_access', props)
    }

    /**
     * With an identity provider connected, the page offers it above the
     * password form
     */
    const identityProvider = await issuer.environment.organization
      .related('identityProviders')
      .query()
      .first()
    return inertia.render('sign_in/show', {
      ...props,
      providerSignIn: identityProvider !== null,

      /**
       * The member is here because their sign-in through the provider is
       * over a day old. The page sends them straight back through it.
       */
      providerRecheck:
        identityProvider !== null && signIn.prompt.reasons.includes('provider_recheck'),
    })
  }

  /**
   * Ends a sign-in the member can't finish, because they have no access
   * to the app: the app is told `access_denied`, the standard error for a
   * refused sign-in, and shows it however it likes
   */
  async destroy(ctx: HttpContext) {
    await pendingSignIn(ctx)
    const { issuer, inertia, request, response } = ctx

    const returnTo = await issuer.provider.interactionResult(
      request.request,
      response.response,
      { error: 'access_denied', error_description: 'the member has no access to this app' },
      { mergeWithLastSubmission: false }
    )
    return inertia.location(returnTo)
  }

  /**
   * Checks the member's credentials within the issuer's organization and
   * finishes the sign-in. A member set to sign in with the identity
   * provider is refused here, whatever password they have. Every failure
   * gets the same message, so the page never reveals whether an email has
   * an account; the audit log keeps the real reason. Unknown emails still
   * pay for a hash, so they take as long as a wrong password.
   */
  async store(ctx: HttpContext) {
    const signIn = await pendingSignIn(ctx)
    const { issuer, inertia, request, response, session, audit } = ctx
    const app = await appOf(issuer.environment, signIn)
    const { email, password } = await request.validateUsing(memberLoginValidator)

    const member = await issuer.environment.organization
      .related('members')
      .query()
      .where('email', email)
      .first()

    let signedIn = false
    if (
      member?.password &&
      member.status === MemberStatus.ACTIVE &&
      member.signInMethod === MemberSignInMethod.PASSWORD
    ) {
      signedIn = await member.verifyPassword(password)
    } else {
      await hash.make(password)
    }

    if (!member || !signedIn) {
      const reason = !member
        ? 'unknown_email'
        : member.status !== MemberStatus.ACTIVE
          ? 'not_active'
          : member.signInMethod !== MemberSignInMethod.PASSWORD
            ? 'signs_in_with_the_provider'
            : !member.password
              ? 'no_password_set'
              : 'wrong_password'
      audit.record('sign_in.refused', app, issuer.environment, 'password', reason, email, member)

      session.flash('error', 'Email or password is incorrect')
      return response.redirect().back()
    }

    /**
     * `interactionResult` records who signed in and returns the URL of the
     * paused request. Visiting it lets oidc-provider finish the request and
     * redirect the browser to the app. It must be a full page visit, since
     * the app is on another origin.
     */
    const returnTo = await issuer.provider.interactionResult(
      request.request,
      response.response,
      { login: { accountId: String(member.actorId) } },
      { mergeWithLastSubmission: false }
    )
    audit.record('sign_in.succeeded', member, app, issuer.environment, 'password')
    return inertia.location(returnTo)
  }
}
