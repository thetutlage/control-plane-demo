import vine from '@vinejs/vine'
import type ProviderDiscoveryService from '#services/provider_discovery_service'

/**
 * Metadata the rule reads: the service that fetches a provider's OpenID
 * configuration
 */
export type DiscoverableIssuerMetaData = { discovery: ProviderDiscoveryService }

/**
 * An issuer URL whose provider answers for it: its OpenID configuration
 * can be fetched and names the same issuer
 */
export const discoverableIssuer = vine.createRule(async (value, _, field) => {
  if (!field.isValid) {
    return
  }

  const { discovery } = field.meta as DiscoverableIssuerMetaData
  const result = await discovery.discover(String(value))
  if ('problem' in result) {
    field.report(`The issuer URL ${result.problem}`, 'discoverableIssuer', field)
  }
})
