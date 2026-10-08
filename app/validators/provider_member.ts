import vine from '@vinejs/vine'

/**
 * Validator to use when switching members to the identity provider. The
 * controller only acts on IDs that are the organization's own members.
 */
export const createProviderMembersValidator = vine.create({
  memberIds: vine.array(vine.number().positive()).notEmpty().maxLength(1000).distinct(),
})
