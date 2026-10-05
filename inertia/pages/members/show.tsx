import { useState } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import EnvironmentBadge from '~/components/environment_badge'

type PageProps = InertiaProps<{
  member: Data.Member
  environment: Data.Environment
  sessions: Data.OidcSession[]
  apps: Data.MemberApp[]
}>

/**
 * Signing a member out everywhere ends every app's access on every
 * browser, so it asks first and says what happens
 */
function SignOutEverywhere({
  org,
  member,
  environment,
}: {
  org: string
  member: Data.Member
  environment: Data.Environment
}) {
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
      route="members.sign_out_everywhere"
      routeParams={{ org, member: member.id }}
      className="client__confirm"
      onSuccess={() => setConfirming(false)}
    >
      {({ processing }) => (
        <>
          <p>
            <EnvironmentBadge environment={environment} /> {member.fullName ?? member.email} is
            signed out of every app, on every browser. Apps notice within 5 minutes.
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

export default function MembersShow({
  member,
  environment,
  sessions,
  apps,
  organization,
}: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <Page
      title={member.fullName ?? member.email}
      description={
        <>
          <EnvironmentBadge environment={environment} /> {member.email} · {member.status.formatted}{' '}
          · Added {member.createdAt}
        </>
      }
      actions={<SignOutEverywhere org={org} member={member} environment={environment} />}
    >
      <div className="panel">
        <section className="section" aria-label="Active sessions">
          <header className="section__header">
            <h2 className="section__title">Active sessions</h2>
          </header>
          <div className="section__body">
            {sessions.length === 0 ? (
              <p className="section__description">Not signed in on any browser.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Signed in</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <tr key={index}>
                      <td>{session.signedInAt ?? '—'}</td>
                      <td>{session.expiresAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="section" aria-label="Apps used">
          <header className="section__header">
            <h2 className="section__title">Apps used</h2>
          </header>
          <div className="section__body">
            {apps.length === 0 ? (
              <p className="section__description">Hasn&apos;t signed in to any app yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>App</th>
                    <th>First sign-in</th>
                    <th>Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map(({ app, firstSignedInAt, lastSignedInAt }) => (
                    <tr key={app.id}>
                      <td>
                        <Link
                          route="apps.show"
                          routeParams={{ org, app: app.slug }}
                          qs={{ environment: environment.slug }}
                        >
                          {app.name}
                        </Link>
                      </td>
                      <td>{firstSignedInAt}</td>
                      <td>{lastSignedInAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </Page>
  )
}

MembersShow.layout = [ConsoleLayout]
