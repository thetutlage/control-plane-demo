import type { HttpContext } from '@adonisjs/core/http'
import AuditEvent from '#models/audit_event'
import { auditLogFiltersValidator } from '#validators/audit_log'
import AuditEventTransformer from '#transformers/audit_event_transformer'

const PER_PAGE = 50

export default class AuditLogsController {
  /**
   * The organization's audit events, newest first, a page at a time,
   * narrowed to a category or an environment when asked. An event of the
   * organization itself, such as a new role, belongs to no environment,
   * so it is left out when an environment is asked for.
   */
  async index({ inertia, request, organization }: HttpContext) {
    const { category, before, ...filters } = await request.validateUsing(auditLogFiltersValidator)
    const environment = organization.environments.find(({ slug }) => slug === filters.environment)

    /**
     * The page scope reads one event more than the page holds, which
     * tells whether older ones follow
     */
    const events = await organization
      .related('auditEvents')
      .query()
      .if(category, (query) => query.where('category', category!))
      .if(environment, (query) => query.where('environment_id', environment!.id))
      .preload('refs')
      .withScopes((scopes) => scopes.page(PER_PAGE, before))

    return inertia.render('audit_logs/index', {
      events: AuditEventTransformer.transform(events.slice(0, PER_PAGE)),
      category: category ?? null,
      environment: environment?.slug ?? null,
      before: before ?? null,
      older: events.length > PER_PAGE ? events[PER_PAGE - 1].id : null,
    })
  }

  /**
   * The events of one batch, such as an import that wrote many events at
   * once, for the batch link on an event.
   */
  async batch({ inertia, params }: HttpContext) {
    const events = await AuditEvent.query()
      .where('batch_id', params.batch)
      .orderBy('id', 'desc')
      .preload('refs')
    return inertia.render('audit_logs/index', {
      events: AuditEventTransformer.transform(events),
      category: null,
      environment: null,
      before: null,
      older: null,
    })
  }
}
