import { errors } from 'oidc-provider'
import hash from '@adonisjs/core/services/hash'
import { MemberStatus } from '#values/member_status'
import type { HttpContext } from '@adonisjs/core/http'
import { memberLoginValidator } from '#validators/member'
import { EnvironmentKind } from '#values/environment_kind'

/**
 * The issuer's sign-in page. When an app sends a member to `/oauth/auth` and
 * they have no session with the issuer yet, oidc-provider pauses that
 * request and sends them here with its ID. oidc-provider calls a paused
 * request an "interaction"; we call it a sign-in.
 */
export default class SignInController {
  async show(ctx: HttpContext) {
    const signIn = await this.#pendingSignIn(ctx)
    const { issuer, inertia } = ctx

    const app = await issuer.environment
      .related('apps')
      .query()
      .where('client_id', String(signIn.params.client_id))
      .firstOrFail()

    return inertia.render('sign_in/show', {
      signInId: signIn.uid,
      organizationName: issuer.environment.organization.name,
      environmentName: issuer.environment.name,
      isProduction: issuer.environment.kind === EnvironmentKind.PRODUCTION,
      appName: app.name,
    })
  }

  /**
   * Checks the member's credentials within the issuer's environment and
   * finishes the sign-in. Every failure gets the same message, so the page
   * never reveals whether an email has an account. Unknown emails still pay
   * for a hash, so they take as long as a wrong password.
   */
  async store(ctx: HttpContext) {
    await this.#pendingSignIn(ctx)
    const { issuer, inertia, request, response, session } = ctx
    const { email, password } = await request.validateUsing(memberLoginValidator)

    const member = await issuer.environment.related('members').query().where('email', email).first()

    let signedIn = false
    if (member?.password && member.status === MemberStatus.ACTIVE) {
      signedIn = await member.verifyPassword(password)
    } else {
      await hash.make(password)
    }

    if (!member || !signedIn) {
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
    return inertia.location(returnTo)
  }

  /**
   * The paused request this page is for. `interactionDetails` finds it
   * through a cookie oidc-provider set in this browser, and throws
   * `SessionNotFound` when the cookie is missing or the sign-in has expired.
   * The ID in the URL must be the same one, so a page left open from an
   * older attempt cannot finish a newer one.
   */
  async #pendingSignIn({ issuer, request, response, params }: HttpContext) {
    const signIn = await issuer.provider.interactionDetails(request.request, response.response)
    if (signIn.uid !== params.signInId) {
      throw new errors.SessionNotFound('the sign-in in the URL is not the one in progress')
    }
    return signIn
  }
}
