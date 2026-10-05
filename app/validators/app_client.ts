import vine from '@vinejs/vine'
import { clientUrl, type ClientUrlMetaData } from '#validators/rules/client_url'
import { redirectUriLines, redirectUriList } from '#validators/rules/redirect_uri_list'

/**
 * Validator to use when creating or editing a client: where it runs and
 * where members may be sent, checked against the client's environment
 * (`meta.isProduction`)
 */
export const appClientValidator = vine.withMetaData<ClientUrlMetaData>().create({
  appUrl: vine.string().trim().maxLength(2048).use(clientUrl()),
  redirectUris: vine.string().maxLength(20_000).use(redirectUriList()).transform(redirectUriLines),
  postLogoutRedirectUris: vine
    .string()
    .maxLength(20_000)
    .use(redirectUriList({ optional: true }))
    .transform(redirectUriLines)
    .optional(),
})
