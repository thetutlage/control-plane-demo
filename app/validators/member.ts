import vine from '@vinejs/vine'

/**
 * Validator to use when an admin adds a member to an environment, with the
 * password they sign in with. Emails are unique within the environment.
 */
export const createMemberValidator = vine.withMetaData<{ environmentId: number }>().create({
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
        db.where('environment_id', field.meta.environmentId)
      },
    }),
  password: vine.string().minLength(8).maxLength(32),
})

/**
 * Validator to use on an issuer's login page, before checking the member's
 * credentials
 */
export const memberLoginValidator = vine.create({
  email: vine.string().trim().email(),
  password: vine.string(),
})
