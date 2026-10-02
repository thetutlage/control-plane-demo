import type AuditEvent from '#models/audit_event'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class AuditEventTransformer extends BaseTransformer<AuditEvent> {
  toObject() {
    const { targetType, targetId } = this.resource

    return {
      ...this.pick(this.resource, ['id', 'action', 'actorLabel', 'ip']),
      target: targetType ? `${targetType}${targetId ? `:${targetId}` : ''}` : null,
      occurredAt: this.resource.createdAt.toFormat('d LLL yyyy, HH:mm:ss'),
    }
  }
}
