import { errors } from '@adonisjs/lucid'
import type Environment from '#models/environment'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { EnvironmentKind } from '#values/environment_kind'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    environment: Environment
  }
}

/**
 * Resolves the environment a console page shows, among the current
 * organization's environments:
 *
 * 1. the `environment` input (`?environment=staging`, or a form field), which
 *    a slug of another organization or no environment at all turns into a
 *    404;
 * 2. otherwise the environment last picked in this organization, so the
 *    choice carries over from page to page;
 * 3. otherwise production.
 *
 * Picking an environment on a page (a GET with `?environment=`) remembers it.
 * Forms always send their environment, so a form opened before switching
 * environments in another tab still writes to the environment it showed.
 *
 * Must run after the organization middleware.
 */
export default class EnvironmentMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { organization, request, session } = ctx
    const sessionKey = `environment.${organization.id}`
    const requested: string | undefined = request.input('environment')

    let environment: Environment | undefined
    if (requested) {
      environment = organization.environments.find(({ slug }) => slug === requested)
      if (!environment) {
        throw new errors.E_ROW_NOT_FOUND()
      }
      if (request.method() === 'GET') {
        session.put(sessionKey, environment.slug)
      }
    } else {
      const remembered = session.get(sessionKey)
      environment =
        organization.environments.find(({ slug }) => slug === remembered) ??
        organization.environments.find(({ kind }) => kind === EnvironmentKind.PRODUCTION)!
    }

    ctx.environment = environment
    return next()
  }
}
