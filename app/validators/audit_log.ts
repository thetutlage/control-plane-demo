import vine from '@vinejs/vine'

/**
 * Validator for the query string of the audit log page: the category
 * tab, the environment's slug, and the ID of the last event on the page
 * before, to read the events older than it
 */
export const auditLogFiltersValidator = vine.create({
  category: vine.enum(['access', 'sign_in', 'configuration']).optional(),
  environment: vine.string().optional(),
  before: vine.string().uuid().optional(),
})
