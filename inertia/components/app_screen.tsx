import { type ReactNode } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/react'
import NavLink from '~/components/nav_link'

type App = Data.App.Variants['forList']

/**
 * The frame of an app's pages: the app's name and details, then an
 * Overview tab and one tab per environment. An environment's dot is
 * filled when the app is set up there.
 */
export default function AppScreen({
  app,
  actions,
  children,
}: {
  app: App
  actions?: ReactNode
  children: ReactNode
}) {
  const { props } = usePage()
  const routeParams = { org: props.organization?.slug ?? '', app: app.slug }

  return (
    <Page
      title={app.name}
      description={
        <>
          <code className="mono">{app.slug}</code> · Registered {app.createdAt}
        </>
      }
      actions={actions}
    >
      <nav className="tabs" aria-label={`${app.name} sections`}>
        <NavLink route="apps.show" routeParams={routeParams} exact className="tabs__item">
          Overview
        </NavLink>
        {(props.environments ?? []).map((environment) => {
          const setUp = app.environmentIds.includes(environment.id)
          const kind = environment.kind.formatted.toLowerCase()

          return (
            <NavLink
              key={environment.id}
              route="app_environments.show"
              routeParams={{ ...routeParams, environment: environment.slug }}
              className="tabs__item"
            >
              <span
                className={`env-dot env-dot--${kind}${setUp ? ' env-dot--set-up' : ''}`}
                aria-hidden="true"
              />
              {environment.name}
            </NavLink>
          )
        })}
      </nav>
      {children}
    </Page>
  )
}
