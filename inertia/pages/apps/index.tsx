import Page from '~/components/page'
import { AppWindow } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Link } from '@adonisjs/inertia/react'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'
import { useConsoleParams } from '~/components/environment_switcher'

type PageProps = InertiaProps<{ apps: Data.App[] }>

export default function AppsIndex({ apps }: PageProps) {
  const routeParams = useConsoleParams()

  return (
    <Page
      title="Apps"
      description="Internal apps that sign their users in through this console."
      actions={
        <Link route="apps.create" routeParams={routeParams} className="btn btn--primary btn--sm">
          Register app
        </Link>
      }
    >
      <div className="table-wrap">
        {apps.length === 0 ? (
          <EmptyState icon={AppWindow} title="No apps yet">
            Register an app to let it sign members in to this environment.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id}>
                  <td>
                    <Link route="apps.show" routeParams={{ ...routeParams, app: app.slug }}>
                      {app.name}
                    </Link>
                  </td>
                  <td className="mono">{app.slug}</td>
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
