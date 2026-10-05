import { errors } from '@adonisjs/lucid'
import type Environment from '#models/environment'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    environment: Environment
  }
}

/**
 * Resolves the `:environment` route param among the current organization's
 * environments. A slug of another organization's environment is a 404. The
 * environment is remembered, so the console opens on it next time.
 *
 * Must run after the organization middleware.
 */
export default class EnvironmentMiddleware {
  /**
   * The session key holding the environment last opened in an organization
   */
  static sessionKey(organizationId: number) {
    return `environment.${organizationId}`
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const { organization, params, session } = ctx
    const environment = organization.environments.find(({ slug }) => slug === params.environment)
    if (!environment) {
      throw new errors.E_ROW_NOT_FOUND()
    }

    session.put(EnvironmentMiddleware.sessionKey(organization.id), environment.slug)
    ctx.environment = environment
    return next()
  }
}
