import Page from '~/components/page'
import { AppWindow } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Link } from '@adonisjs/inertia/react'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'
import EnvironmentBadge from '~/components/environment_badge'

type PageProps = InertiaProps<{ apps: Data.App.Variants['forList'][] }>

/**
 * The organization's apps, with a column per environment showing how far
 * each app has reached
 */
export default function AppsIndex({ apps, organization, environments = [] }: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <Page
      title="Apps"
      description="Internal apps, and how far each one has reached."
      actions={
        <Link route="apps.create" routeParams={{ org }} className="btn btn--primary btn--sm">
          Register app
        </Link>
      }
    >
      <div className="table-wrap">
        {apps.length === 0 ? (
          <EmptyState icon={AppWindow} title="No apps yet">
            Register an app, then set it up in each environment it reaches.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                {environments.map((environment) => (
                  <th key={environment.id}>
                    <EnvironmentBadge environment={environment} />
                  </th>
                ))}
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id}>
                  <td>
                    <Link route="apps.show" routeParams={{ org, app: app.slug }}>
                      {app.name}
                    </Link>
                  </td>
                  {environments.map((environment) =>
                    app.environmentIds.includes(environment.id) ? (
                      <td key={environment.id} className="env-status env-status--set-up">
                        ● Set up
                      </td>
                    ) : (
                      <td key={environment.id} className="env-status">
                        ○ Not yet
                      </td>
                    )
                  )}
                  <td>{app.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}

AppsIndex.layout = [ConsoleLayout]
