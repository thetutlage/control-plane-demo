import { useState } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import RoleCheckboxes from '~/components/role_checkboxes'
import EnvironmentBadge from '~/components/environment_badge'

type PageProps = InertiaProps<{
  app: Data.App.Variants['forList']
  environmentSlug: string
  member: Data.Member
  appMember: Data.AppMember
  roles: Data.Role[]
}>

type RouteParams = { org: string; app: string; environment: string; member: number }

/**
 * Removing a member's access signs them out of the app, so it asks first
 */
function RemoveAccess({
  app,
  member,
  environment,
  routeParams,
}: {
  app: Data.App.Variants['forList']
  member: Data.Member
  environment: Data.Environment
  routeParams: RouteParams
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => setConfirming(true)}
      >
        Remove access
      </button>
    )
  }

  return (
    <Form
      route="app_members.destroy"
      routeParams={routeParams}
      className="client__confirm"
      onSuccess={() => setConfirming(false)}
    >
      {({ processing }) => (
        <>
          <p>
            <EnvironmentBadge environment={environment} /> {member.email} can&apos;t sign in to{' '}
            {app.name} any more, and is signed out of it within 5 minutes.
          </p>
          <div className="client__confirm-actions">
            <button type="submit" className="btn btn--danger btn--sm" disabled={processing}>
              Yes, remove
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

/**
 * Changes the roles a member holds on the app in one environment
 */
export default function AppMembersEdit({
  app,
  environmentSlug,
  member,
  appMember,
  roles,
  organization,
  environments = [],
}: PageProps) {
  const org = organization?.slug ?? ''
  const environment = environments.find(({ slug }) => slug === environmentSlug)!
  const tabParams = { org, app: app.slug, environment: environment.slug }
  const routeParams = { ...tabParams, member: member.id }

  return (
    <Page
      title={`${member.fullName ?? member.email} on ${app.name}`}
      description={
        <>
          <EnvironmentBadge environment={environment} /> Changes apply in this environment only.
        </>
      }
      actions={
        <RemoveAccess
          app={app}
          member={member}
          environment={environment}
          routeParams={routeParams}
        />
      }
    >
      <Form route="app_members.update" routeParams={routeParams} options={{ preserveScroll: true }}>
        {({ errors, processing }) => (
          <div className="panel form">
            <RoleCheckboxes
              roles={roles}
              checked={appMember.roles.map(({ id }) => id)}
              error={errors.roleIds}
              org={org}
            />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Save
              </button>
              <Link
                route="app_environments.show"
                routeParams={tabParams}
                className="btn btn--ghost"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

AppMembersEdit.layout = [ConsoleLayout]
