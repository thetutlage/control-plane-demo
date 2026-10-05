import { useState } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import RoleFields from '~/components/role_fields'

type Role = Data.Role.Variants['forEdit']

type PageProps = InertiaProps<{
  role: Role
  holdersCount: number
  catalog: Data.PermissionCatalog | null
}>

/**
 * Deleting a role takes it away from everyone holding it, so it asks
 * first and says how many hold it
 */
function DeleteRole({
  role,
  holdersCount,
  org,
}: {
  role: Role
  holdersCount: number
  org: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => setConfirming(true)}
      >
        Delete role
      </button>
    )
  }

  return (
    <Form
      route="roles.destroy"
      routeParams={{ org, role: role.id }}
      className="client__confirm"
      onSuccess={() => setConfirming(false)}
    >
      {({ processing }) => (
        <>
          <p>
            {role.name} is deleted in every environment.{' '}
            {holdersCount === 0
              ? 'Nobody holds it.'
              : `It is taken away from ${holdersCount} ${holdersCount === 1 ? 'member' : 'members'} on their apps; those left with no role on an app lose access to it.`}
          </p>
          <div className="client__confirm-actions">
            <button type="submit" className="btn btn--danger btn--sm" disabled={processing}>
              Yes, delete
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Form>
  )
}

export default function RolesEdit({ role, holdersCount, catalog, organization }: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <Page
      title={`Edit ${role.name}`}
      description="Changes apply in every environment."
      actions={<DeleteRole role={role} holdersCount={holdersCount} org={org} />}
    >
      <Form
        route="roles.update"
        routeParams={{ org, role: role.id }}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <RoleFields errors={errors} catalog={catalog} role={role} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Save
              </button>
              <Link route="roles.index" routeParams={{ org }} className="btn btn--ghost">
                Cancel
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

RolesEdit.layout = [ConsoleLayout]
