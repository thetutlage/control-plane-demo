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
 * Console pages of one organization, under `/w/:org`. Pages that show one
 * environment's data use the environment middleware, which resolves it
 * from `?environment=` or the last one picked; they only ever read data
 * through that environment.
 */
router
  .group(() => {
    router.get('overview', [controllers.Overview, 'show'])
    router
      .resource('apps', controllers.Apps)
      .only(['index', 'create', 'store'])
      .params({ apps: 'app' })
      .where('app', router.matchers.slug())

    router
      .group(() => {
        router.get('apps/:app', [controllers.Apps, 'show']).as('apps.show')
        router.get('apps/:app/settings', [controllers.Apps, 'settings']).as('apps.settings')
        router
          .shallowResource('apps.clients', controllers.AppClients)
          .only(['create', 'store'])
          .params({ apps: 'app' })
        router.resource('members', controllers.Members).only(['index', 'create', 'store'])
        router.get('roles', [controllers.Roles, 'index'])
      })
      .where('app', router.matchers.slug())
      .use(middleware.environment())

    router
      .shallowResource('apps.clients', controllers.AppClients)
      .only(['edit', 'update', 'destroy'])
      .params({ clients: 'client' })
      .where('client', router.matchers.number())
    router
      .post('clients/:client/secret', [controllers.AppClients, 'rotateSecret'])
      .as('apps.clients.rotate_secret')
      .where('client', router.matchers.number())

    router
      .group(() => {
        router.get('members/:member', [controllers.Members, 'show']).as('members.show')
        router
          .post('members/:member/sign-out', [controllers.Members, 'signOutEverywhere'])
          .as('members.sign_out_everywhere')
      })
      .where('member', router.matchers.number())
  })
  .prefix('w/:org')
  .where('org', router.matchers.slug())
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
  })
  .domain(`:issuer.${new URL(env.get('APP_URL')).hostname}`)
  .use(middleware.issuer())
