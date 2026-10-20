import Page from '~/components/page'
import { ScrollText } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'
import { Link } from '@adonisjs/inertia/react'
import EnvironmentBadge from '~/components/environment_badge'

type Category = 'access' | 'sign_in' | 'configuration'

type PageProps = InertiaProps<{
  events: Data.AuditEvent[]
  category: Category | null
  environment: string | null
  before: string | null
  older: string | null
}>

const CATEGORIES: { label: string; value: Category | null }[] = [
  { label: 'All', value: null },
  { label: 'Access', value: 'access' },
  { label: 'Sign-in', value: 'sign_in' },
  { label: 'Configuration', value: 'configuration' },
]

/**
 * What an event's row opens to: everything kept about it
 */
function EventDetails({ event }: { event: Data.AuditEvent }) {
  return (
    <dl className="kv">
      <dt>Action</dt>
      <dd>
        <code className="mono">{event.action}</code>
      </dd>
      <dt>Done by</dt>
      <dd>{event.actor ?? 'Not a signed-in person'}</dd>
      {event.subjects.length > 0 && (
        <>
          <dt>Involves</dt>
          <dd>
            <ul className="kv__list">
              {event.subjects.map((subject, index) => (
                <li key={index}>
                  {subject.label} <span className="badge">{subject.type}</span>
                </li>
              ))}
            </ul>
          </dd>
        </>
      )}
      {event.data.map(({ key, value }) => (
        <div key={key} style={{ display: 'contents' }}>
          <dt>
            <code className="mono">{key}</code>
          </dt>
          <dd>
            <code className="mono">{value}</code>
          </dd>
        </div>
      ))}
      {event.ip && (
        <>
          <dt>IP address</dt>
          <dd>{event.ip}</dd>
        </>
      )}
      {event.userAgent && (
        <>
          <dt>Browser</dt>
          <dd>{event.userAgent}</dd>
        </>
      )}
      {event.requestId && (
        <>
          <dt>Request ID</dt>
          <dd>
            <code className="mono">{event.requestId}</code>
          </dd>
        </>
      )}
    </dl>
  )
}

export default function AuditLogsIndex({
  events,
  category,
  environment,
  before,
  older,
  organization,
  environments = [],
}: PageProps) {
  const routeParams = { org: organization?.slug ?? '' }

  /**
   * The query string of a link that changes one filter and keeps the
   * other. Changing a filter starts again from the newest event.
   */
  const qs = (filters: { category?: Category | null; environment?: string | null }) => {
    const next = { category, environment, ...filters }
    return {
      ...(next.category ? { category: next.category } : {}),
      ...(next.environment ? { environment: next.environment } : {}),
    }
  }

  return (
    <Page
      title="Audit logs"
      description="Every access change, sign-in and configuration change in your organization."
    >
      <nav className="tabs" aria-label="Categories">
        {CATEGORIES.map(({ label, value }) => (
          <Link
            key={label}
            route="audit_logs.index"
            routeParams={routeParams}
            qs={qs({ category: value })}
            className="tabs__item"
            aria-current={category === value ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <nav className="filters" aria-label="Environments">
        <Link
          route="audit_logs.index"
          routeParams={routeParams}
          qs={qs({ environment: null })}
          className="filters__item"
          aria-current={environment === null ? 'true' : undefined}
        >
          All environments
        </Link>
        {environments.map(({ id, name, slug }) => (
          <Link
            key={id}
            route="audit_logs.index"
            routeParams={routeParams}
            qs={qs({ environment: slug })}
            className="filters__item"
            aria-current={environment === slug ? 'true' : undefined}
          >
            {name}
          </Link>
        ))}
      </nav>

      <div className="table-wrap">
        {events.length === 0 ? (
          <EmptyState icon={ScrollText} title="No events">
            {category || environment || before
              ? 'Nothing was recorded that matches.'
              : 'What happens in your organization shows up here.'}
          </EmptyState>
        ) : (
          <table className="table table--events">
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Environment</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const eventEnvironment = environments.find(({ id }) => id === event.environmentId)

                return (
                  <tr key={event.id}>
                    <td className="table__when">{event.occurredAt}</td>
                    <td>
                      <details className="event">
                        <summary>{event.summary}</summary>
                        <EventDetails event={event} />
                      </details>
                    </td>
                    <td>
                      {eventEnvironment && <EnvironmentBadge environment={eventEnvironment} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {(before || older) && (
        <nav className="pager" aria-label="Pages">
          {before && (
            <Link
              route="audit_logs.index"
              routeParams={routeParams}
              qs={qs({})}
              className="btn btn--secondary btn--sm"
            >
              Newest events
            </Link>
          )}
          {older && (
            <Link
              route="audit_logs.index"
              routeParams={routeParams}
              qs={{ ...qs({}), before: older }}
              className="btn btn--secondary btn--sm"
            >
              Older events
            </Link>
          )}
        </nav>
      )}
    </Page>
  )
}

AuditLogsIndex.layout = [ConsoleLayout]
