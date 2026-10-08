import vine, { SimpleMessagesProvider } from '@vinejs/vine'

/**
 * Validator to use when an admin adds a member, with how they sign in:
 * the organization's identity provider, or a password, which the member
 * sets themselves from an email. Emails are unique within the
 * organization.
 */
export const createMemberValidator = vine.withMetaData<{ organizationId: number }>().create({
  fullName: vine.string().trim().maxLength(100).nullable(),
  email: vine
    .string()
    .trim()
    .email()
    .maxLength(254)
    .unique({
      table: 'members',
      column: 'email',
      filter: (db, _value, field) => {
        db.where('organization_id', field.meta.organizationId)
      },
    }),
  signsInWith: vine.enum(['provider', 'password']),
})

/**
 * Validator to use on an issuer's login page, before checking the member's
 * credentials
 */
export const memberLoginValidator = vine.create({
  email: vine.string().trim().email(),
  password: vine.string(),
})

/**
 * Validator to use when a member asks for a link to reset their password
 */
export const requestPasswordResetValidator = vine.create({
  email: vine.string().trim().email().maxLength(254),
})

/**
 * Validator to use when a member sets their password from an emailed link
 */
export const setPasswordValidator = vine.create({
  password: vine
    .string()
    .minLength(8)
    .maxLength(32)
    .confirmed({ confirmationField: 'passwordConfirmation' }),
})
setPasswordValidator.messagesProvider = new SimpleMessagesProvider({
  'passwordConfirmation.confirmed': 'The two passwords must match',
  'password.confirmed': 'The two passwords must match',
})
