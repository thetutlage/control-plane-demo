import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import RoleFields from '~/components/role_fields'

type PageProps = InertiaProps<{ catalog: Data.PermissionCatalog | null }>

export default function RolesCreate({ catalog, organization }: PageProps) {
  const routeParams = { org: organization?.slug ?? '' }

  return (
    <Page
      title="New role"
      description="A named set of permissions. Every environment uses the same roles."
    >
      <Form route="roles.store" routeParams={routeParams} options={{ preserveScroll: true }}>
        {({ errors, processing }) => (
          <div className="panel form">
            <RoleFields errors={errors} catalog={catalog} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Create role
              </button>
              <Link route="roles.index" routeParams={routeParams} className="btn btn--ghost">
                Cancel
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

RolesCreate.layout = [ConsoleLayout]
