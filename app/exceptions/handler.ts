import { errors as oidcErrors } from 'oidc-provider'
import Environment from '#models/environment'
import { errorPage } from '#oidc/error_pages'
import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = app.inProduction

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (_, { inertia }) => inertia.render('errors/not_found', {}),
    '500..599': (_, { inertia }) => inertia.render('errors/server_error', {}),
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (Environment.isIssuerHost(ctx.request.host())) {
      const page = this.#issuerErrorPage(error)
      if (page) {
        return ctx.response.status(page.status).send(await ctx.inertia.render('errors/oidc', page))
      }
    }
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    if (error instanceof oidcErrors.OIDCProviderError && error.statusCode < 500) {
      return
    }
    return super.report(error, ctx)
  }

  /**
   * The page a member sees for an error on an issuer host, outside
   * `/oauth` (whose errors oidc-provider answers itself). That is the
   * sign-in page: oidc-provider errors come from it reading or finishing a
   * paused sign-in. Validation and CSRF errors keep their own handling
   * (back to the form), and so do crashes while debugging, to keep the
   * debug page.
   */
  #issuerErrorPage(error: unknown) {
    if (error instanceof oidcErrors.SessionNotFound) {
      return { status: error.statusCode, ...errorPage('expired', error.error) }
    }
    if (error instanceof oidcErrors.OIDCProviderError) {
      return { status: error.statusCode, ...errorPage('rejected', error.error) }
    }

    const status = (error as { status?: number }).status ?? 500
    if (status === 404) {
      return { status, ...errorPage('not_found', 'not_found') }
    }
    if (status >= 500 && !this.debug) {
      return { status, ...errorPage('server_error', 'server_error') }
    }
    return null
  }
}
