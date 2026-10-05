import { useState } from 'react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import AppScreen from '~/components/app_screen'
import { Form, Link } from '@adonisjs/inertia/react'
import EnvironmentBadge from '~/components/environment_badge'

type App = Data.App.Variants['forList']

type PageProps = InertiaProps<{ app: App }>

/**
 * Deleting an app removes it from every environment, so it asks first and
 * says what happens
 */
function DeleteApp({ app, org }: { app: App; org: string }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => setConfirming(true)}
      >
        Delete app
      </button>
    )
  }

  return (
    <Form
      route="apps.destroy"
      routeParams={{ org, app: app.slug }}
      className="client__confirm"
      onSuccess={() => setConfirming(false)}
    >
      {({ processing }) => (
        <>
          <p>
            {app.name} is removed from every environment, with its credentials and sign-in history.
            Members are signed out of it within 5 minutes.
          </p>
          <div className="client__confirm-actions">
            <button type="submit" className="btn btn--danger btn--sm" disabled={processing}>
              Yes, delete
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Form>
  )
}

/**
 * The app's Overview tab: where it is set up so far
 */
export default function AppsShow({ app, organization, environments = [] }: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <AppScreen app={app} actions={<DeleteApp app={app} org={org} />}>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Environment</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {environments.map((environment) => {
              const setUp = app.environmentIds.includes(environment.id)

              return (
                <tr key={environment.id}>
                  <td>
                    <EnvironmentBadge environment={environment} />
                  </td>
                  <td className={setUp ? 'env-status env-status--set-up' : 'env-status'}>
                    {setUp ? '● Set up' : '○ Not yet'}
                  </td>
                  <td>
                    <Link
                      route="app_environments.show"
                      routeParams={{ org, app: app.slug, environment: environment.slug }}
                    >
                      {setUp ? 'Open' : `Set up in ${environment.name}`}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </AppScreen>
  )
}

AppsShow.layout = [ConsoleLayout]
