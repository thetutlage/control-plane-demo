import vine from '@vinejs/vine'
import { clientUrl, type ClientUrlMetaData } from '#validators/rules/client_url'
import { redirectUriLines, redirectUriList } from '#validators/rules/redirect_uri_list'

/**
 * Validator to use when configuring an app's client in one of the
 * environments it has no client in yet. `meta.environments` lists those
 * environments.
 */
export const createAppClientValidator = vine.withMetaData<ClientUrlMetaData>().create({
  environment: vine.enum((field) =>
    (field.meta as ClientUrlMetaData).environments.map(({ slug }) => slug)
  ),
  appUrl: vine.string().trim().maxLength(2048).use(clientUrl()),
  redirectUris: vine.string().maxLength(20_000).use(redirectUriList()).transform(redirectUriLines),
})
