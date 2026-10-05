import { Users } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import AppScreen from '~/components/app_screen'
import { Link } from '@adonisjs/inertia/react'
import EmptyState from '~/components/empty_state'
import { useConsoleParams } from '~/components/environment_switcher'

type PageProps = InertiaProps<{
  app: Data.App
  members: Data.MemberApp.Variants['forApp'][]
}>

/**
 * Everyone who has ever signed in to the app. Active members have a live
 * session with the issuer right now.
 */
export default function AppMembersIndex({ app, members }: PageProps) {
  const routeParams = useConsoleParams()

  return (
    <AppScreen app={app}>
      <div className="table-wrap">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No sign-ins yet">
            Members who sign in to {app.name} show up here.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>First sign-in</th>
                <th>Last sign-in</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map(({ member, isActive, firstSignedInAt, lastSignedInAt }) => (
                <tr key={member.id}>
                  <td>
                    <Link route="members.show" routeParams={{ ...routeParams, member: member.id }}>
                      {member.email}
                    </Link>
                  </td>
                  <td>{member.fullName ?? '—'}</td>
                  <td>{firstSignedInAt}</td>
                  <td>{lastSignedInAt}</td>
                  <td>{isActive && <span className="badge badge--active">Active</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppScreen>
  )
}

AppMembersIndex.layout = [ConsoleLayout]
