import { type ReactNode } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import NavLink from '~/components/nav_link'
import { useConsoleParams } from '~/components/environment_switcher'

/**
 * The frame of an app's pages: the app's name and details, then the tabs
 */
export default function AppScreen({ app, children }: { app: Data.App; children: ReactNode }) {
  const routeParams = { ...useConsoleParams(), app: app.slug }

  return (
    <Page
      title={app.name}
      description={
        <>
          <code className="mono">{app.slug}</code> · Registered {app.createdAt}
        </>
      }
    >
      <nav className="tabs" aria-label={`${app.name} sections`}>
        <NavLink route="apps.show" routeParams={routeParams} exact className="tabs__item">
          Overview
        </NavLink>
        <NavLink route="app_settings.show" routeParams={routeParams} className="tabs__item">
          Settings
        </NavLink>
      </nav>
      {children}
    </Page>
  )
}
