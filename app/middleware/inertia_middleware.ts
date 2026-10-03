import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserTransformer from '#transformers/user_transformer'
import OrganizationTransformer from '#transformers/organization_transformer'
import EnvironmentTransformer from '#transformers/environment_transformer'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  share(ctx: HttpContext) {
    /**
     * The share method is called everytime an Inertia page is rendered. In
     * certain cases, a page may get rendered before the session middleware
     * or the auth middleware are executed. For example: During a 404 request.
     *
     * In that case, we must always assume that HttpContext is not fully hydrated
     * with all the properties
     */
    const { auth, request, organization, environment } = ctx as Partial<HttpContext>

    const theme: 'light' | 'dark' =
      request?.plainCookie('app_theme', {
        defaultValue: 'light',
        encoded: false,
      }) ?? 'light'

    /**
     * Data shared with all Inertia pages. Make sure you are using
     * transformers for rich data-types like Models.
     */
    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),

      /**
       * Console context for the layout: the organization, its environments
       * for the switcher, and the environment the current page belongs to.
       */
      organization: ctx.inertia.always(
        organization ? OrganizationTransformer.transform(organization) : undefined
      ),
      environments: ctx.inertia.always(
        organization ? EnvironmentTransformer.transform(organization.environments) : undefined
      ),
      currentEnvironment: ctx.inertia.always(environment?.slug),
      preferences: ctx.inertia.always({ theme }),
    }
  }

  flash(ctx: HttpContext) {
    /**
     * Flash messages travel in the dedicated `flash` field of the page
     * object instead of props, and the client strips them from history
     * state so they never reappear when navigating back.
     */
    const { session } = ctx as Partial<HttpContext>

    const success: string | undefined = session?.flashMessages.get('success')
    const error: string | undefined = session?.flashMessages.get('error')

    /**
     * A production client secret, shown once right after the client is
     * created
     */
    const clientSecret: { clientId: string; secret: string } | undefined =
      session?.flashMessages.get('clientSecret')

    return { success, error, clientSecret }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
