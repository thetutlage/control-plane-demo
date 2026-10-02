import type { HttpContext } from '@adonisjs/core/http'
import AuditEventTransformer from '#transformers/audit_event_transformer'

export default class AuditEventsController {
  async index({ inertia, environment }: HttpContext) {
    const events = await environment
      .related('auditEvents')
      .query()
      .orderBy('created_at', 'desc')
      .limit(50)

    return inertia.render('audit_events/index', {
      events: AuditEventTransformer.transform(events),
    })
  }
}
