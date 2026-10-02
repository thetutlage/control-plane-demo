import Page from '~/components/page'
import { AppWindow } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'

type PageProps = InertiaProps<{ apps: Data.App[] }>

export default function AppsIndex({ apps }: PageProps) {
  return (
    <Page title="Apps" description="Internal apps that sign their users in through this console.">
      <div className="table-wrap">
        {apps.length === 0 ? (
          <EmptyState icon={AppWindow} title="No apps yet">
            Registered apps show up here, with a client in each environment.
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
                  <td>{app.name}</td>
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
