import { BaseMail } from '@adonisjs/mail'
import type Member from '#models/member'
import type Organization from '#models/organization'

/**
 * Tells a member an admin set them to sign in with the organization's
 * identity provider. It carries no link: they sign in from an app.
 */
export default class ProviderSignInNotification extends BaseMail {
  subject: string

  constructor(
    public member: Member,
    public organization: Organization
  ) {
    super()
    this.subject = `You sign in to ${organization.name} with your company account`
  }

  prepare() {
    const state = { title: this.subject, organizationName: this.organization.name }

    this.message
      .to(this.member.email)
      .htmlView('emails/provider_sign_in_html', state)
      .textView('emails/provider_sign_in_text', state)
  }
}
