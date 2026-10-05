import { useState } from 'react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { usePage } from '@inertiajs/react'
import ConsoleLayout from '~/layouts/console'
import AppScreen from '~/components/app_screen'
import { Form, Link } from '@adonisjs/inertia/react'
import CopyButton from '~/components/copy_button'
import SecretValue from '~/components/secret_value'
import EnvironmentBadge from '~/components/environment_badge'
import { useConsoleParams, useCurrentEnvironment } from '~/components/environment_switcher'

type App = Data.App.Variants['forSettings']

type PageProps = InertiaProps<{ app: App; issuerUrl: string }>

/**
 * Edit, rotate the secret, or remove the app. Rotating and removing break
 * a running app, so both ask first, in the panel, and say what happens.
 */
function AppActions({ app, environment }: { app: App; environment: Data.Environment }) {
  const [confirming, setConfirming] = useState<'rotate' | 'remove' | null>(null)
  const routeParams = { ...useConsoleParams(), app: app.slug }
  const cancel = (
    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(null)}>
      Cancel
    </button>
  )

  return (
    <>
      <div className="client__actions">
        <Link
          route="app_settings.edit"
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
          Remove
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
          route="apps.destroy"
          routeParams={routeParams}
          className="client__confirm"
          onSuccess={() => setConfirming(null)}
        >
          {({ processing }) => (
            <>
              <p>
                <EnvironmentBadge environment={environment} /> {app.name} and its sign-in history
                are removed. Members already signed in are signed out of it within 5 minutes.
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

export default function AppSettingsShow({ app, issuerUrl }: PageProps) {
  const { flash } = usePage()
  const environment = useCurrentEnvironment()!
  const newSecret = flash.clientSecret?.clientId === app.clientId ? flash.clientSecret.secret : null

  return (
    <AppScreen app={app}>
      <section className="panel client" aria-label="Client">
        <header className="client__header">
          <h2 className="section__title">Client</h2>
          <AppActions app={app} environment={environment} />
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
            <code className="mono">{app.clientId}</code>
            <CopyButton value={app.clientId} label="Copy client ID" />
          </dd>

          <dt>Client secret</dt>
          <dd>
            <SecretValue secret={app.secret} hint={app.secretHint} />
          </dd>

          <dt>App URL</dt>
          <dd>
            <code className="mono">{app.appUrl}</code>
          </dd>

          <dt>Redirect URIs</dt>
          <dd>
            <ul className="kv__list">
              {app.redirectUris.map((uri) => (
                <li key={uri}>
                  <code className="mono">{uri}</code>
                </li>
              ))}
            </ul>
          </dd>

          <dt>Sign-out redirect URIs</dt>
          <dd>
            {app.postLogoutRedirectUris.length ? (
              <ul className="kv__list">
                {app.postLogoutRedirectUris.map((uri) => (
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
    </AppScreen>
  )
}

AppSettingsShow.layout = [ConsoleLayout]
