import Page from '~/components/page'
import { KeyRound } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'
import { Link } from '@adonisjs/inertia/react'

type PageProps = InertiaProps<{ roles: Data.Role[]; catalogSynced: boolean }>

export default function RolesIndex({ roles, catalogSynced, organization }: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <Page
      title="Roles"
      description="Named sets of permission keys from your catalogue, used by every environment."
      actions={
        <Link route="roles.create" routeParams={{ org }} className="btn btn--primary btn--sm">
          New role
        </Link>
      }
    >
      {!catalogSynced && (
        <p className="notice" role="status">
          No catalogue synced yet.
        </p>
      )}
      <div className="table-wrap">
        {roles.length === 0 ? (
          <EmptyState icon={KeyRound} title="No roles yet">
            Roles you build from your catalogue show up here.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <Link route="roles.edit" routeParams={{ org, role: role.id }}>
                      {role.name}
                    </Link>
                  </td>
                  <td>{role.description ?? '—'}</td>
                  <td>
                    {role.permissionsCount}
                    {role.missingKeys.length > 0 && (
                      <span
                        className="badge badge--warn"
                        title={role.missingKeys.join(', ')}
                        style={{ marginLeft: 8 }}
                      >
                        {role.missingKeys.length} missing from catalogue
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}

RolesIndex.layout = [ConsoleLayout]
