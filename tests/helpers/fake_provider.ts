import Provider from 'oidc-provider'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { getActiveTest } from '@japa/runner'
import type Organization from '#models/organization'
import IdentityProvider from '#models/identity_provider'
import { IdentityProviderKind } from '#values/identity_provider_kind'

type Account = {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
}

const CLIENT = { id: 'backlit-at-acme', secret: 'the-secret-acme-created-at-its-provider' }

/**
 * Sara, as the company's provider knows her
 */
export const SARA: Account = {
  sub: '00u-sara',
  email: 'sara@acme.test',
  email_verified: true,
  name: 'Sara Lee',
}

/**
 * An organization whose identity provider is a real OpenID Connect
 * provider running on this machine for the length of the test, already
 * connected. It signs in whoever `signsInAs` names, without a login
 * page, or refuses when told to `cancel`. People no admin added are
 * refused by the app unless `admitsNewcomers` is on.
 *
 * The app reaches it only when `ProviderRequestService` is swapped for
 * one that allows local addresses.
 */
export async function setupOrganizationProvider(
  organization: Organization,
  options: { admitsNewcomers?: boolean } = {}
) {
  const test = getActiveTest()
  if (!test) {
    throw new Error('setupOrganizationProvider must be called inside a test')
  }

  let account = SARA
  let cancelled = false
  const accounts = new Map<string, Account>()

  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  test.cleanup(() => {
    server.closeAllConnections()
    server.close()
  })
  const issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

  const provider = new Provider(issuer, {
    clients: [
      {
        client_id: CLIENT.id,
        client_secret: CLIENT.secret,
        redirect_uris: [organization.signInCallbackUrl()],
        grant_types: ['authorization_code'],
        response_types: ['code'],
      },
    ],
    cookies: { keys: ['a-key-for-the-fake-provider'] },
    claims: { openid: ['sub'], email: ['email', 'email_verified'], profile: ['name'] },
    conformIdTokenClaims: false,
    features: { devInteractions: { enabled: false } },
    interactions: { url: (_ctx, interaction) => `/interaction/${interaction.uid}` },
    findAccount: (_ctx, sub) => ({
      accountId: sub,
      claims: () => accounts.get(sub) ?? { sub },
    }),

    /**
     * No consent page: the client gets what it asks for
     */
    async loadExistingGrant(ctx) {
      const grant = new ctx.oidc.provider.Grant({
        clientId: ctx.oidc.client!.clientId,
        accountId: ctx.oidc.session!.accountId!,
      })
      grant.addOIDCScope('openid email profile')
      await grant.save()
      return grant
    },
  })

  /**
   * oidc-provider warns about its development keys and in-memory store
   * on every start, which is all a fake needs
   */
  const handle = provider.callback()
  server.on('request', (request, response) => {
    if (!request.url?.startsWith('/interaction/')) {
      return handle(request, response)
    }

    accounts.set(account.sub, account)
    const result = cancelled
      ? { error: 'access_denied', error_description: 'the person cancelled' }
      : { login: { accountId: account.sub } }
    provider.interactionFinished(request, response, result, { mergeWithLastSubmission: false })
  })

  const identityProvider = await organization.related('identityProviders').create({
    kind: IdentityProviderKind.OIDC,
    issuer,
    clientId: CLIENT.id,
    admitsNewcomers: options.admitsNewcomers ?? false,
    ...IdentityProvider.encryptSecret(CLIENT.secret),
  })

  return {
    issuer,
    identityProvider,

    /**
     * The next person to sign in at the provider
     */
    signsInAs(next: Account) {
      account = next
      cancelled = false
    },

    /**
     * The next person cancels at the provider instead of signing in
     */
    cancels() {
      cancelled = true
    },
  }
}
