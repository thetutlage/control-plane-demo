import { test } from '@japa/runner'
import type { AddressInfo } from 'node:net'
import { createServer, type RequestListener } from 'node:http'
import ProviderDiscoveryService from '#services/provider_discovery_service'

/**
 * Starts a provider on this machine for one test, answering its discovery
 * URL with `handler`, and returns its issuer URL
 */
const startProvider = test.macro(async (t, handler: (issuer: string) => RequestListener) => {
  let issuer = ''
  const server = createServer((request, response) => handler(issuer)(request, response))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.cleanup(() => {
    server.closeAllConnections()
    server.close()
  })

  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return issuer
})

const configuration = (issuer: string) => ({
  issuer,
  authorization_endpoint: `${issuer}/authorize`,
  token_endpoint: `${issuer}/token`,
  jwks_uri: `${issuer}/keys`,
})

const json = (body: unknown): RequestListener => {
  return (_, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(body))
  }
}

const notFound: RequestListener = (_, response) => {
  response.writeHead(404).end()
}

const html: RequestListener = (_, response) => {
  response.end('<html>Sign in</html>')
}

const oversized: RequestListener = (_, response) => {
  response.end('x'.repeat(300 * 1024))
}

/**
 * The issuer URL comes from a form, so reading its OpenID configuration
 * must not reach anything but a public provider.
 */
test.group('Provider discovery', () => {
  test('reads the endpoints of a provider that answers for its issuer URL', async ({ assert }) => {
    const paths: (string | undefined)[] = []
    const issuer = await startProvider((self) => (request, response) => {
      paths.push(request.url)
      json(configuration(self))(request, response)
    })

    const result = await new ProviderDiscoveryService({ allowLocal: true }).discover(issuer)

    assert.deepEqual(result, {
      metadata: {
        issuer,
        authorizationEndpoint: `${issuer}/authorize`,
        tokenEndpoint: `${issuer}/token`,
        jwksUri: `${issuer}/keys`,
      },
    })
    assert.deepEqual(paths, ['/.well-known/openid-configuration'])
  })

  test('refuses a provider that calls itself something else', async ({ assert }) => {
    const issuer = await startProvider(() => json(configuration('https://accounts.google.com')))

    const result = await new ProviderDiscoveryService({ allowLocal: true }).discover(issuer)

    assert.deepEqual(result, {
      problem:
        'belongs to a provider that calls itself https://accounts.google.com. Enter that exact URL',
    })
  })

  test('does not follow a redirect', async ({ assert }) => {
    let followed = false
    const target = await startProvider((self) => (request, response) => {
      followed = true
      json(configuration(self))(request, response)
    })
    const issuer = await startProvider(() => (_, response) => {
      response.writeHead(302, { location: `${target}/.well-known/openid-configuration` }).end()
    })

    const result = await new ProviderDiscoveryService({ allowLocal: true }).discover(issuer)

    assert.property(result, 'problem')
    assert.isFalse(followed)
  })

  test('refuses {$i}: {title}')
    .with([
      { title: 'a missing configuration', handler: () => notFound, problem: 'has no OpenID' },
      { title: 'a body that is not JSON', handler: () => html, problem: 'did not return' },
      {
        title: 'a configuration without endpoints',
        handler: (issuer: string) => json({ issuer }),
        problem: 'did not return',
      },
      { title: 'a body that is too large', handler: () => oversized, problem: 'could not be' },
    ])
    .run(async ({ assert }, { handler, problem }) => {
      const issuer = await startProvider(handler)

      const result = await new ProviderDiscoveryService({ allowLocal: true }).discover(issuer)

      assert.include((result as { problem: string }).problem, problem)
    })

  test('gives up on a provider that does not answer in time', async ({ assert }) => {
    const issuer = await startProvider(() => () => {})

    const result = await new ProviderDiscoveryService({ allowLocal: true, timeout: 200 }).discover(
      issuer
    )

    assert.include((result as { problem: string }).problem, 'could not be reached')
  })

  test('refuses {$self}, which is not on the public internet')
    .with([
      'https://127.0.0.1',
      'https://localhost',
      'https://10.0.0.5',
      'https://172.16.0.1',
      'https://192.168.1.1',
      'https://169.254.169.254',
      'https://100.64.0.1',
      'https://0.0.0.0',
      'https://[::1]',
      'https://[::ffff:127.0.0.1]',
      'https://[fd00::1]',
      'https://[fe80::1]',
    ])
    .run(async ({ assert }, issuer) => {
      const result = await new ProviderDiscoveryService().discover(issuer)

      assert.deepEqual(result, { problem: 'must be reachable from the internet' })
    })

  test('lets {$self} through, which is on the public internet')
    .with(['https://8.8.8.8', 'https://1.1.1.1', 'https://[2001:4860:4860::8888]'])
    .run(async ({ assert }, issuer) => {
      const result = await new ProviderDiscoveryService({ timeout: 1 }).discover(issuer)

      assert.notDeepEqual(result, { problem: 'must be reachable from the internet' })
      assert.property(result, 'problem')
    })

  test('refuses {$self}')
    .with([
      { issuer: 'http://accounts.google.com', problem: 'must use https' },
      { issuer: 'ftp://accounts.google.com', problem: 'must use https' },
      { issuer: 'accounts.google.com', problem: 'must be a URL, such as https://acme.okta.com' },
      {
        issuer: 'https://accounts.google.com/?tenant=1',
        problem: 'cannot contain a query string, a #fragment or credentials',
      },
      {
        issuer: 'https://user:pass@accounts.google.com',
        problem: 'cannot contain a query string, a #fragment or credentials',
      },
    ])
    .run(async ({ assert }, { issuer, problem }) => {
      const result = await new ProviderDiscoveryService().discover(issuer)

      assert.deepEqual(result, { problem })
    })

  test('refuses a host that does not exist', async ({ assert }) => {
    const result = await new ProviderDiscoveryService().discover('https://no-such-host.invalid')

    assert.include((result as { problem: string }).problem, 'could not be reached')
  })
})
