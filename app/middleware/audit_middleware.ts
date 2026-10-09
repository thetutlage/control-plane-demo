import { requestScope, type AuditScope } from '#audit/scope'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    /**
     * Records audit events for this request. `audit.record()` is written
     * when the request ends; events that must be saved with a change go
     * through `audit.batch()`, flushed in the change's transaction.
     */
    audit: AuditScope
  }
}

/**
 * Gives every request its own audit scope, stamped with the request's
 * ID, IP address and browser. The middleware that resolve the tenant add
 * the organization and the environment. What the scope collected is
 * written when the request ends, before the response is sent, also when
 * the request failed: the framework handles the error below, so `next`
 * returns either way.
 */
export default class AuditMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    ctx.audit = requestScope(ctx)

    await next()
    await ctx.audit.flush()
  }
}
