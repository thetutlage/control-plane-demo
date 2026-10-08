import { test } from '@japa/runner'
import type { AddressInfo } from 'node:net'
import { createServer } from 'node:http'
import ProviderRequestService from '#services/provider_request_service'

/**
 * The token endpoint and the keys URL come from the provider's own
 * configuration, so they get the same checks as the issuer URL.
 */
test.group('Provider requests', () => {
  test('posts form fields, as a token endpoint expects', async ({ assert, cleanup }) => {
    const received: { method?: string; type?: string; body: string }[] = []
    const server = createServer((request, response) => {
      let body = ''
      request.on('data', (chunk) => (body += chunk))
      request.on('end', () => {
        received.push({ method: request.method, type: request.headers['content-type'], body })
        response.setHeader('content-type', 'application/json')
        response.end('{"access_token":"at"}')
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    cleanup(() => {
      server.closeAllConnections()
      server.close()
    })
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/token`

    const response = await new ProviderRequestService({ allowLocal: true }).postForm(url, {
      grant_type: 'authorization_code',
      code: 'a code & more',
    })

    assert.deepEqual(response, { status: 200, body: '{"access_token":"at"}' })
    assert.deepEqual(received, [
      {
        method: 'POST',
        type: 'application/x-www-form-urlencoded',
        body: 'grant_type=authorization_code&code=a+code+%26+more',
      },
    ])
  })

  test('refuses to post to {url}')
    .with([
      { url: 'https://127.0.0.1/token', failure: 'not_public' },
      { url: 'https://169.254.169.254/token', failure: 'not_public' },
      { url: 'https://localhost/token', failure: 'not_public' },
      { url: 'http://oauth2.googleapis.com/token', failure: 'not_https' },
      { url: 'https://user:pass@oauth2.googleapis.com/token', failure: 'has_credentials' },
      { url: 'https://no-such-host.invalid/token', failure: 'unknown_host' },
      { url: '/token', failure: 'not_a_url' },
    ])
    .run(async ({ assert }, { url, failure }) => {
      const response = await new ProviderRequestService().postForm(url, { code: 'secret' })

      assert.deepEqual(response, { failure })
    })
})
