import type { HttpContext } from '@adonisjs/core/http'

/**
 * A member's sessions: the browsers they're signed in on
 */
export default class MemberSessionsController {
  /**
   * Signs the member out of every app, on every browser
   */
  async destroy({ response, session, params, organization, environment }: HttpContext) {
    const member = await environment
      .related('members')
      .query()
      .where('id', params.member)
      .firstOrFail()
    await member.signOutEverywhere()

    session.flash('success', `${member.email} is signed out everywhere.`)
    return response.redirect().toRoute('members.show', {
      org: organization.slug,
      environment: environment.slug,
      member: member.id,
    })
  }
}
