import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { Collector, Scope } from '#auditlogs/index'
import { LucidStore } from '#auditlogs/src/stores/lucid'
import type Organization from '#models/organization'
import { actions, ADA, BEN, INVOICES, SARA } from '#auditlogs/tests/helpers'
import { setupOnboardedOrganization } from '#tests/helpers/organizations'

const store = () =>
  new LucidStore(db.connection(), {
    columns: { organizationId: 'organization_id', environmentId: 'environment_id' },
  })

/**
 * A scope for one organization, writing to the database when flushed
 */
async function setupScope(slug = 'acme') {
  const organization = await setupOnboardedOrganization({ slug })
  const context = { organizationId: organization.organization.id, requestId: `req-${slug}` }
  return { ...organization, scope: new Scope(actions, new Collector(store()), context) }
}

/**
 * The actions of an organization's events, newest first, narrowed by
 * who or what they involve
 */
async function actionsOf(
  organization: Organization,
  thing?: { type: string; id: number },
  role?: 'actor' | 'subject'
) {
  const events = await organization
    .related('auditEvents')
    .query()
    .if(thing, (query) => query.withScopes((scopes) => scopes.involving(thing!, role)))
    .orderBy('id', 'desc')
  return events.map(({ action }) => action)
}

test.group('Audit logs | Lucid store', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an event is stored as a row, with a row for its actor and each subject', async ({
    assert,
  }) => {
    const { scope, organization, staging } = await setupScope()
    const inStaging = scope.child(scope.writer, { environmentId: staging.id })
    const written = inStaging.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
    await inStaging.flush()

    const row = await db.from('audit_events').firstOrFail()
    const refs = await db.from('audit_event_refs').orderBy('position')

    assert.equal(row.id, written.id)
    assert.equal(row.organization_id, organization.id)
    assert.equal(row.environment_id, staging.id)
    assert.equal(row.action, 'access.role_assigned')
    assert.equal(row.category, 'access')
    assert.equal(row.summary, 'ada@acme.test changed the roles of sara@acme.test on Invoices')
    assert.deepEqual(row.data, { before: [], after: ['Approver'] })
    assert.deepEqual(row.context, { requestId: 'req-acme' }, 'without the keys that have columns')
    assert.isNull(row.batch_id)
    assert.equal(new Date(row.occurred_at).getTime(), written.occurredAt.getTime())
    assert.deepEqual(
      refs.map(({ position, role, type, ref_id: refId, label }) => ({
        position,
        role,
        type,
        refId,
        label,
      })),
      [
        { position: 0, role: 'actor', type: 'user', refId: '1', label: 'ada@acme.test' },
        { position: 1, role: 'subject', type: 'member', refId: '12', label: 'sara@acme.test' },
        { position: 2, role: 'subject', type: 'app', refId: '7', label: 'Invoices' },
      ]
    )
  })

  test('an event by the system, outside any environment, has no actor row', async ({ assert }) => {
    const { scope } = await setupScope()
    scope.record('sign_in.refused', INVOICES, 'nobody@acme.test', null)
    await scope.flush()

    const row = await db.from('audit_events').firstOrFail()
    const refs = await db.from('audit_event_refs')

    assert.isNull(row.environment_id)
    assert.lengthOf(refs, 1)
    assert.deepInclude(refs[0], { role: 'subject', position: 1, type: 'app', ref_id: '7' })
  })

  test('writing the same events again changes nothing', async ({ assert }) => {
    const { scope } = await setupScope()
    const first = scope.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
    const second = scope.record('configuration.viewed', ADA)
    await scope.flush()

    await store().write([first, second])

    assert.lengthOf(await db.from('audit_events'), 2)
    assert.lengthOf(await db.from('audit_event_refs'), 4)
  })

  test('events written in a transaction are saved when it commits', async ({ assert }) => {
    const { scope, organization } = await setupScope()
    const batch = scope.batch()

    await db.transaction(async (trx) => {
      batch.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
      batch.record('configuration.viewed', ADA)
      await batch.flush({ client: trx })

      assert.lengthOf(await db.from('audit_events'), 0, 'not visible outside the transaction yet')
    })

    const events = await organization.related('auditEvents').query()
    assert.lengthOf(events, 2)
    assert.deepEqual(
      events.map(({ batchId }) => batchId),
      [batch.id, batch.id]
    )
  })

  test('events written in a transaction are gone when it rolls back', async ({ assert }) => {
    const { scope } = await setupScope()
    const batch = scope.batch()

    await assert.rejects(() =>
      db.transaction(async (trx) => {
        batch.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
        await batch.flush({ client: trx })
        throw new Error('the change failed')
      })
    )

    assert.lengthOf(await db.from('audit_events'), 0)
    assert.lengthOf(await db.from('audit_event_refs'), 0)
  })
})

test.group('Audit logs | reading through the models', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an event loads with its actor and subjects, in order', async ({ assert }) => {
    const { scope, organization } = await setupScope()
    scope.record('access.transferred', ADA, SARA, BEN, INVOICES)
    scope.record('sign_in.refused', INVOICES, 'nobody@acme.test', null)
    await scope.flush()

    const [refused, transferred] = await organization
      .related('auditEvents')
      .query()
      .preload('refs')
      .orderBy('id', 'desc')

    assert.equal(transferred.actor?.label, 'ada@acme.test')
    assert.deepEqual(
      transferred.subjects.map(({ type, label }) => `${type}: ${label}`),
      ['member: sara@acme.test', 'member: ben@acme.test', 'app: Invoices']
    )
    assert.isNull(refused.actor)
    assert.lengthOf(refused.subjects, 1)
    assert.deepEqual(refused.data, { email: 'nobody@acme.test' })
    assert.isTrue(refused.occurredAt.isValid)
  })

  test('events are found by who or what they involve, as actor, subject or either', async ({
    assert,
  }) => {
    const { scope, organization } = await setupScope()
    scope.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
    scope.record('access.transferred', ADA, SARA, BEN, INVOICES)
    scope.record('sign_in.refused', INVOICES, BEN.email, BEN)
    scope.record('configuration.viewed', ADA)
    await scope.flush()

    const sara = { type: 'member', id: SARA.id }
    const ben = { type: 'member', id: BEN.id }
    const ada = { type: 'user', id: ADA.id }

    assert.deepEqual(await actionsOf(organization, sara), [
      'access.transferred',
      'access.role_assigned',
    ])
    assert.deepEqual(await actionsOf(organization, ben), ['sign_in.refused', 'access.transferred'])
    assert.deepEqual(await actionsOf(organization, ada, 'actor'), [
      'configuration.viewed',
      'access.transferred',
      'access.role_assigned',
    ])
    assert.deepEqual(await actionsOf(organization, ada, 'subject'), [])
    assert.deepEqual(
      await actionsOf(organization, { type: 'app', id: SARA.id }),
      [],
      'the same ID of another kind is something else'
    )
  })

  test('scopes combine with ordinary conditions', async ({ assert }) => {
    const { scope, organization } = await setupScope()
    scope.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
    scope.record('sign_in.refused', INVOICES, SARA.email, SARA)
    scope.record('sign_in.refused', INVOICES, BEN.email, BEN)
    await scope.flush()

    const events = await organization
      .related('auditEvents')
      .query()
      .withScopes((scopes) => scopes.involving({ type: 'member', id: SARA.id }))
      .whereIn('category', ['sign_in'])

    assert.deepEqual(
      events.map(({ action }) => action),
      ['sign_in.refused']
    )
  })

  test('events are paged newest first, with no gaps or repeats', async ({ assert }) => {
    const { scope, organization } = await setupScope()
    const written = Array.from({ length: 7 }, () => scope.record('configuration.viewed', ADA))
    await scope.flush()

    const pageAfter = (cursor?: string) =>
      organization
        .related('auditEvents')
        .query()
        .withScopes((scopes) => scopes.page(3, cursor))

    const first = await pageAfter()
    const second = await pageAfter(first[2].id)
    const third = await pageAfter(second[2].id)

    assert.lengthOf(first, 4, 'one more than asked for: another page follows')
    assert.lengthOf(second, 4)
    assert.lengthOf(third, 1, 'the last page')
    assert.deepEqual(
      [...first.slice(0, 3), ...second.slice(0, 3), ...third].map(({ id }) => id),
      written.map(({ id }) => id).reverse()
    )
  })

  test('an organization reads only its own events, and an environment only its own', async ({
    assert,
  }) => {
    const acme = await setupScope('acme')
    const globex = await setupScope('globex')
    acme.scope.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
    acme.scope
      .child(acme.scope.writer, { environmentId: acme.staging.id })
      .record('sign_in.refused', INVOICES, SARA.email, SARA)
    globex.scope.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Viewer'])
    await acme.scope.flush()
    await globex.scope.flush()

    const sara = { type: 'member', id: SARA.id }

    assert.deepEqual(await actionsOf(acme.organization, sara), [
      'sign_in.refused',
      'access.role_assigned',
    ])
    assert.deepEqual(await actionsOf(globex.organization, sara), ['access.role_assigned'])

    const inStaging = await acme.staging.related('auditEvents').query()
    const inProduction = await acme.production.related('auditEvents').query()
    assert.deepEqual(
      inStaging.map(({ action }) => action),
      ['sign_in.refused']
    )
    assert.lengthOf(inProduction, 0)
  })

  test('deleting an organization deletes its events and their refs', async ({ assert }) => {
    const { scope, organization } = await setupScope()
    scope.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
    await scope.flush()

    await organization.delete()

    assert.lengthOf(await db.from('audit_events'), 0)
    assert.lengthOf(await db.from('audit_event_refs'), 0)
  })
})
