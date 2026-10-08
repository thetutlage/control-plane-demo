import { BaseMail } from '@adonisjs/mail'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type { PasswordResetToken } from '@adonisplus/persona/password'
import type Member from '#models/member'
import type Environment from '#models/environment'
import type Organization from '#models/organization'

/**
 * Tells a member an admin set them to sign in with a password, with the
 * link to set one. Sent when they are added, switched to a password, or
 * the organization's identity provider is removed.
 */
export default class SetPasswordNotification extends BaseMail {
  subject: string

  constructor(
    public member: Member,
    public organization: Organization,
    public environment: Environment,
    public token: PasswordResetToken
  ) {
    super()
    this.subject = `Set your password for ${organization.name}`
  }

  prepare() {
    const state = {
      title: this.subject,
      organizationName: this.organization.name,
      link: urlFor('password_resets.show', [this.token.value!.release()], {
        prefixUrl: this.environment.issuerOrigin(this.organization.slug),
      }),
    }

    this.message
      .to(this.member.email)
      .htmlView('emails/set_password_html', state)
      .textView('emails/set_password_text', state)
  }
}
