import Page from '~/components/page'
import { Users } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'

type PageProps = InertiaProps<{ members: Data.Member[] }>

export default function MembersIndex({ members }: PageProps) {
  return (
    <Page title="Members" description="People who sign in to this environment's apps.">
      <div className="table-wrap">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No members yet">
            Members you add to this environment show up here.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.email}</td>
                  <td>{member.fullName ?? '—'}</td>
                  <td>
                    <span className="badge">{member.status.formatted}</span>
                  </td>
                  <td>{member.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}

MembersIndex.layout = [ConsoleLayout]
