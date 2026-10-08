import { useState } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import EnvironmentBadge from '~/components/environment_badge'

type PageProps = InertiaProps<{
  identityProviderId: number | null
  identity: Data.MemberIdentity | null
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
 * How the member signs in, and the controls to change it. Only an admin
 * changes it, here or on the Authentication page, and only when a
 * provider is connected. Changing it signs the member out everywhere. A
 * password member can be emailed a link to set their password.
 */
function SignInMethod({
  member,
  org,
  provider,
}: {
  member: Data.Member
  org: string
  provider: number | null
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
            {usesProvider && 'A password is refused for them.'}
            {!usesProvider && provider !== null && 'Your identity provider is refused for them. '}
            {!usesProvider &&
              (member.hasPassword
                ? 'They set their own password.'
                : 'They have not set a password yet.')}
          </p>
        </div>
        <div className="client__actions">
          {!usesProvider && (
            <Form route="members.password_resets.store" routeParams={{ org, member: member.id }}>
              {({ processing }) => (
                <button type="submit" className="btn btn--secondary btn--sm" disabled={processing}>
                  Email a link to set a password
                </button>
              )}
            </Form>
          )}
          {provider !== null && usesProvider && (
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
          )}
          {provider !== null && !usesProvider && (
            <Form route="identity_providers.members.store" routeParams={{ org, provider }}>
              {({ processing }) => (
                <>
                  <input type="hidden" name="memberIds[]" value={member.id} />
                  <button
                    type="submit"
                    className="btn btn--secondary btn--sm"
                    disabled={processing}
                  >
                    Switch to your identity provider
                  </button>
                </>
              )}
            </Form>
          )}
        </div>
      </header>
    </section>
  )
}

/**
 * The member's account at the identity provider, as of their last
 * sign-in through it; nothing is fetched from the provider in between.
 * Dissociating is for an account that was deleted and recreated there:
 * the next person the provider sends with this email gets the member's
 * roles, so it asks first and says so.
 */
function ProviderAccount({
  member,
  identity,
  org,
}: {
  member: Data.Member
  identity: Data.MemberIdentity | null
  org: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (!identity) {
    return (
      <section className="panel client" aria-label="Account at your identity provider">
        <header className="client__header">
          <div>
            <h2 className="section__title">Account at your identity provider</h2>
            <p className="section__description">
              They have not signed in through your identity provider yet. The first time, they are
              matched by their email, {member.email}.
            </p>
          </div>
        </header>
      </section>
    )
  }

  return (
    <section className="panel client" aria-label="Account at your identity provider">
      <header className="client__header">
        <div>
          <h2 className="section__title">Account at your identity provider</h2>
          <p className="section__description">
            As of their last sign-in. They are recognised by the ID below, whatever their email.
          </p>
        </div>
        {!confirming && (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setConfirming(true)}
          >
            Dissociate this account
          </button>
        )}
      </header>

      {confirming && (
        <Form
          route="members.identities.destroy"
          routeParams={{ org, member: member.id, identity: identity.id }}
          className="client__confirm"
          onSuccess={() => setConfirming(false)}
        >
          {({ processing }) => (
            <>
              <p>
                Do this when their account at your identity provider was deleted and created again.
                They keep their roles and are signed out everywhere. Whoever your provider next
                signs in with the email {member.email} becomes this member.
              </p>
              <div className="client__confirm-actions">
                <button type="submit" className="btn btn--danger btn--sm" disabled={processing}>
                  Yes, dissociate
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
      )}

      <dl className="kv">
        <dt>ID at the provider</dt>
        <dd>
          <code>{identity.subject}</code>
        </dd>
        <dt>How they joined</dt>
        <dd>{identity.origin}</dd>
        <dt>First signed in</dt>
        <dd>{identity.firstSignedInAt}</dd>
        <dt>Last signed in</dt>
        <dd>{identity.lastSignedInAt ?? 'Not recorded'}</dd>
        {identity.email && identity.email !== member.email && (
          <>
            <dt>Email at the provider</dt>
            <dd>
              {identity.email}. Another member has this email here, so this member keeps{' '}
              {member.email}.
            </dd>
          </>
        )}
      </dl>
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
  identity,
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
        <SignInMethod member={member} org={org} provider={identityProviderId} />
        {identityProviderId !== null && (identity || member.signsInWith.raw === 'provider') && (
          <ProviderAccount member={member} identity={identity} org={org} />
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
