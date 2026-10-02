import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type Organization from '#models/organization'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    organization: Organization
  }
}

/**
 * Resolves the `:org` route param among the signed-in user's own
 * organizations, with its environments. A slug of an organization the user
 * does not belong to is a 404, even when that organization exists.
 * Everything a console page reads is reached through this organization.
 *
 * Must run after the auth middleware.
 */
export default class OrganizationMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    ctx.organization = await ctx.auth
      .getUserOrFail()
      .related('organizations')
      .query()
      .where('slug', ctx.params.org)
      .preload('environments', (query) => query.orderBy('kind', 'asc'))
      .firstOrFail()

    return next()
  }
}
