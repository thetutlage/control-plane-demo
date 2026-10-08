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
 * Validator to use when editing the identity provider. A blank client
 * secret keeps the current one.
 */
export const updateIdentityProviderValidator = vine
  .withMetaData<DiscoverableIssuerMetaData>()
  .create({
    issuer: vine.string().trim().maxLength(2048).use(discoverableIssuer()),
    clientId: vine.string().trim().maxLength(255),
    clientSecret: vine.string().trim().maxLength(2048).optional(),
  })
