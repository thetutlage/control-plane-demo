import { useState } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { usePage } from '@inertiajs/react'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import CopyButton from '~/components/copy_button'
import SecretValue from '~/components/secret_value'

type PageProps = InertiaProps<{ app: Data.App; clients: Data.AppClient[] }>

/**
 * Edit, rotate the secret, or remove a client. Rotating and removing break
 * a running app, so both ask first, in the panel, and say what happens.
 */
function ClientActions({
  org,
  app,
  client,
  environmentName,
}: {
  org: string
  app: Data.App
  client: Data.AppClient
  environmentName: string
}) {
  const [confirming, setConfirming] = useState<'rotate' | 'remove' | null>(null)
  const routeParams = { org, client: client.id }
  const cancel = (
    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(null)}>
      Cancel
    </button>
  )

  return (
    <>
      <div className="client__actions">
        <Link
          route="apps.clients.edit"
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
          route="apps.clients.rotate_secret"
          routeParams={routeParams}
          className="client__confirm"
          onSuccess={() => setConfirming(null)}
        >
          {({ processing }) => (
            <>
              <p>
                The current secret stops working right away. {app.name} can&apos;t sign members in
                to {environmentName} until it has the new one.
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
          route="apps.clients.destroy"
          routeParams={routeParams}
          className="client__confirm"
          onSuccess={() => setConfirming(null)}
        >
          {({ processing }) => (
            <>
              <p>
                {app.name} can&apos;t sign members in to {environmentName} anymore, and members
                already signed in are signed out of it within 5 minutes.
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

export default function AppsShow({ app, clients, organization, environments }: PageProps) {
  const { flash } = usePage()
  const org = organization?.slug ?? ''

  return (
    <Page
      title={app.name}
      description="Configure a client in each environment this app signs in to. Each environment has its own credentials."
    >
      <div className="clients">
        {(environments ?? []).map((environment) => {
          const client = clients.find(({ environmentId }) => environmentId === environment.id)
          const newSecret =
            client && flash.clientSecret?.clientId === client.clientId
              ? flash.clientSecret.secret
              : null

          return (
            <section
              key={environment.id}
              className="panel client"
              aria-labelledby={`client-${environment.slug}`}
            >
              <header className="client__header">
                <h2 id={`client-${environment.slug}`} className="section__title">
                  {environment.name}
                </h2>
                {client ? (
                  <ClientActions
                    org={org}
                    app={app}
                    client={client}
                    environmentName={environment.name}
                  />
                ) : (
                  <Link
                    route="apps.clients.create"
                    routeParams={{ org, app: app.slug }}
                    qs={{ environment: environment.slug }}
                    className="btn btn--secondary btn--sm"
                  >
                    Configure
                  </Link>
                )}
              </header>

              {!client ? (
                <p className="client__empty">
                  No client yet. {app.name} cannot sign in to {environment.name}.
                </p>
              ) : (
                <>
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
                      <code className="mono">{client.issuerUrl}</code>
                      <CopyButton value={client.issuerUrl} label="Copy issuer URL" />
                    </dd>

                    <dt>Client ID</dt>
                    <dd className="kv__value">
                      <code className="mono">{client.clientId}</code>
                      <CopyButton value={client.clientId} label="Copy client ID" />
                    </dd>

                    <dt>Client secret</dt>
                    <dd>
                      <SecretValue secret={client.secret} hint={client.secretHint} />
                    </dd>

                    <dt>App URL</dt>
                    <dd>
                      <code className="mono">{client.appUrl}</code>
                    </dd>

                    <dt>Redirect URIs</dt>
                    <dd>
                      <ul className="kv__list">
                        {client.redirectUris.map((uri) => (
                          <li key={uri}>
                            <code className="mono">{uri}</code>
                          </li>
                        ))}
                      </ul>
                    </dd>

                    <dt>Sign-out redirect URIs</dt>
                    <dd>
                      {client.postLogoutRedirectUris.length ? (
                        <ul className="kv__list">
                          {client.postLogoutRedirectUris.map((uri) => (
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
                </>
              )}
            </section>
          )
        })}
      </div>
    </Page>
  )
}

AppsShow.layout = [ConsoleLayout]
