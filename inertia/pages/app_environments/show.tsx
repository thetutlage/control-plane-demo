import { useState } from 'react'
import { AppWindow } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { usePage } from '@inertiajs/react'
import ConsoleLayout from '~/layouts/console'
import AppScreen from '~/components/app_screen'
import { Form, Link } from '@adonisjs/inertia/react'
import CopyButton from '~/components/copy_button'
import EmptyState from '~/components/empty_state'
import SecretValue from '~/components/secret_value'
import EnvironmentBadge from '~/components/environment_badge'

type App = Data.App.Variants['forList']

type PageProps = InertiaProps<{
  app: App
  environmentSlug: string
  issuerUrl: string
  setup: Data.AppEnvironment | null
  members: Data.AppMember.Variants['forApp'][]
}>

type RouteParams = { org: string; app: string; environment: string }

/**
 * Edit the setup, rotate its secret, or remove the app from the
 * environment. Rotating and removing break a running app, so both ask
 * first, in the panel, and say what happens.
 */
function SetupActions({
  app,
  environment,
  routeParams,
}: {
  app: App
  environment: Data.Environment
  routeParams: RouteParams
}) {
  const [confirming, setConfirming] = useState<'rotate' | 'remove' | null>(null)
  const cancel = (
    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(null)}>
      Cancel
    </button>
  )

  return (
    <>
      <div className="client__actions">
        <Link
          route="app_environments.edit"
          routeParams={routeParams}
          className="btn btn--secondary btn--sm"
        >
          Edit
        </Link>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => setConfirming('rotate')}
        >
          Rotate secret
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => setConfirming('remove')}
        >
          Remove from {environment.name}
        </button>
      </div>

      {confirming === 'rotate' && (
        <Form
          route="app_secrets.store"
          routeParams={routeParams}
          className="client__confirm"
          onSuccess={() => setConfirming(null)}
        >
          {({ processing }) => (
            <>
              <p>
                <EnvironmentBadge environment={environment} /> The current secret stops working
                right away. {app.name} can&apos;t sign members in until it has the new one.
              </p>
              <div className="client__confirm-actions">
                <button type="submit" className="btn btn--danger btn--sm" disabled={processing}>
                  Yes, rotate
                </button>
                {cancel}
              </div>
            </>
          )}
        </Form>
      )}

      {confirming === 'remove' && (
        <Form
          route="app_environments.destroy"
          routeParams={routeParams}
          className="client__confirm"
          onSuccess={() => setConfirming(null)}
        >
          {({ processing }) => (
            <>
              <p>
                <EnvironmentBadge environment={environment} /> {app.name}&apos;s credentials and
                sign-in history here are removed. Members already signed in are signed out of it
                within 5 minutes.
              </p>
              <div className="client__confirm-actions">
                <button type="submit" className="btn btn--danger btn--sm" disabled={processing}>
                  Yes, remove
                </button>
                {cancel}
              </div>
            </>
          )}
        </Form>
      )}
    </>
  )
}

/**
 * The app's tab for one environment: its setup there and the members who
 * have signed in to it, or that it hasn't reached the environment yet
 */
export default function AppEnvironmentsShow({
  app,
  environmentSlug,
  issuerUrl,
  setup,
  members,
  organization,
  environments = [],
}: PageProps) {
  const { flash } = usePage()
  const org = organization?.slug ?? ''
  const environment = environments.find(({ slug }) => slug === environmentSlug)!
  const routeParams = { org, app: app.slug, environment: environment.slug }

  if (!setup) {
    return (
      <AppScreen app={app}>
        <section className="panel" aria-label="Setup">
          <EmptyState
            icon={AppWindow}
            title={`${app.name} hasn't reached ${environment.name} yet`}
            action={
              <Link
                route="app_environments.create"
                routeParams={routeParams}
                className="btn btn--primary btn--sm"
              >
                Set up in {environment.name}
              </Link>
            }
          >
            Set it up with its {environment.name} URLs to get credentials for this environment.
            {environment.isProduction &&
              ' Production only accepts https, and the secret is shown once.'}
          </EmptyState>
        </section>
      </AppScreen>
    )
  }

  const newSecret =
    flash.clientSecret?.clientId === setup.clientId ? flash.clientSecret.secret : null

  return (
    <AppScreen app={app}>
      <div className="panels">
        <section className="panel client" aria-label="Setup">
          <header className="client__header">
            <h2 className="section__title">Setup</h2>
            <SetupActions app={app} environment={environment} routeParams={routeParams} />
          </header>

          {newSecret && (
            <div className="notice notice--secret" role="alert">
              <p>
                <strong>Copy the client secret now.</strong> It won&apos;t be shown again.
              </p>
              <span className="kv__value">
                <code className="mono">{newSecret}</code>
                <CopyButton value={newSecret} label="Copy new client secret" />
              </span>
            </div>
          )}

          <dl className="kv">
            <dt>Issuer URL</dt>
            <dd className="kv__value">
              <code className="mono">{issuerUrl}</code>
              <CopyButton value={issuerUrl} label="Copy issuer URL" />
            </dd>

            <dt>Client ID</dt>
            <dd className="kv__value">
              <code className="mono">{setup.clientId}</code>
              <CopyButton value={setup.clientId} label="Copy client ID" />
            </dd>

            <dt>Client secret</dt>
            <dd>
              <SecretValue secret={setup.secret} hint={setup.secretHint} />
            </dd>

            <dt>App URL</dt>
            <dd>
              <code className="mono">{setup.appUrl}</code>
            </dd>

            <dt>Redirect URIs</dt>
            <dd>
              <ul className="kv__list">
                {setup.redirectUris.map((uri) => (
                  <li key={uri}>
                    <code className="mono">{uri}</code>
                  </li>
                ))}
              </ul>
            </dd>

            <dt>Sign-out redirect URIs</dt>
            <dd>
              {setup.postLogoutRedirectUris.length ? (
                <ul className="kv__list">
                  {setup.postLogoutRedirectUris.map((uri) => (
                    <li key={uri}>
                      <code className="mono">{uri}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                'None'
              )}
            </dd>
          </dl>
        </section>

        <section className="panel" aria-label="Members">
          <header className="section__header client__header">
            <div>
              <h2 className="section__title">Members</h2>
              <p className="section__description">
                Only these members can sign in to {app.name} here.
              </p>
            </div>
            <Link
              route="app_members.create"
              routeParams={routeParams}
              className="btn btn--primary btn--sm"
            >
              Add member
            </Link>
          </header>
          <div className="section__body">
            {members.length === 0 ? (
              <p className="section__description">Nobody can sign in to {app.name} here yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Roles</th>
                    <th>Last sign-in</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {members.map(({ member, roles, isActive, lastSignedInAt }) => (
                    <tr key={member.id}>
                      <td>
                        <Link route="members.show" routeParams={{ org, member: member.id }}>
                          {member.email}
                        </Link>
                        {member.fullName && <div className="check__hint">{member.fullName}</div>}
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
                      <td>{isActive && <span className="badge badge--active">Active</span>}</td>
                      <td>
                        <Link
                          route="app_members.edit"
                          routeParams={{ ...routeParams, member: member.id }}
                        >
                          Edit roles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </AppScreen>
  )
}

AppEnvironmentsShow.layout = [ConsoleLayout]
