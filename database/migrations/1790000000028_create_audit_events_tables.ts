import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The audit log of the control plane's own events: access, sign-in and
 * configuration (plan §3, "Audit events"). What the organization's apps
 * send goes elsewhere.
 *
 * `audit_events` has one row per event. Its ID is a UUID version 7, set
 * when the event happened, so it is also the newest-first order and the
 * paging cursor. `audit_event_refs` has one row per thing an event
 * involves: the actor (position 0) and each subject. A member's or an
 * app's page finds its events through it. Refs point at nothing: the
 * label is the record, and events outlive what they describe.
 *
 * An event belongs to an organization, and to an environment unless it
 * is about the organization as a whole. Events are read through those
 * two models (`auditEvents`), which is what keeps a tenant to its own.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('audit_events', (table) => {
      table.uuid('id').primary()
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')
      table
        .integer('environment_id')
        .unsigned()
        .nullable()
        .references('environments.id')
        .onDelete('CASCADE')
      table.timestamp('occurred_at', { useTz: true }).notNullable()
      table.string('action').notNullable()
      table.string('category').notNullable()
      table.text('summary').notNullable()
      table.jsonb('data').notNullable().defaultTo('{}')
      table.jsonb('context').notNullable().defaultTo('{}')
      table.uuid('batch_id').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index(['organization_id', 'id'])
      table.index(['organization_id', 'category', 'id'])
      table.index(['batch_id'])
    })

    this.schema.createTable('audit_event_refs', (table) => {
      table.uuid('event_id').notNullable().references('audit_events.id').onDelete('CASCADE')
      table.smallint('position').notNullable()
      table.string('role', 16).notNullable()
      table.string('type').notNullable()
      table.string('ref_id').notNullable()
      table.string('label', 1024).notNullable()

      table.primary(['event_id', 'position'])
      table.index(['type', 'ref_id', 'event_id'])
    })
  }

  async down() {
    this.schema.dropTable('audit_event_refs')
    this.schema.dropTable('audit_events')
  }
}
