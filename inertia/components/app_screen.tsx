import { type ReactNode } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/react'
import NavLink from '~/components/nav_link'
import EnvironmentSwitcher from '~/components/environment_switcher'

/**
 * The frame of an app's pages: the app's name and details, the environment
 * switcher, then the tabs. Every tab shows the chosen environment.
 */
export default function AppScreen({ app, children }: { app: Data.App; children: ReactNode }) {
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
    >
      <EnvironmentSwitcher />
      <nav className="tabs" aria-label={`${app.name} sections`}>
        <NavLink route="apps.show" routeParams={routeParams} exact className="tabs__item">
          Overview
        </NavLink>
        <NavLink route="apps.settings" routeParams={routeParams} className="tabs__item">
          Settings
        </NavLink>
      </nav>
      {children}
    </Page>
  )
}
