import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { request as requestOverHttp } from 'node:http'
import { request as requestOverHttps } from 'node:https'

/**
 * Addresses that are not on the public internet: this machine, private
 * networks, link-local addresses (where cloud hosts serve credentials),
 * and ranges reserved for documentation, multicast and the like
 */
const NON_PUBLIC = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const) {
  NON_PUBLIC.addSubnet(network, prefix, 'ipv4')
}
/**
 * IPv4 addresses written as IPv6 (`::ffff:127.0.0.1`) are matched by the
 * IPv4 rules above. A rule for `::ffff:0:0/96` here would match every
 * IPv4 address instead.
 */
for (const [network, prefix] of [
  ['::', 127],
  ['64:ff9b::', 96],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  NON_PUBLIC.addSubnet(network, prefix, 'ipv6')
}

/**
 * A discovery document is a few kilobytes. Anything much larger is not one.
 */
const MAX_BODY_BYTES = 256 * 1024

/**
 * Reads an identity provider's OpenID configuration from its issuer URL,
 * to confirm the URL an admin typed is a real provider.
 *
 * The URL comes from a form, so fetching it must not become a way to
 * reach our own network (OWASP's SSRF guidance): https only, every
 * address the host resolves to must be public, the connection goes to
 * the address that was checked (a second DNS answer can't swap it),
 * redirects are not followed, and the request is short and small.
 */
export default class ProviderDiscoveryService {
  #allowLocal: boolean
  #timeout: number

  /**
   * `allowLocal` accepts http and non-public addresses, for a provider
   * running on the same machine in tests
   */
  constructor(options: { allowLocal?: boolean; timeout?: number } = {}) {
    this.#allowLocal = options.allowLocal ?? false
    this.#timeout = options.timeout ?? 5000
  }

  /**
   * The provider's endpoints, or the problem with the issuer URL, worded
   * to follow "The issuer URL …"
   */
  async discover(issuer: string) {
    if (!URL.canParse(issuer)) {
      return { problem: 'must be a URL, such as https://acme.okta.com' }
    }

    const url = new URL(issuer)
    if (url.protocol !== 'https:' && !(this.#allowLocal && url.protocol === 'http:')) {
      return { problem: 'must use https' }
    }
    if (url.search || url.hash || url.username || url.password) {
      return { problem: 'cannot contain a query string, a #fragment or credentials' }
    }

    const target = await this.#resolve(url.hostname.replace(/^\[|\]$/g, ''))
    if (target === 'unknown') {
      return { problem: "could not be reached. Check the address is your provider's issuer URL" }
    }
    if (target === 'not_public') {
      return { problem: 'must be reachable from the internet' }
    }

    const configurationUrl = new URL(
      `${url.origin}${url.pathname.replace(/\/$/, '')}/.well-known/openid-configuration`
    )
    const response = await this.#get(configurationUrl, target)
    if (!response) {
      return { problem: "could not be reached. Check the address is your provider's issuer URL" }
    }
    if (response.status !== 200) {
      return { problem: `has no OpenID configuration at ${configurationUrl.href}` }
    }

    const metadata = this.#parse(response.body)
    if (!metadata) {
      return { problem: 'did not return an OpenID configuration with sign-in endpoints' }
    }

    /**
     * The issuer in the document must be the URL it was fetched for,
     * character for character (OpenID Connect Discovery §4.3). Tokens
     * carry this value, so a near match would fail at sign-in instead.
     */
    if (metadata.issuer !== issuer) {
      return {
        problem: `belongs to a provider that calls itself ${metadata.issuer}. Enter that exact URL`,
      }
    }

    return { metadata }
  }

  /**
   * The address to connect to for a host, after checking every address it
   * resolves to
   */
  async #resolve(hostname: string) {
    const literal = isIP(hostname)
    const addresses = literal
      ? [{ address: hostname, family: literal }]
      : await lookup(hostname, { all: true }).catch(() => [])

    if (!addresses.length) {
      return 'unknown' as const
    }
    if (!this.#allowLocal && addresses.some(({ address }) => !this.#isPublic(address))) {
      return 'not_public' as const
    }
    return addresses[0]
  }

  #isPublic(address: string) {
    return !NON_PUBLIC.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4')
  }

  /**
   * Fetches a URL from the address already checked for its host, without
   * following redirects. Resolves to null when the request fails, times
   * out or returns too much.
   */
  #get(url: URL, target: { address: string; family: number }) {
    return new Promise<{ status: number; body: string } | null>((resolve) => {
      const send = url.protocol === 'https:' ? requestOverHttps : requestOverHttp
      const request = send(
        url,
        {
          method: 'GET',
          agent: false,
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(this.#timeout),
          lookup: (_hostname, options, callback) => {
            if (options.all) {
              return callback(null, [target])
            }
            callback(null, target.address, target.family)
          },
        },
        (response) => {
          const chunks: Buffer[] = []
          let size = 0

          response.on('data', (chunk: Buffer) => {
            size += chunk.length
            if (size > MAX_BODY_BYTES) {
              request.destroy()
              return resolve(null)
            }
            chunks.push(chunk)
          })
          response.on('end', () => {
            resolve({
              status: response.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf8'),
            })
          })
          response.on('error', () => resolve(null))
          response.on('close', () => resolve(null))
        }
      )

      request.on('error', () => resolve(null))
      request.end()
    })
  }

  /**
   * The parts of an OpenID configuration that sign-in needs, or null when
   * the body is not one
   */
  #parse(body: string) {
    let document: Record<string, unknown>
    try {
      document = JSON.parse(body)
    } catch {
      return null
    }

    const {
      issuer,
      authorization_endpoint: authorizationEndpoint,
      token_endpoint: tokenEndpoint,
      jwks_uri: jwksUri,
    } = document ?? {}

    if (
      typeof issuer !== 'string' ||
      typeof authorizationEndpoint !== 'string' ||
      typeof tokenEndpoint !== 'string' ||
      typeof jwksUri !== 'string'
    ) {
      return null
    }
    return { issuer, authorizationEndpoint, tokenEndpoint, jwksUri }
  }
}
