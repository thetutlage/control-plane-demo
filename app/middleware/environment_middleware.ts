import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { errors } from '@adonisjs/lucid'
import type Environment from '#models/environment'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    environment: Environment
  }
}

/**
 * Resolves the `:environment` route param among the current organization's
 * environments. A slug that belongs to another organization is a 404.
 *
 * Must run after the organization middleware.
 */
export default class EnvironmentMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const environment = ctx.organization.environments.find(
      ({ slug }) => slug === ctx.params.environment
    )
    if (!environment) {
      throw new errors.E_ROW_NOT_FOUND()
    }

    ctx.environment = environment
    return next()
  }
}
