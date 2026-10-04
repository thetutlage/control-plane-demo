import { test } from '@japa/runner'
import { errors } from 'oidc-provider'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import App from '#models/app'
import type Environment from '#models/environment'
import { MemberStatus } from '#values/member_status'
import OidcStorageAdapter from '#oidc/storage_adapter'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

const HOUR = 3600

/**
 * An environment with a member signed in to an app: the grant, code and
 * refresh token records oidc-provider would create, saved through the
 * adapter.
 */
async function setupSignIn(environment: Environment) {
  const member = await environment.createMember({
    email: 'sara@acme.test',
    fullName: 'Sara',
    status: MemberStatus.ACTIVE,
  })
  const app = await App.firstOrCreate(
    { organizationId: environment.organizationId, slug: 'invoices' },
    { name: 'Invoices' }
  )
  const client = await environment.createAppClient(app, {
    appUrl: 'https://invoices.acme.test',
    redirectUris: ['https://invoices.acme.test/callback'],
  })

  const adapter = (model: string) => new OidcStorageAdapter(model, environment)
  const accountId = String(member.actorId)
  const clientId = client.clientId
  await adapter('Grant').upsert('g1', { accountId, clientId }, HOUR)
  await adapter('AuthorizationCode').upsert('g1-code', { grantId: 'g1' }, 60)
  await adapter('RefreshToken').upsert('g1-refresh', { grantId: 'g1' }, HOUR)

  return { adapter, accountId, clientId }
}

test.group('OIDC storage adapter', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('saves records to their own table and reads them back', async ({ assert }) => {
    const { production } = await setupOnboardedOrganization()
    const { adapter, accountId, clientId } = await setupSignIn(production)

    assert.deepEqual(await adapter('Grant').find('g1'), { accountId, clientId })
    assert.deepEqual(await adapter('RefreshToken').find('g1-refresh'), { grantId: 'g1' })

    const grant = await db.from('oidc_grants').where('id', 'g1').firstOrFail()
    assert.equal(grant.actor_id, Number(accountId))
    assert.equal(grant.client_id, clientId)
  })

  test('saving an existing record replaces it', async ({ assert }) => {
    const { production } = await setupOnboardedOrganization()
    const interactions = new OidcStorageAdapter('Interaction', production)

    await interactions.upsert('i1', { returnTo: '/first' }, HOUR)
    await interactions.upsert('i1', { returnTo: '/second' }, HOUR)

    assert.deepEqual(await interactions.find('i1'), { returnTo: '/second' })
  })

  test('expired records are not found', async ({ assert }) => {
    const { production } = await setupOnboardedOrganization()
    const interactions = new OidcStorageAdapter('Interaction', production)

    await interactions.upsert('i1', { returnTo: '/' }, HOUR)
    await db
      .from('oidc_interactions')
      .where('id', 'i1')
      .update({ expires_at: new Date(0) })

    assert.isUndefined(await interactions.find('i1'))
  })

  test('a code can be used only once', async ({ assert }) => {
    const { production } = await setupOnboardedOrganization()
    const { adapter } = await setupSignIn(production)
    const codes = adapter('AuthorizationCode')

    await codes.consume('g1-code')
    await assert.rejects(() => codes.consume('g1-code'), errors.InvalidGrant)

    const code = await codes.find('g1-code')
    assert.isNumber(code?.consumed)
  })

  test('two requests racing to use one refresh token: only one succeeds', async ({ assert }) => {
    const { production } = await setupOnboardedOrganization()
    const { adapter } = await setupSignIn(production)

    const results = await Promise.allSettled([
      adapter('RefreshToken').consume('g1-refresh'),
      adapter('RefreshToken').consume('g1-refresh'),
    ])

    assert.deepEqual(results.map(({ status }) => status).sort(), ['fulfilled', 'rejected'])
  })

  test('deleting a grant deletes its codes and refresh tokens, and nothing else', async ({
    assert,
  }) => {
    const { production } = await setupOnboardedOrganization()
    const { adapter } = await setupSignIn(production)
    await adapter('Grant').upsert('g2', (await adapter('Grant').find('g1'))!, HOUR)
    await adapter('RefreshToken').upsert('g2-refresh', { grantId: 'g2' }, HOUR)

    await adapter('Grant').destroy('g1')

    assert.isUndefined(await adapter('AuthorizationCode').find('g1-code'))
    assert.isUndefined(await adapter('RefreshToken').find('g1-refresh'))
    assert.isDefined(await adapter('RefreshToken').find('g2-refresh'))
  })

  test('revoking by grant deletes only that grant’s tokens', async ({ assert }) => {
    const { production } = await setupOnboardedOrganization()
    const { adapter } = await setupSignIn(production)
    await adapter('Grant').upsert('g2', (await adapter('Grant').find('g1'))!, HOUR)
    await adapter('RefreshToken').upsert('g2-refresh', { grantId: 'g2' }, HOUR)

    await adapter('RefreshToken').revokeByGrantId('g1')

    assert.isUndefined(await adapter('RefreshToken').find('g1-refresh'))
    assert.isDefined(await adapter('RefreshToken').find('g2-refresh'))
    assert.isDefined(await adapter('Grant').find('g1'))
  })

  test('one environment cannot read or delete another environment’s records', async ({
    assert,
  }) => {
    const { production, staging } = await setupOnboardedOrganization()
    const { adapter } = await setupSignIn(production)
    const stagingAdapter = (model: string) => new OidcStorageAdapter(model, staging)

    assert.isUndefined(await stagingAdapter('Grant').find('g1'))
    assert.isUndefined(await stagingAdapter('RefreshToken').find('g1-refresh'))

    await stagingAdapter('Grant').destroy('g1')
    await stagingAdapter('RefreshToken').revokeByGrantId('g1')
    await assert.rejects(() => stagingAdapter('RefreshToken').consume('g1-refresh'))

    assert.isDefined(await adapter('Grant').find('g1'))
    assert.isDefined(await adapter('RefreshToken').find('g1-refresh'))
  })

  test('a grant cannot point to an actor or app client of another environment', async ({
    assert,
  }) => {
    const { production, staging } = await setupOnboardedOrganization()
    const { accountId, clientId } = await setupSignIn(production)
    const stagingGrants = new OidcStorageAdapter('Grant', staging)

    await assert.rejects(
      () => stagingGrants.upsert('g2', { accountId, clientId }, HOUR),
      /oidc_grants_environment_id_actor_id_foreign/
    )
  })

  test('sessions are found by uid, within their environment', async ({ assert }) => {
    const { production, staging } = await setupOnboardedOrganization()
    const sessions = new OidcStorageAdapter('Session', production)

    await sessions.upsert('s1', { uid: 'u1', authorizations: {} }, HOUR)

    assert.deepEqual(await sessions.findByUid('u1'), { uid: 'u1', authorizations: {} })
    assert.isUndefined(await new OidcStorageAdapter('Session', staging).findByUid('u1'))
  })

  test('record types without a table are never stored', async ({ assert }) => {
    const { production } = await setupOnboardedOrganization()
    const accessTokens = new OidcStorageAdapter('AccessToken', production)

    await assert.rejects(
      () => accessTokens.upsert('a1', { grantId: 'g1' }, HOUR),
      'oidc-provider AccessToken records are not stored'
    )
    assert.isUndefined(await accessTokens.find('a1'))
    await accessTokens.revokeByGrantId('g1')
  })
})
