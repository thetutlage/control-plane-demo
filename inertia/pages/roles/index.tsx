import Page from '~/components/page'
import { KeyRound } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import EmptyState from '~/components/empty_state'

type PageProps = InertiaProps<{ roles: Data.Role[]; catalogSynced: boolean }>

export default function RolesIndex({ roles, catalogSynced }: PageProps) {
  return (
    <Page
      title="Roles"
      description="Named sets of permission keys from an environment's catalogue."
    >
      {!catalogSynced && (
        <p className="notice" role="status">
          No catalogue synced for this environment yet.
        </p>
      )}
      <div className="table-wrap">
        {roles.length === 0 ? (
          <EmptyState icon={KeyRound} title="No roles yet">
            Roles you build from this environment&apos;s catalogue show up here.
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
                  <td>{role.name}</td>
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
