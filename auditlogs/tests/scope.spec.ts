import { test } from '@japa/runner'
import { Collector, MemoryStore, Queue, Scope } from '../index.js'
import { actions, ADA, INVOICES, SARA } from './helpers.js'

test.group('Audit logs | scope and batch', () => {
  test('a child scope has its own writer and both contexts', async ({ assert }) => {
    const store = new MemoryStore()
    const queue = new Queue(store, { flushAt: 100, flushInterval: 60_000 })
    const audit = new Scope(actions, queue, { pid: 42, region: 'eu' })
    const collector = new Collector(store)
    const request = audit.child(collector, { requestId: 'req-1', region: 'us' })

    const event = request.record('configuration.viewed', ADA)

    assert.deepEqual(event.context, { pid: 42, region: 'us', requestId: 'req-1' })
    assert.equal(collector.size, 1)
    assert.equal(queue.size, 0)
    assert.deepEqual(audit.context, { pid: 42, region: 'eu' })
  })

  test('with() adds context on the same writer', ({ assert }) => {
    const collector = new Collector(new MemoryStore())
    const scope = new Scope(actions, collector, { requestId: 'req-1' })

    const tenant = scope.with({ organizationId: 1 })
    const event = tenant.record('configuration.viewed', ADA)

    assert.deepEqual(event.context, { requestId: 'req-1', organizationId: 1 })
    assert.strictEqual(tenant.writer, collector)
    assert.equal(collector.size, 1)
  })

  test('a batch holds its own events, with its ID and the scope context on each', async ({
    assert,
  }) => {
    const store = new MemoryStore()
    const collector = new Collector(store)
    const scope = new Scope(actions, collector, { requestId: 'req-1' })

    const batch = scope.batch()
    const first = batch.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
    const second = batch.record('configuration.viewed', ADA)

    assert.equal(batch.size, 2)
    assert.equal(collector.size, 0, 'a batch is not in the scope writer')
    assert.equal(first.batchId, batch.id)
    assert.equal(second.batchId, batch.id)
    assert.deepEqual(first.context, { requestId: 'req-1' })
    assert.notEqual(scope.batch().id, batch.id)
  })

  test('flushing a scope does not flush its batches', async ({ assert }) => {
    const store = new MemoryStore()
    const scope = new Scope(actions, new Collector(store))
    const batch = scope.batch()
    batch.record('configuration.viewed', ADA)
    scope.record('sign_in.refused', INVOICES, SARA.email, SARA)

    await scope.flush()

    assert.deepEqual(
      store.events.map(({ action }) => action),
      ['sign_in.refused']
    )
    assert.equal(batch.size, 1)
  })

  test('a batch is written to the scope store, with the options it is flushed with', async ({
    assert,
  }) => {
    const store = new MemoryStore<{ client: string }>()
    const scope = new Scope(actions, new Collector(store))
    const batch = scope.batch()
    batch.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])
    batch.record('configuration.viewed', ADA)

    await batch.flush({ client: 'a transaction' })

    assert.lengthOf(store.writes, 1)
    assert.lengthOf(store.writes[0].events, 2)
    assert.deepEqual(store.writes[0].options, { client: 'a transaction' })
    assert.equal(batch.size, 0)
  })

  test('a batch throws when the write fails and keeps its events, and writing again adds no copies', async ({
    assert,
  }) => {
    const store = new MemoryStore()
    const batch = new Scope(actions, new Collector(store)).batch()
    const event = batch.record('configuration.viewed', ADA)
    store.failNextWriteWith = new Error('the transaction was rolled back')

    await assert.rejects(() => batch.flush(), 'the transaction was rolled back')
    assert.equal(batch.size, 1)

    await batch.flush()
    await store.write([event])

    assert.lengthOf(store.events, 1)
    assert.equal(store.events[0].id, event.id)
  })

  test('an empty batch writes nothing', async ({ assert }) => {
    const store = new MemoryStore()
    await new Scope(actions, new Collector(store)).batch().flush()

    assert.lengthOf(store.writes, 0)
  })
})
