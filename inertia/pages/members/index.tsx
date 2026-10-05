import Page from '~/components/page'
import { Users } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'
import { Link } from '@adonisjs/inertia/react'

type PageProps = InertiaProps<{ members: Data.Member.Variants['forList'][] }>

export default function MembersIndex({ members, organization }: PageProps) {
  const routeParams = { org: organization?.slug ?? '' }

  return (
    <Page
      title="Members"
      description="People who sign in to your apps. Each one is the same member in every environment."
      actions={
        <Link route="members.create" routeParams={routeParams} className="btn btn--primary btn--sm">
          Add member
        </Link>
      }
    >
      <div className="table-wrap">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No members yet">
            Members you add show up here.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Active sessions</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <Link route="members.show" routeParams={{ ...routeParams, member: member.id }}>
                      {member.email}
                    </Link>
                  </td>
                  <td>{member.fullName ?? '—'}</td>
                  <td>
                    <span className="badge">{member.status.formatted}</span>
                  </td>
                  <td>{member.activeSessionsCount}</td>
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
