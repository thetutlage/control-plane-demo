import { BaseMail } from '@adonisjs/mail'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type { PasswordResetToken } from '@adonisplus/persona/password'
import type Member from '#models/member'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import { EnvironmentKind } from '#values/environment_kind'

/**
 * The link a member asked for from a sign-in page, to set a new password.
 * It points at the issuer host they asked on, and outside production the
 * subject starts with the environment's name.
 */
export default class ResetPasswordNotification extends BaseMail {
  subject: string

  constructor(
    public member: Member,
    public organization: Organization,
    public environment: Environment,
    public token: PasswordResetToken
  ) {
    super()
    const prefix =
      environment.kind === EnvironmentKind.PRODUCTION ? '' : `[${environment.name.toUpperCase()}] `
    this.subject = `${prefix}Reset your password for ${organization.name}`
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
      .htmlView('emails/reset_password_html', state)
      .textView('emails/reset_password_text', state)
  }
}
