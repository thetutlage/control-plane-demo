import { BaseTransformer } from '@adonisjs/core/transformers'
import type AuditEvent from '#models/audit_event'

/**
 * An audit event as the console shows it: the sentence, and the details
 * a row opens to. Expects `refs` to be preloaded.
 */
export default class AuditEventTransformer extends BaseTransformer<AuditEvent> {
  toObject() {
    const { ip, userAgent, requestId } = this.resource.context

    return {
      ...this.pick(this.resource, ['id', 'action', 'category', 'summary', 'environmentId']),
      occurredAt: this.resource.occurredAt.toFormat('d LLL yyyy, HH:mm:ss'),

      /**
       * Null when the system did it, or when who did it isn't known
       */
      actor: this.resource.actor?.label ?? null,
      subjects: this.resource.subjects.map(({ type, label }) => ({ type, label })),

      /**
       * What the action kept, a value per key. Anything but text is
       * shown as JSON.
       */
      data: Object.entries(this.resource.data).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      })),
      ip: typeof ip === 'string' ? ip : null,
      userAgent: typeof userAgent === 'string' ? userAgent : null,
      requestId: typeof requestId === 'string' ? requestId : null,
    }
  }
}
