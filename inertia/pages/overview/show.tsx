import Page from '~/components/page'
import { Link } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { useConsoleParams } from '~/components/environment_switcher'

type PageProps = InertiaProps<{ appsCount: number; membersCount: number }>

export default function OverviewShow({ appsCount, membersCount, organization }: PageProps) {
  const routeParams = useConsoleParams()

  return (
    <Page title="Overview" description={organization?.name}>
      <div className="cards">
        <Link route="apps.index" routeParams={routeParams} className="card">
          <span className="card__title">Apps</span>
          <span className="card__meta">
            {appsCount} {appsCount === 1 ? 'app' : 'apps'}
          </span>
        </Link>
        <Link route="members.index" routeParams={routeParams} className="card">
          <span className="card__title">Members</span>
          <span className="card__meta">
            {membersCount} {membersCount === 1 ? 'member' : 'members'}
          </span>
        </Link>
      </div>
    </Page>
  )
}

OverviewShow.layout = [ConsoleLayout]
