import vine from '@vinejs/vine'
import { clientUrl, type ClientUrlMetaData } from '#validators/rules/client_url'
import { redirectUriLines, redirectUriList } from '#validators/rules/redirect_uri_list'

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

/**
 * Validator to use when setting an app up in an environment or editing its
 * setup: where it runs and where members may be sent, checked against the
 * environment (`meta.isProduction`)
 */
export const appEnvironmentValidator = vine.withMetaData<ClientUrlMetaData>().create({
  appUrl: vine.string().trim().maxLength(2048).use(clientUrl()),
  redirectUris: vine.string().maxLength(20_000).use(redirectUriList()).transform(redirectUriLines),
  postLogoutRedirectUris: vine
    .string()
    .maxLength(20_000)
    .use(redirectUriList({ optional: true }))
    .transform(redirectUriLines)
    .optional(),
})
