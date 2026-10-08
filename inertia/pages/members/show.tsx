import { useState } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import EnvironmentBadge from '~/components/environment_badge'

type PageProps = InertiaProps<{
  identityProviderId: number | null
  member: Data.Member
  sessions: Data.OidcSession[]
  apps: Data.AppMember.Variants['forMember'][]
}>

/**
 * Signing a member out everywhere ends every app's access on every
 * browser, so it asks first and says what happens
 */
function SignOutEverywhere({ member, org }: { member: Data.Member; org: string }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => setConfirming(true)}
      >
        Sign out everywhere
      </button>
    )
  }

  return (
    <Form
      route="member_sessions.destroy"
      routeParams={{ org, member: member.id }}
      className="client__confirm"
      onSuccess={() => setConfirming(false)}
    >
      {({ processing }) => (
        <>
          <p>
            {member.fullName ?? member.email} is signed out of every app, on every browser, in every
            environment. Apps notice within 5 minutes.
          </p>
          <div className="client__confirm-actions">
            <button type="submit" className="btn btn--danger btn--sm" disabled={processing}>
              Yes, sign out
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
 * How the member signs in, and the control to change it. Only an admin
 * changes it, here or on the Authentication page. Changing it signs the
 * member out everywhere.
 */
function SignInMethod({
  member,
  org,
  provider,
}: {
  member: Data.Member
  org: string
  provider: number
}) {
  const usesProvider = member.signsInWith.raw === 'provider'

  return (
    <section className="panel client" aria-label="Sign-in">
      <header className="client__header">
        <div>
          <h2 className="section__title">
            Signs in with {member.signsInWith.formatted.toLowerCase()}
          </h2>
          <p className="section__description">
            {usesProvider
              ? 'A password is refused for them.'
              : 'Your identity provider is refused for them.'}
            {!usesProvider && !member.hasPassword && ' They have no password yet.'}
          </p>
        </div>
        {usesProvider ? (
          <Form
            route="identity_providers.members.destroy"
            routeParams={{ org, provider, member: member.id }}
          >
            {({ processing }) => (
              <button type="submit" className="btn btn--secondary btn--sm" disabled={processing}>
                Switch to a password
              </button>
            )}
          </Form>
        ) : (
          <Form route="identity_providers.members.store" routeParams={{ org, provider }}>
            {({ processing }) => (
              <>
                <input type="hidden" name="memberIds[]" value={member.id} />
                <button type="submit" className="btn btn--secondary btn--sm" disabled={processing}>
                  Switch to your identity provider
                </button>
              </>
            )}
          </Form>
        )}
      </header>
    </section>
  )
}

/**
 * The member, then one section per environment: the browsers they're
 * signed in on there, and the apps they have access to there, with their
 * roles
 */
export default function MembersShow({
  identityProviderId,
  member,
  sessions,
  apps,
  organization,
  environments = [],
}: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <Page
      title={member.fullName ?? member.email}
      description={`${member.email} · ${member.status.formatted} · Added ${member.createdAt}`}
      actions={<SignOutEverywhere member={member} org={org} />}
    >
      <div className="panels">
        {identityProviderId !== null && (
          <SignInMethod member={member} org={org} provider={identityProviderId} />
        )}
        {environments.map((environment) => {
          const environmentSessions = sessions.filter(
            ({ environmentId }) => environmentId === environment.id
          )
          const environmentApps = apps.filter(
            ({ environmentId }) => environmentId === environment.id
          )

          return (
            <section key={environment.id} className="panel" aria-label={environment.name}>
              <header className="section__header client__header">
                <EnvironmentBadge environment={environment} />
                <span className="section__description">
                  {environmentSessions.length === 0
                    ? 'Not signed in on any browser'
                    : `Signed in on ${environmentSessions.length} ${environmentSessions.length === 1 ? 'browser' : 'browsers'}`}
                </span>
              </header>
              <div className="section__body">
                {environmentApps.length === 0 ? (
                  <p className="section__description">No access to any app here.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>App</th>
                        <th>Roles</th>
                        <th>Last sign-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {environmentApps.map(({ app, roles, lastSignedInAt }) => (
                        <tr key={app.id}>
                          <td>
                            <Link
                              route="app_environments.show"
                              routeParams={{ org, app: app.slug, environment: environment.slug }}
                            >
                              {app.name}
                            </Link>
                          </td>
                          <td>
                            <div className="client__actions">
                              {roles.map((role) => (
                                <span key={role.id} className="badge">
                                  {role.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>{lastSignedInAt ?? 'Never'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Page>
  )
}

MembersShow.layout = [ConsoleLayout]
