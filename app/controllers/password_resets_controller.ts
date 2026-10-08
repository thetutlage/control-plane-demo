import { Secret } from '@adonisjs/core/helpers'
import { events } from '#generated/events'
import mail from '@adonisjs/mail/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import Member from '#models/member'
import { MemberStatus } from '#values/member_status'
import { EnvironmentKind } from '#values/environment_kind'
import { MemberSignInMethod } from '#values/member_sign_in_method'
import ResetPasswordNotification from '#mails/reset_password_notification'
import { requestPasswordResetValidator, setPasswordValidator } from '#validators/member'

/**
 * A member's way to a new password, on the issuer's host: they ask for a
 * link by email, and set the password from it. The same link, sent by an
 * admin's action, is how a member sets their first password. Only members
 * of the issuer's organization who sign in with a password are served.
 */
export default class PasswordResetsController {
  /**
   * What every page here says about where the member is
   */
  #place({ issuer }: HttpContext) {
    return {
      organizationName: issuer.environment.organization.name,
      environmentName: issuer.environment.name,
      isProduction: issuer.environment.kind === EnvironmentKind.PRODUCTION,
    }
  }

  /**
   * The member a link belongs to, or null when the link is unknown, used
   * or expired, or its member can no longer set a password here
   */
  async #memberFor({ issuer, params }: HttpContext) {
    const token = await Member.passwordResetTokens.verify(new Secret(String(params.token)))
    if (!token) {
      return null
    }

    return issuer.environment.organization
      .related('members')
      .query()
      .where('id', String(token.tokenableId))
      .where('status', MemberStatus.ACTIVE)
      .where('sign_in_method', MemberSignInMethod.PASSWORD)
      .first()
  }

  /**
   * The form asking for the member's email. The sign-in page links here
   * with its sign-in's ID, used only to link back to it.
   */
  async create(ctx: HttpContext) {
    const signInId = ctx.request.input('sign_in')

    return ctx.inertia.render('password_resets/create', {
      ...this.#place(ctx),
      signInId: typeof signInId === 'string' && /^[\w-]{1,64}$/.test(signInId) ? signInId : null,
    })
  }

  /**
   * Emails the link to a member who signs in with a password, at most
   * once a minute. The answer is the same for every email, so the form
   * never reveals who is a member or how they sign in.
   */
  async store({ issuer, request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(requestPasswordResetValidator)
    const { environment } = issuer

    const member = await environment.organization
      .related('members')
      .query()
      .where('email', email)
      .where('status', MemberStatus.ACTIVE)
      .where('sign_in_method', MemberSignInMethod.PASSWORD)
      .first()

    const token = await member?.createPasswordResetToken(true, '1 minute')
    if (member && token) {
      await mail.sendLater(
        new ResetPasswordNotification(member, environment.organization, environment, token)
      )
    }

    session.flash('success', 'If that email signs in with a password, we sent it a link.')
    return response.redirect().back()
  }

  /**
   * The form to set a new password, opened from the emailed link. A link
   * that no longer works gets a page saying so, or, right after it was
   * used, one saying the password is set.
   */
  async show(ctx: HttpContext) {
    const { inertia, params, session } = ctx
    const member = await this.#memberFor(ctx)

    return inertia.render('password_resets/show', {
      ...this.#place(ctx),
      token: String(params.token),
      email: member?.email ?? null,
      passwordSet: session.flashMessages.get('passwordSet') === true,
    })
  }

  /**
   * Sets the member's password. Their other links stop working, and they
   * are signed out everywhere, so nobody stays signed in on the old
   * password.
   */
  async update(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const { password } = await request.validateUsing(setPasswordValidator)

    const member = await this.#memberFor(ctx)
    if (member) {
      member.password = password
      await member.save()
      await member.clearPasswordResetTokens()
      await member.signOutEverywhere()
      await events.MemberPasswordSet.dispatch(member)
      session.flash('passwordSet', true)
    }

    return response.redirect().toRoute('password_resets.show', { token: params.token })
  }
}
