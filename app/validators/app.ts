import vine from '@vinejs/vine'

/**
 * Validator to use when registering an app. The slug is part of the app's
 * console URL (`/w/acme/apps/invoices`), so it follows the same rules as an
 * organization slug and is unique within the organization. `create` is
 * taken by the registration page itself.
 */
export const createAppValidator = vine.withMetaData<{ organizationId: number }>().create({
  name: vine.string().trim().minLength(2).maxLength(100),
  slug: vine
    .string()
    .trim()
    .toLowerCase()
    .minLength(2)
    .maxLength(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .notIn(['create'])
    .unique({
      table: 'apps',
      column: 'slug',
      filter: (db, _value, field) => {
        db.where('organization_id', field.meta.organizationId)
      },
    }),
})
