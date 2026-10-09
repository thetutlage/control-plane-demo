import { test } from '@japa/runner'
import { categoryOf, Collector, defineActions, MemoryStore, Scope } from '../index.js'
import { actions, ADA, BEN, INVOICES, s, SARA } from './helpers.js'

test.group('Audit logs | catalogue', () => {
  test('a subject function adds its kind to the ID and label', ({ assert }) => {
    assert.deepEqual(s.member(SARA), { type: 'member', id: 12, label: 'sara@acme.test' })
    assert.deepEqual(s.app(INVOICES), { type: 'app', id: 7, label: 'Invoices' })
  })

  test('an event carries what its action returned', ({ assert }) => {
    const scope = new Scope(actions, new Collector(new MemoryStore()))

    const event = scope.record('access.role_assigned', ADA, SARA, INVOICES, [], ['Approver'])

    assert.equal(event.action, 'access.role_assigned')
    assert.equal(event.summary, 'ada@acme.test changed the roles of sara@acme.test on Invoices')
    assert.deepEqual(event.actor, { type: 'user', id: 1, label: 'ada@acme.test' })
    assert.deepEqual(event.subjects, [
      { type: 'member', id: 12, label: 'sara@acme.test' },
      { type: 'app', id: 7, label: 'Invoices' },
    ])
    assert.deepEqual(event.data, { before: [], after: ['Approver'] })
    assert.isNull(event.batchId)
  })

  test('an action takes two subjects of the same kind', ({ assert }) => {
    const scope = new Scope(actions, new Collector(new MemoryStore()))

    const event = scope.record('access.transferred', ADA, SARA, BEN, INVOICES)

    assert.deepEqual(
      event.subjects.map(({ type, id }) => `${type}:${id}`),
      ['member:12', 'member:13', 'app:7']
    )
  })

  test('a missing subject is left out, and the system is a null actor', ({ assert }) => {
    const scope = new Scope(actions, new Collector(new MemoryStore()))

    const unknown = scope.record('sign_in.refused', INVOICES, 'nobody@acme.test', null)
    const known = scope.record('sign_in.refused', INVOICES, SARA.email, SARA)

    assert.isNull(unknown.actor)
    assert.lengthOf(unknown.subjects, 1)
    assert.lengthOf(known.subjects, 2)
  })

  test('an action without data stores an empty object', ({ assert }) => {
    const scope = new Scope(actions, new Collector(new MemoryStore()))

    assert.deepEqual(scope.record('configuration.viewed', ADA).data, {})
  })

  test('IDs and times are set when the event is created, and IDs sort by creation', ({
    assert,
  }) => {
    const scope = new Scope(actions, new Collector(new MemoryStore()))
    const before = Date.now()

    const events = Array.from({ length: 50 }, () => scope.record('configuration.viewed', ADA))

    const ids = events.map(({ id }) => id)
    assert.match(ids[0], /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    assert.lengthOf(new Set(ids), 50)
    assert.deepEqual([...ids].sort(), ids)
    assert.isAtLeast(events[0].occurredAt.getTime(), before)
  })

  test('the category is the part of the name before the first dot', ({ assert }) => {
    assert.equal(categoryOf('access.role_assigned'), 'access')
    assert.equal(categoryOf('sign_in.provider.refused'), 'sign_in')
  })

  test('an action must be named category.name', ({ assert }) => {
    assert.throws(
      () =>
        defineActions({
          // @ts-expect-error a name without a category
          role_assigned: () => ({ actor: null, subjects: [], summary: '' }),
        }),
      'Audit action "role_assigned" must be named "category.name"'
    )
  })

  test('calls are checked against the catalogue', ({ assert }) => {
    const scope = new Scope(actions, new Collector(new MemoryStore()))

    // @ts-expect-error an action the catalogue doesn't have
    assert.throws(() => scope.record('access.role_asigned', ADA), 'Unknown audit action')

    /**
     * Never run: these only have to fail to compile
     */
    const wrongCalls = () => {
      // @ts-expect-error a missing argument
      scope.record('access.transferred', ADA, SARA, BEN)

      // @ts-expect-error an argument of the wrong kind
      scope.record('access.role_assigned', ADA, INVOICES, SARA, [], [])

      // @ts-expect-error data of the wrong type
      scope.record('access.role_assigned', ADA, SARA, INVOICES, 'none', ['Approver'])
    }
    assert.isFunction(wrongCalls)
  })
})
