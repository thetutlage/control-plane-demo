import vine from '@vinejs/vine'

/**
 * Metadata the app member validators read: the organization the member
 * and roles must belong to
 */
type AppMemberMetaData = { organizationId: number }

/**
 * Validator to use when giving a member access to an app in an
 * environment: the member, and one or more of the organization's roles
 * they hold on it
 */
export const createAppMemberValidator = vine.withMetaData<AppMemberMetaData>().create({
  memberId: vine
    .number()
    .withoutDecimals()
    .exists({
      table: 'members',
      column: 'id',
      filter: (db, _value, field) => {
        db.where('organization_id', field.meta.organizationId)
      },
    }),
  roleIds: vine
    .array(
      vine
        .number()
        .withoutDecimals()
        .exists({
          table: 'roles',
          column: 'id',
          filter: (db, _value, field) => {
            db.where('organization_id', (field.meta as AppMemberMetaData).organizationId)
          },
        })
    )
    .minLength(1)
    .distinct(),
})

/**
 * Validator to use when changing the roles a member holds on an app. An
 * app member always holds at least one.
 */
export const updateAppMemberValidator = vine.withMetaData<AppMemberMetaData>().create({
  roleIds: vine
    .array(
      vine
        .number()
        .withoutDecimals()
        .exists({
          table: 'roles',
          column: 'id',
          filter: (db, _value, field) => {
            db.where('organization_id', (field.meta as AppMemberMetaData).organizationId)
          },
        })
    )
    .minLength(1)
    .distinct(),
})
