import { test } from '@japa/runner'
import { exportJWK, generateKeyPair, SignJWT, type JSONWebKeySet } from 'jose'
import { verifyIdToken } from '#identity_providers/id_token'

const ISSUER = 'https://acme.okta.com'
const CLIENT_ID = '0oa1b2c3d4'
const NONCE = 'the-nonce-this-browser-sent'
const expected = { issuer: ISSUER, clientId: CLIENT_ID, nonce: NONCE }

/**
 * A provider's signing key, with the key set it would publish
 */
async function providerKey(alg = 'RS256') {
  const { privateKey, publicKey } = await generateKeyPair(alg, { extractable: true })
  const keys: JSONWebKeySet = { keys: [{ ...(await exportJWK(publicKey)), kid: 'key-1', alg }] }
  return { privateKey, keys, alg }
}

/**
 * An ID token the provider would issue for Sara, with any claims replaced
 */
function idToken(
  key: Awaited<ReturnType<typeof providerKey>>,
  claims: Record<string, unknown> = {},
  expiresIn = '5m'
) {
  return new SignJWT({
    nonce: NONCE,
    email: 'Sara@Acme.com',
    email_verified: true,
    name: 'Sara Lee',
    ...claims,
  })
    .setProtectedHeader({ alg: key.alg, kid: 'key-1' })
    .setIssuer((claims.iss as string) ?? ISSUER)
    .setAudience((claims.aud as string | string[]) ?? CLIENT_ID)
    .setSubject('00u-sara')
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key.privateKey)
}

/**
 * The checks OpenID Connect Core §3.1.3.7 asks of every client
 */
test.group('ID token', () => {
  test('reads who signed in from a token that holds up', async ({ assert }) => {
    const key = await providerKey()

    const result = await verifyIdToken(await idToken(key), expected, key.keys)

    assert.deepEqual(result, {
      claims: {
        subject: '00u-sara',
        email: 'sara@acme.com',
        emailVerified: true,
        name: 'Sara Lee',
      },
    })
  })

  test('accepts a token signed with {$self}')
    .with(['RS256', 'ES256', 'PS256', 'EdDSA'])
    .run(async ({ assert }, alg) => {
      const key = await providerKey(alg)

      const result = await verifyIdToken(await idToken(key), expected, key.keys)

      assert.property(result, 'claims')
    })

  test('says nothing about verification when the provider does not', async ({ assert }) => {
    const key = await providerKey()
    const token = await idToken(key, { email_verified: undefined, name: undefined })

    const result = await verifyIdToken(token, expected, key.keys)

    assert.deepEqual(result, {
      claims: { subject: '00u-sara', email: 'sara@acme.com', emailVerified: null, name: null },
    })
  })

  test('refuses a token {title}')
    .with([
      { title: 'from another issuer', claims: { iss: 'https://evil.example.com' } },
      { title: 'meant for another client', claims: { aud: 'another-client' } },
      { title: 'issued to another client', claims: { aud: [CLIENT_ID, 'x'], azp: 'x' } },
      { title: 'answering another sign-in', claims: { nonce: 'another-nonce' } },
      { title: 'without a nonce', claims: { nonce: undefined } },
    ])
    .run(async ({ assert }, { claims }) => {
      const key = await providerKey()

      const result = await verifyIdToken(await idToken(key, claims), expected, key.keys)

      assert.property(result, 'problem')
    })

  test('refuses a token that has expired', async ({ assert }) => {
    const key = await providerKey()

    const result = await verifyIdToken(await idToken(key, {}, '-5m'), expected, key.keys)

    assert.property(result, 'problem')
  })

  test("refuses a token signed with a key that isn't the provider's", async ({ assert }) => {
    const key = await providerKey()
    const attacker = await providerKey()

    const result = await verifyIdToken(await idToken(attacker), expected, key.keys)

    assert.property(result, 'problem')
  })

  test('refuses a token signed with our own client secret', async ({ assert }) => {
    const key = await providerKey()
    const token = await new SignJWT({ nonce: NONCE })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setSubject('00u-sara')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('provider-secret-wxyz-provider-secret-wxyz'))

    const result = await verifyIdToken(token, expected, key.keys)

    assert.property(result, 'problem')
  })

  test('refuses an unsigned token', async ({ assert }) => {
    const key = await providerKey()
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const token = `${encode({ alg: 'none' })}.${encode({
      iss: ISSUER,
      aud: CLIENT_ID,
      sub: '00u-sara',
      nonce: NONCE,
      iat: now,
      exp: now + 300,
    })}.`

    const result = await verifyIdToken(token, expected, key.keys)

    assert.property(result, 'problem')
  })
})
