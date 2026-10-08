import vine from '@vinejs/vine'
import {
  discoverableIssuer,
  type DiscoverableIssuerMetaData,
} from '#validators/rules/discoverable_issuer'

/**
 * Validator to use when connecting an organization's identity provider:
 * the OIDC client the company created at the provider. The issuer URL is checked against the provider itself
 * (`meta.discovery`).
 */
export const createIdentityProviderValidator = vine
  .withMetaData<DiscoverableIssuerMetaData>()
  .create({
    issuer: vine.string().trim().maxLength(2048).use(discoverableIssuer()),
    clientId: vine.string().trim().maxLength(255),
    clientSecret: vine.string().trim().maxLength(2048),
  })

/**
 * Metadata the update validator reads: the provider's issuer URL before
 * the edit, and how many members are tied to it
 */
type IssuerChangeMetaData = { currentIssuer: string; tiedMembersCount: number }

/**
 * A different issuer URL clears members' ties to the provider, so it
 * must be confirmed when there are any
 */
const confirmedIssuerChange = vine.createRule((value, _, field) => {
  const { currentIssuer, tiedMembersCount } = field.meta as IssuerChangeMetaData
  const confirmed = ['on', 'true', '1', true].includes(field.parent.confirmsIssuerChange)

  if (value !== currentIssuer && tiedMembersCount > 0 && !confirmed) {
    field.report(
      'This is a different provider. Confirm below that members will be matched by email again',
      'confirmedIssuerChange',
      field
    )
  }
})

/**
 * Validator to use when editing the identity provider. A blank client
 * secret keeps the current one. Changing the issuer URL needs
 * `confirmsIssuerChange` when members are tied to the provider.
 */
export const updateIdentityProviderValidator = vine
  .withMetaData<DiscoverableIssuerMetaData & IssuerChangeMetaData>()
  .create({
    issuer: vine
      .string()
      .trim()
      .maxLength(2048)
      .use(confirmedIssuerChange())
      .use(discoverableIssuer()),
    clientId: vine.string().trim().maxLength(255),
    clientSecret: vine.string().trim().maxLength(2048).optional(),
    admitsNewcomers: vine.boolean().optional(),
    confirmsIssuerChange: vine.boolean().optional(),
  })
