import vine from '@vinejs/vine'

/**
 * Metadata the role validator reads: the organization, for unique names,
 * the role being edited, if any, and the keys a role may hold
 */
type RoleMetaData = { organizationId: number; roleId?: number; allowedKeys: string[] }

/**
 * Validator to use when creating or editing a role. Its name is unique
 * within the organization. Its keys come from the catalogue, plus, when
 * editing, keys the role already holds that have since left the catalogue:
 * those stay until the admin unticks them.
 */
export const roleValidator = vine.withMetaData<RoleMetaData>().create({
  name: vine
    .string()
    .trim()
    .minLength(2)
    .maxLength(100)
    .unique({
      table: 'roles',
      column: 'name',
      filter: (db, _value, field) => {
        db.where('organization_id', field.meta.organizationId)
        if (field.meta.roleId) {
          db.whereNot('id', field.meta.roleId)
        }
      },
    }),
  description: vine.string().trim().maxLength(500).nullable(),
  permissions: vine
    .array(vine.string().in((field) => (field.meta as RoleMetaData).allowedKeys))
    .distinct()
    .optional(),
})
