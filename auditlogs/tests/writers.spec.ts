import { test } from '@japa/runner'
import { setTimeout as wait } from 'node:timers/promises'
import { Collector, MemoryStore, Queue, Scope } from '../index.js'
import { actions, ADA, INVOICES, SARA } from './helpers.js'

test.group('Audit logs | collector', () => {
  test('holds events until it is flushed, then writes them in one go', async ({ assert }) => {
    const store = new MemoryStore()
    const scope = new Scope(actions, new Collector(store), { requestId: 'req-1' })

    scope.record('configuration.viewed', ADA)
    scope.record('sign_in.refused', INVOICES, SARA.email, SARA)
    assert.lengthOf(store.events, 0)

    await scope.flush()

    assert.lengthOf(store.writes, 1)
    assert.lengthOf(store.events, 2)
    assert.deepEqual(store.events[0].context, { requestId: 'req-1' })
  })

  test('writes nothing when it holds nothing', async ({ assert }) => {
    const store = new MemoryStore()
    await new Scope(actions, new Collector(store)).flush()

    assert.lengthOf(store.writes, 0)
  })

  test('never throws: a failed write hands the events to the reporter', async ({ assert }) => {
    const store = new MemoryStore()
    const reported: { error: unknown; actions: string[] }[] = []
    const collector = new Collector(store, {
      reporter: (error, events) =>
        reported.push({ error, actions: events.map(({ action }) => action) }),
    })
    const scope = new Scope(actions, collector)
    scope.record('configuration.viewed', ADA)
    scope.record('sign_in.refused', INVOICES, SARA.email, SARA)
    store.failNextWriteWith = new Error('the database is down')

    await scope.flush()

    assert.lengthOf(reported, 1)
    assert.equal((reported[0].error as Error).message, 'the database is down')
    assert.deepEqual(reported[0].actions, ['configuration.viewed', 'sign_in.refused'])
    assert.equal(collector.size, 0, 'the reporter has them now')
    assert.lengthOf(store.events, 0)
  })

  test('passes the options it is flushed with to the store', async ({ assert }) => {
    const store = new MemoryStore<{ client: string }>()
    const scope = new Scope(actions, new Collector(store))
    scope.record('configuration.viewed', ADA)

    await scope.flush({ client: 'a transaction' })

    assert.deepEqual(store.writes[0].options, { client: 'a transaction' })
  })
})

test.group('Audit logs | queue', () => {
  test('writes once it holds as many events as flushAt', async ({ assert }) => {
    const store = new MemoryStore()
    const queue = new Queue(store, { flushAt: 3, flushInterval: 60_000 })
    const scope = new Scope(actions, queue)

    scope.record('configuration.viewed', ADA)
    scope.record('configuration.viewed', ADA)
    assert.lengthOf(store.events, 0)

    scope.record('configuration.viewed', ADA)
    await wait(0)

    assert.lengthOf(store.writes, 1)
    assert.lengthOf(store.events, 3)
    await queue.close()
  })

  test('writes after flushInterval, counted from the first event it holds', async ({ assert }) => {
    const store = new MemoryStore()
    const queue = new Queue(store, { flushAt: 100, flushInterval: 30 })
    const scope = new Scope(actions, queue)

    scope.record('configuration.viewed', ADA)
    scope.record('configuration.viewed', ADA)
    assert.lengthOf(store.events, 0)

    await wait(80)
    assert.lengthOf(store.writes, 1)
    assert.lengthOf(store.events, 2)

    scope.record('configuration.viewed', ADA)
    await wait(80)
    assert.lengthOf(store.writes, 2)
    await queue.close()
  })

  test('a flush by hand writes now and stops the timer', async ({ assert }) => {
    const store = new MemoryStore()
    const queue = new Queue(store, { flushAt: 100, flushInterval: 30 })
    const scope = new Scope(actions, queue)
    scope.record('configuration.viewed', ADA)

    await scope.flush()
    assert.lengthOf(store.writes, 1)

    await wait(80)
    assert.lengthOf(store.writes, 1)
  })

  test('closing writes what is left', async ({ assert }) => {
    const store = new MemoryStore()
    const queue = new Queue(store, { flushAt: 100, flushInterval: 60_000 })
    new Scope(actions, queue).record('configuration.viewed', ADA)

    await queue.close()

    assert.lengthOf(store.events, 1)
    assert.equal(queue.size, 0)
  })

  test('never throws: a failed write is reported, and its events go out with the next write', async ({
    assert,
  }) => {
    const store = new MemoryStore()
    const reported: number[] = []
    const queue = new Queue(store, {
      flushAt: 2,
      flushInterval: 60_000,
      reporter: (_error, events) => reported.push(events.length),
    })
    const scope = new Scope(actions, queue)
    store.failNextWriteWith = new Error('the database is down')

    const first = scope.record('configuration.viewed', ADA)
    scope.record('configuration.viewed', ADA)
    await wait(0)

    assert.deepEqual(reported, [2])
    assert.lengthOf(store.events, 0)
    assert.equal(queue.size, 2)

    scope.record('configuration.viewed', ADA)
    await wait(0)

    assert.lengthOf(store.events, 3)
    assert.equal(store.events[0].id, first.id, 'events keep their order')
    await queue.close()
  })

  test('past its largest size, the oldest events are reported and let go of', async ({
    assert,
  }) => {
    const store = new MemoryStore()
    const dropped: string[] = []
    const queue = new Queue(store, {
      flushAt: 100,
      flushInterval: 60_000,
      maxSize: 2,
      reporter: (_error, events) => dropped.push(...events.map(({ id }) => id)),
    })
    const scope = new Scope(actions, queue)

    const first = scope.record('configuration.viewed', ADA)
    scope.record('configuration.viewed', ADA)
    scope.record('configuration.viewed', ADA)

    assert.deepEqual(dropped, [first.id])
    assert.equal(queue.size, 2)
    await queue.close()
  })
})
