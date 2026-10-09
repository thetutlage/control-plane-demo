import type App from '#models/app'
import type Environment from '#models/environment'
import type Organization from '#models/organization'
import { setupUrls } from '#audit/actions'
import { auditedTransaction } from '#audit/transaction'
import type { HttpContext } from '@adonisjs/core/http'
import { EnvironmentKind } from '#values/environment_kind'
import { appEnvironmentValidator } from '#validators/app'
import AppTransformer from '#transformers/app_transformer'
import AppMemberTransformer from '#transformers/app_member_transformer'
import AppEnvironmentTransformer from '#transformers/app_environment_transformer'

/**
 * An app's setup in one environment, shown on the app's tab for that
 * environment. An app has at most one setup per environment.
 */
export default class AppEnvironmentsController {
  /**
   * One of the organization's apps, with the environments it is set up in.
   * Another organization's app is a 404.
   */
  async #findApp(organization: Organization, slug: string) {
    return organization
      .related('apps')
      .query()
      .where('slug', slug)
      .preload('environments')
      .firstOrFail()
  }

  /**
   * The app's setup in the environment, with the environment. It is
   * missing when the app hasn't reached the environment.
   */
  #setup(app: App, environment: Environment) {
    return app
      .related('environments')
      .query()
      .where('environment_id', environment.id)
      .preload('environment')
  }

  #toTab(
    response: HttpContext['response'],
    organization: Organization,
    app: App,
    environment: Environment
  ) {
    return response.redirect().toRoute('app_environments.show', {
      org: organization.slug,
      app: app.slug,
      environment: environment.slug,
    })
  }

  /**
   * The app's tab for the environment: its setup and the members with
   * access to it there, or that it isn't set up yet
   */
  async show({ inertia, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, params.app)
    const setup = await this.#setup(app, environment).first()
    const members = setup
      ? await app
          .related('members')
          .query()
          .where('environment_id', environment.id)
          .preload('member', (query) =>
            query.withCount('sessions', (sessions) =>
              sessions.where('environment_id', environment.id).withScopes((scopes) => scopes.live())
            )
          )
          .preload('roles', (roles) => roles.orderBy('name', 'asc'))
          .orderByRaw('last_signed_in_at desc nulls last')
          .orderBy('created_at', 'asc')
      : []

    return inertia.render('app_environments/show', {
      app: AppTransformer.transform(app).useVariant('forList'),
      environmentSlug: environment.slug,
      issuerUrl: environment.issuerUrl(organization.slug),
      setup: setup ? AppEnvironmentTransformer.transform(setup) : null,
      members: AppMemberTransformer.transform(members).useVariant('forApp'),
    })
  }

  async create({ inertia, response, session, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, params.app)
    if (await this.#setup(app, environment).first()) {
      session.flash('error', `${app.name} is already set up in ${environment.name}.`)
      return this.#toTab(response, organization, app, environment)
    }

    return inertia.render('app_environments/create', {
      app: AppTransformer.transform(app).useVariant('forList'),
      environmentSlug: environment.slug,
    })
  }

  /**
   * Sets the app up in the environment, with a new client ID and secret. A
   * production secret is flashed so the tab can show it this once.
   */
  async store(ctx: HttpContext) {
    const { request, response, session, params, organization, environment, auth, audit } = ctx
    const app = await this.#findApp(organization, params.app)
    if (await this.#setup(app, environment).first()) {
      session.flash('error', `${app.name} is already set up in ${environment.name}.`)
      return this.#toTab(response, organization, app, environment)
    }

    const isProduction = environment.kind === EnvironmentKind.PRODUCTION
    const payload = await request.validateUsing(appEnvironmentValidator, {
      meta: { isProduction },
    })
    const setup = await auditedTransaction(audit, async (trx, batch) => {
      const created = await environment.useTransaction(trx).setUpApp(app, {
        appUrl: payload.appUrl,
        redirectUris: payload.redirectUris,
        postLogoutRedirectUris: payload.postLogoutRedirectUris ?? [],
      })
      batch.record('configuration.app_set_up', auth.getUserOrFail(), app, environment, created)
      return created
    })

    if (isProduction) {
      session.flash('clientSecret', { clientId: setup.clientId, secret: setup.secret })
    }
    session.flash('success', `${app.name} can now sign members in.`)
    return this.#toTab(response, organization, app, environment)
  }

  async edit({ inertia, params, organization, environment }: HttpContext) {
    const app = await this.#findApp(organization, params.app)
    const setup = await this.#setup(app, environment).firstOrFail()

    return inertia.render('app_environments/edit', {
      app: AppTransformer.transform(app).useVariant('forList'),
      environmentSlug: environment.slug,
      setup: AppEnvironmentTransformer.transform(setup),
    })
  }

  /**
   * Saves the setup's URLs. Its credentials don't change. Saving them
   * unchanged records nothing.
   */
  async update(ctx: HttpContext) {
    const { request, response, session, params, organization, environment, auth, audit } = ctx
    const app = await this.#findApp(organization, params.app)
    const setup = await this.#setup(app, environment).firstOrFail()
    const payload = await request.validateUsing(appEnvironmentValidator, {
      meta: { isProduction: environment.kind === EnvironmentKind.PRODUCTION },
    })

    const before = setupUrls(setup)
    setup.appUrl = payload.appUrl
    setup.redirectUris = payload.redirectUris
    setup.postLogoutRedirectUris = payload.postLogoutRedirectUris ?? []
    const after = setupUrls(setup)

    await auditedTransaction(audit, async (trx, batch) => {
      await setup.useTransaction(trx).save()
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        batch.record(
          'configuration.app_setup_changed',
          auth.getUserOrFail(),
          app,
          environment,
          before,
          after
        )
      }
    })

    session.flash('success', `Saved ${app.name}.`)
    return this.#toTab(response, organization, app, environment)
  }

  /**
   * Removes the app from the environment. Its grants and sign-in history
   * there go with it, through the foreign keys, so members are signed out
   * of it at their next refresh.
   */
  async destroy(ctx: HttpContext) {
    const { response, session, params, organization, environment, auth, audit } = ctx
    const app = await this.#findApp(organization, params.app)
    const setup = await this.#setup(app, environment).firstOrFail()
    await auditedTransaction(audit, async (trx, batch) => {
      await setup.useTransaction(trx).delete()
      batch.record('configuration.app_setup_removed', auth.getUserOrFail(), app, environment)
    })

    session.flash('success', `Removed ${app.name}. Members were signed out of it.`)
    return this.#toTab(response, organization, app, environment)
  }
}
