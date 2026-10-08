import { events } from '#generated/events'
import type { HttpContext } from '@adonisjs/core/http'
import { MemberSignInMethod } from '#values/member_sign_in_method'

/**
 * The links to set a password that an admin sends a member
 */
export default class MemberPasswordResetsController {
  /**
   * Emails the member the link to set their password from, again. Links
   * sent before stop working. A member who signs in with the identity
   * provider has no password to set.
   */
  async store({ response, session, auth, params, organization }: HttpContext) {
    const member = await organization
      .related('members')
      .query()
      .where('id', params.member)
      .firstOrFail()

    if (member.signInMethod !== MemberSignInMethod.PASSWORD) {
      session.flash('error', `${member.email} signs in with your identity provider.`)
      return response.redirect().back()
    }

    await member.sendPasswordSetup()
    await events.MemberPasswordSetupSent.dispatch(member, auth.getUserOrFail())

    session.flash('success', `Emailed ${member.email} a link to set their password.`)
    return response.redirect().back()
  }
}
