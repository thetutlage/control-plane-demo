import type { HttpContext } from '@adonisjs/core/http'

/**
 * A member's sessions: the browsers they're signed in on
 */
export default class MemberSessionsController {
  /**
   * Signs the member out of every app, on every browser, in every
   * environment
   */
  async destroy({ response, session, params, organization }: HttpContext) {
    const member = await organization
      .related('members')
      .query()
      .where('id', params.member)
      .firstOrFail()
    await member.signOutEverywhere()

    session.flash('success', `${member.email} is signed out everywhere.`)
    return response
      .redirect()
      .toRoute('members.show', { org: organization.slug, member: member.id })
  }
}
