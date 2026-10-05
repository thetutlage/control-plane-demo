import Page from '~/components/page'
import { Link } from '@adonisjs/inertia/react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'

type PageProps = InertiaProps<{
  environmentSummaries: Data.Environment.Variants['forOverview'][]
  appsCount: number
}>

export default function OverviewShow({ environmentSummaries, appsCount, organization }: PageProps) {
  return (
    <Page
      title="Overview"
      description={`${organization?.name} has ${appsCount} ${appsCount === 1 ? 'app' : 'apps'} and ${environmentSummaries.length} environments. Each environment is fully isolated.`}
    >
      <div className="cards">
        {environmentSummaries.map((environment) => (
          <Link
            key={environment.id}
            route="members.index"
            routeParams={{ org: organization?.slug ?? '' }}
            qs={{ environment: environment.slug }}
            className="card"
          >
            <span className="card__title">{environment.name}</span>
            <span className="card__meta">
              {environment.membersCount} {environment.membersCount === 1 ? 'member' : 'members'}
            </span>
          </Link>
        ))}
      </div>
    </Page>
  )
}

OverviewShow.layout = [ConsoleLayout]
