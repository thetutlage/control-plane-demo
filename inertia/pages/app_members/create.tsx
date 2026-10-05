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
  members: Data.Member[]
  roles: Data.Role[]
}>

/**
 * Gives a member access to the app in one environment, with one or more
 * roles
 */
export default function AppMembersCreate({
  app,
  environmentSlug,
  members,
  roles,
  organization,
  environments = [],
}: PageProps) {
  const org = organization?.slug ?? ''
  const environment = environments.find(({ slug }) => slug === environmentSlug)!
  const routeParams = { org, app: app.slug, environment: environment.slug }

  return (
    <Page
      title={`Add a member to ${app.name}`}
      description={
        <>
          <EnvironmentBadge environment={environment} /> They can sign in to {app.name} here right
          away, with these roles.
        </>
      }
    >
      <Form route="app_members.store" routeParams={routeParams} options={{ preserveScroll: true }}>
        {({ errors, processing }) => (
          <div className="panel form">
            <div className="field">
              <label className="field__label" htmlFor="memberId">
                Member
              </label>
              {members.length === 0 ? (
                <span className="field__hint">
                  Every member already has access.{' '}
                  <Link route="members.create" routeParams={{ org }}>
                    Add a member
                  </Link>{' '}
                  first.
                </span>
              ) : (
                <select
                  id="memberId"
                  name="memberId"
                  className="field__input"
                  aria-invalid={errors.memberId ? 'true' : 'false'}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName ? `${member.fullName} (${member.email})` : member.email}
                    </option>
                  ))}
                </select>
              )}
              {errors.memberId && <span className="field__error">{errors.memberId}</span>}
            </div>

            <RoleCheckboxes roles={roles} error={errors.roleIds} org={org} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Add member
              </button>
              <Link
                route="app_environments.show"
                routeParams={routeParams}
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

AppMembersCreate.layout = [ConsoleLayout]
