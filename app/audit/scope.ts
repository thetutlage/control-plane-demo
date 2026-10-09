import { Collector, Scope } from '#auditlogs/index'
import { actions } from '#audit/actions'
import { auditStore, reportUnwritten } from '#audit/store'
import type { HttpContext } from '@adonisjs/core/http'
import type { LucidStoreOptions } from '#auditlogs/src/stores/lucid'

export type AuditScope = Scope<typeof actions, LucidStoreOptions>

/**
 * The audit scope of one request, stamped with its ID, IP address and
 * browser. Events recorded on it are held until whoever made it flushes
 * it, when the request ends.
 */
export function requestScope(ctx: HttpContext, context: Record<string, unknown> = {}): AuditScope {
  return new Scope(actions, new Collector(auditStore, { reporter: reportUnwritten }), {
    requestId: ctx.request.id(),
    ip: ctx.request.ip(),
    userAgent: ctx.request.header('user-agent') ?? null,
    ...context,
  })
}
