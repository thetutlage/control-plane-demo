import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { usePage } from '@inertiajs/react'
import ConsoleLayout from '~/layouts/console'
import { Link } from '@adonisjs/inertia/react'
import CopyButton from '~/components/copy_button'
import SecretValue from '~/components/secret_value'

type PageProps = InertiaProps<{ app: Data.App; clients: Data.AppClient[] }>

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
                {!client && (
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
