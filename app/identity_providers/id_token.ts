import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose'

/**
 * Signatures made with a private key only the provider holds. Leaves out
 * `none` and the HMAC algorithms, whose "key" would be our own client
 * secret.
 */
const ALGORITHMS = [
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
]

/**
 * Checks an ID token the way OpenID Connect Core §3.1.3.7 asks every
 * client to, the same for every provider: it is signed with one of the
 * provider's keys, issued by the provider we sent the member to, meant
 * for our client, not expired, and answers the request this browser made
 * (the nonce).
 *
 * Resolves to who signed in, or to the problem, worded for our logs and
 * never shown to the member.
 */
export async function verifyIdToken(
  idToken: string,
  expected: { issuer: string; clientId: string; nonce: string },
  keys: JSONWebKeySet
) {
  let claims: Record<string, unknown>
  try {
    const { payload } = await jwtVerify(idToken, createLocalJWKSet(keys), {
      issuer: expected.issuer,
      audience: expected.clientId,
      algorithms: ALGORITHMS,
      requiredClaims: ['sub', 'exp', 'iat'],
      clockTolerance: 30,
    })
    claims = payload
  } catch (error) {
    return { problem: `the ID token was refused: ${(error as Error).message}` }
  }

  /**
   * A token meant for several clients names the one it was issued to
   */
  if (claims.azp !== undefined && claims.azp !== expected.clientId) {
    return { problem: 'the ID token was issued to another client (azp)' }
  }
  if (typeof claims.nonce !== 'string' || claims.nonce !== expected.nonce) {
    return { problem: 'the ID token does not answer this sign-in (nonce)' }
  }

  return {
    claims: {
      subject: claims.sub as string,
      email: typeof claims.email === 'string' ? claims.email.toLowerCase() : null,

      /**
       * Null when the provider doesn't say, as Entra never does
       */
      emailVerified: typeof claims.email_verified === 'boolean' ? claims.email_verified : null,
      name: typeof claims.name === 'string' ? claims.name : null,
    },
  }
}
