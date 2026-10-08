import { errorPage } from '#oidc/error_pages'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * A sign-in through the organization's identity provider that can't be
 * finished. The member sees one of two pages and never the reason, which
 * is written to the log for whoever looks into it.
 */
export default class ProviderSignInException extends Exception {
  static status = 403
  static code = 'E_PROVIDER_SIGN_IN'

  /**
   * `refused`: the provider signed someone in, and we won't.
   * `provider_unreachable`: the provider couldn't be asked.
   */
  constructor(
    public page: 'refused' | 'provider_unreachable',
    public reason: string
  ) {
    super(`Sign-in through the identity provider failed: ${reason}`)
  }

  async handle(error: this, ctx: HttpContext) {
    const status = error.page === 'refused' ? 403 : 502
    const code = error.page === 'refused' ? 'sign_in_refused' : 'provider_unreachable'

    const page = await ctx.inertia.render('errors/oidc', errorPage(error.page, code))
    return ctx.response.status(status).send(page)
  }

  async report(error: this, ctx: HttpContext) {
    ctx.logger.warn({ reason: error.reason }, error.message)
  }
}
