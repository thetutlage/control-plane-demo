import vine from '@vinejs/vine'
import { clientUrl, type ClientUrlMetaData } from '#validators/rules/client_url'
import { redirectUriLines, redirectUriList } from '#validators/rules/redirect_uri_list'

/**
 * Where a client runs and where members may be sent, checked against the
 * client's environment
 */
const clientUrls = {
  appUrl: vine.string().trim().maxLength(2048).use(clientUrl()),
  redirectUris: vine.string().maxLength(20_000).use(redirectUriList()).transform(redirectUriLines),
  postLogoutRedirectUris: vine
    .string()
    .maxLength(20_000)
    .use(redirectUriList({ optional: true }))
    .transform(redirectUriLines)
    .optional(),
}

/**
 * Validator to use when configuring an app's client in one of the
 * environments it has no client in yet. `meta.environments` lists those
 * environments.
 */
export const createAppClientValidator = vine
  .withMetaData<{ environments: { slug: string; isProduction: boolean }[] }>()
  .create({
    environment: vine.enum((field) =>
      (field.meta as { environments: { slug: string }[] }).environments.map(({ slug }) => slug)
    ),
    ...clientUrls,
  })

/**
 * Validator to use when editing a client. Its environment can't change;
 * `meta.isProduction` says whether it is production.
 */
export const updateAppClientValidator = vine
  .withMetaData<Extract<ClientUrlMetaData, { isProduction: boolean }>>()
  .create({ ...clientUrls })
