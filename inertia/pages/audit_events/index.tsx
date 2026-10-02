import Page from '~/components/page'
import { ScrollText } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'

type PageProps = InertiaProps<{ events: Data.AuditEvent[] }>

export default function AuditEventsIndex({ events }: PageProps) {
  return (
    <Page title="Audit log" description="Who did what in this environment, newest first.">
      <div className="table-wrap">
        {events.length === 0 ? (
          <EmptyState icon={ScrollText} title="No events yet">
            Sign-ins, role changes and app activity in this environment show up here.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="mono">{event.occurredAt}</td>
                  <td>{event.actorLabel ?? '—'}</td>
                  <td className="mono">{event.action}</td>
                  <td className="mono">{event.target ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}

AuditEventsIndex.layout = [ConsoleLayout]
