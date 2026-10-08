import vine from '@vinejs/vine'

/**
 * Validator to use when an admin adds a member, with how they sign in:
 * the organization's identity provider, or a password, which is then
 * required. Emails are unique within the organization.
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
  password: vine
    .string()
    .minLength(8)
    .maxLength(32)
    .optional()
    .requiredWhen('signsInWith', '=', 'password'),
})

/**
 * Validator to use on an issuer's login page, before checking the member's
 * credentials
 */
export const memberLoginValidator = vine.create({
  email: vine.string().trim().email(),
  password: vine.string(),
})
