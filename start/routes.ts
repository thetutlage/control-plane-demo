/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import env from '#start/env'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').renderInertia('home', {}).as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
    router.get('w', [controllers.Organizations, 'index'])
  })
  .use(middleware.auth())

/**
 * The redirect URI an organization registers at its identity provider. It
 * forwards the provider's answer to the issuer host that started the
 * sign-in.
 */
router
  .get('sign-in/callback/:org', [controllers.SignInCallbacks, 'show'])
  .where('org', router.matchers.slug())

/**
 * Console pages of one organization, under `/w/:org`. Apps, members and
 * roles belong to the organization. An app's setup in one environment
 * sits under `apps/:app/environments/:environment`, where the environment
 * middleware resolves the environment.
 */
router
  .group(() => {
    router.get('overview', [controllers.Overview, 'show'])

    router
      .resource('apps', controllers.Apps)
      .only(['index', 'create', 'store', 'show', 'destroy'])
      .params({ apps: 'app' })
    router
      .group(() => {
        router.get('/', [controllers.AppEnvironments, 'show'])
        router.get('create', [controllers.AppEnvironments, 'create'])
        router.post('/', [controllers.AppEnvironments, 'store'])
        router.get('edit', [controllers.AppEnvironments, 'edit'])
        router.put('/', [controllers.AppEnvironments, 'update'])
        router.delete('/', [controllers.AppEnvironments, 'destroy'])
        router.post('secret', [controllers.AppSecrets, 'store'])
        router
          .resource('members', controllers.AppMembers)
          .only(['create', 'store', 'edit', 'update', 'destroy'])
          .params({ members: 'member' })
          .as('app_members')
      })
      .prefix('apps/:app/environments/:environment')
      .where('environment', router.matchers.slug())
      .use(middleware.environment())

    router
      .resource('members', controllers.Members)
      .only(['index', 'create', 'store', 'show'])
      .params({ members: 'member' })
    router.delete('members/:member/sessions', [controllers.MemberSessions, 'destroy'])

    router.resource('roles', controllers.Roles).except(['show']).params({ roles: 'role' })
    router.get('settings/environments', [controllers.Environments, 'index'])

    router
      .group(() => {
        router
          .resource('identity-providers', controllers.IdentityProviders)
          .except(['show'])
          .params({ 'identity-providers': 'provider' })
      })
      .prefix('settings')
  })
  .prefix('w/:org')
  .where('org', router.matchers.slug())
  .where('app', router.matchers.slug())
  .where('member', router.matchers.number())
  .where('role', router.matchers.number())
  .where('provider', router.matchers.number())
  .use([middleware.auth(), middleware.organization()])

/**
 * The sign-in page of an environment's issuer, on the issuer's own host
 * (`acme.<domain>`, `acme--staging.<domain>`). oidc-provider sends members
 * here; its own endpoints live under `/oauth` and never reach the router.
 */
router
  .group(() => {
    router.get('sign-in/:signInId', [controllers.SignIn, 'show']).as('sign_in.show')
    router.post('sign-in/:signInId', [controllers.SignIn, 'store']).as('sign_in.store')
    router.delete('sign-in/:signInId', [controllers.SignIn, 'destroy']).as('sign_in.destroy')

    router.post('sign-in/:signInId/provider', [controllers.RedirectToProvider])
    router.get('sign-in/:signInId/provider/callback', [controllers.SignInWithProvider])
  })
  .domain(`:issuer.${new URL(env.get('APP_URL')).hostname}`)
  .use(middleware.issuer())
