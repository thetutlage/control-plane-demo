import { test } from '@japa/runner'
import env from '#start/env'
import testUtils from '@adonisjs/core/services/test_utils'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

const consoleUrl = new URL(env.get('APP_URL'))
const issuer = (subdomain: string) => `${consoleUrl.protocol}//${subdomain}.${consoleUrl.host}`

async function getJson(url: string) {
  const response = await fetch(url)
  return { status: response.status, body: (await response.json()) as Record<string, any> }
}

/**
 * Every environment is its own OpenID issuer on its own subdomain, with its
 * own signing keys.
 */
test.group('OIDC issuers', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('each environment publishes its own issuer and signing key', async ({ assert }) => {
    const acme = await setupOnboardedOrganization({ slug: 'acme' })
    const expected = [
      { subdomain: 'acme', environment: acme.production },
      { subdomain: 'acme--staging', environment: acme.staging },
      { subdomain: 'acme--development', environment: acme.development },
    ]

    const kids: string[] = []
    for (const { subdomain, environment } of expected) {
      const discovery = await getJson(`${issuer(subdomain)}/.well-known/openid-configuration`)
      assert.equal(discovery.status, 200)
      assert.equal(discovery.body.issuer, issuer(subdomain))
      assert.equal(discovery.body.jwks_uri, `${issuer(subdomain)}/jwks`)

      const jwks = await getJson(discovery.body.jwks_uri)
      const [signingKey] = await environment.related('signingKeys').query()
      assert.lengthOf(jwks.body.keys, 1)
      assert.containsSubset(jwks.body.keys[0], { kid: signingKey.kid, alg: 'ES256', use: 'sig' })
      assert.notProperty(jwks.body.keys[0], 'd', 'JWKS must not expose the private key')
      kids.push(signingKey.kid)
    }

    assert.lengthOf(new Set(kids), 3)
  })

  test('another organization gets separate issuers and keys', async ({ assert }) => {
    await setupOnboardedOrganization({ slug: 'acme' })
    await setupOnboardedOrganization({ slug: 'globex' })

    const acme = await getJson(`${issuer('acme')}/jwks`)
    const globex = await getJson(`${issuer('globex')}/jwks`)

    assert.notEqual(acme.body.keys[0].kid, globex.body.keys[0].kid)
  })

  test('unknown issuer subdomains return 404', async ({ assert }) => {
    await setupOnboardedOrganization({ slug: 'acme' })

    for (const subdomain of ['globex', 'acme--qa', 'acme--production', 'acme--staging--x']) {
      const discovery = await getJson(`${issuer(subdomain)}/.well-known/openid-configuration`)
      assert.equal(discovery.status, 404, subdomain)
      assert.deepEqual(discovery.body, { error: 'unknown_issuer' })
    }
  })

  test('the console host is not handled as an issuer', async ({ assert }) => {
    const response = await fetch(new URL('/login', consoleUrl))
    const discovery = await fetch(new URL('/.well-known/openid-configuration', consoleUrl))

    assert.equal(response.status, 200)
    assert.equal(discovery.status, 404)
  })
})
