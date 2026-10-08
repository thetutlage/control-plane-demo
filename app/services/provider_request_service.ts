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
 * A provider's documents and token responses are a few kilobytes.
 * Anything much larger is not one.
 */
const MAX_BODY_BYTES = 256 * 1024

/**
 * Sends requests to an identity provider: its OpenID configuration, its
 * signing keys and its token endpoint.
 *
 * Every one of those URLs comes from outside. An admin types the issuer
 * URL, and the provider's own configuration names the rest. So a request
 * must not become a way to reach our own network (OWASP's SSRF
 * guidance): https only, every address the host resolves to must be
 * public, the connection goes to the address that was checked (a second
 * DNS answer can't swap it), redirects are not followed, and the request
 * is short and small.
 */
export default class ProviderRequestService {
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
   * Fetches a URL. Resolves to the response, whatever its status, or to
   * the reason no request was made or no response came back.
   */
  get(url: string, headers: Record<string, string> = {}) {
    return this.#send('GET', url, headers)
  }

  /**
   * Posts form fields to a URL, as the token endpoint expects
   */
  postForm(url: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
    return this.#send(
      'POST',
      url,
      { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
      new URLSearchParams(fields).toString()
    )
  }

  async #send(
    method: 'GET' | 'POST',
    href: string,
    headers: Record<string, string>,
    body?: string
  ) {
    if (!URL.canParse(href)) {
      return { failure: 'not_a_url' as const }
    }

    const url = new URL(href)
    if (url.protocol !== 'https:' && !(this.#allowLocal && url.protocol === 'http:')) {
      return { failure: 'not_https' as const }
    }
    if (url.username || url.password) {
      return { failure: 'has_credentials' as const }
    }

    const target = await this.#resolve(url.hostname.replace(/^\[|\]$/g, ''))
    if (target === 'unknown_host' || target === 'not_public') {
      return { failure: target }
    }

    const response = await this.#request(method, url, target, headers, body)
    return response ?? { failure: 'unreachable' as const }
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
      return 'unknown_host' as const
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
   * Sends the request to the address already checked for its host,
   * without following redirects. Resolves to null when the request
   * fails, times out or returns too much.
   */
  #request(
    method: 'GET' | 'POST',
    url: URL,
    target: { address: string; family: number },
    headers: Record<string, string>,
    body?: string
  ) {
    return new Promise<{ status: number; body: string } | null>((resolve) => {
      const send = url.protocol === 'https:' ? requestOverHttps : requestOverHttp
      const request = send(
        url,
        {
          method,
          agent: false,
          headers: { accept: 'application/json', ...headers },
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
      request.end(body)
    })
  }
}
