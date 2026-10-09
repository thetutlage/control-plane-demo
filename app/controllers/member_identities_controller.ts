import { auditedTransaction } from '#audit/transaction'
import type { HttpContext } from '@adonisjs/core/http'
import MemberIdentity from '#models/member_identity'

/**
 * A member's account at the organization's identity provider
 */
export default class MemberIdentitiesController {
  /**
   * Dissociates the member from the account. They stay a member with the
   * same roles, set to sign in with the provider, and are signed out
   * everywhere. Their next sign-in through the provider is matched by
   * email again, for when their account there was deleted and recreated.
   */
  async destroy({ response, session, auth, audit, params, organization }: HttpContext) {
    const member = await organization
      .related('members')
      .query()
      .where('id', params.member)
      .firstOrFail()
    const identity = await MemberIdentity.query()
      .where('id', params.identity)
      .where('member_id', member.id)
      .firstOrFail()

    await auditedTransaction(audit, async (trx, batch) => {
      await identity.useTransaction(trx).delete()
      await member.useTransaction(trx).signOutEverywhere()
      batch.record('access.identity_dissociated', auth.getUserOrFail(), member, identity.subject)
    })

    session.flash(
      'success',
      `Dissociated ${member.email} from their account at your identity provider.`
    )
    return response.redirect().back()
  }
}
