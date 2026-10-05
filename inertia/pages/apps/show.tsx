import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import AppScreen from '~/components/app_screen'
import { Link } from '@adonisjs/inertia/react'
import CopyButton from '~/components/copy_button'

type PageProps = InertiaProps<{ app: Data.App; client: Data.AppClient | null }>

export default function AppsShow({ app, client, organization }: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <AppScreen app={app}>
      <section className="panel client" aria-label="Overview">
        {!client ? (
          <p className="client__empty">
            {app.name} can&apos;t sign members in here yet.{' '}
            <Link route="apps.settings" routeParams={{ org, app: app.slug }}>
              Configure a client
            </Link>{' '}
            in Settings.
          </p>
        ) : (
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

            <dt>App URL</dt>
            <dd>
              <code className="mono">{client.appUrl}</code>
            </dd>
          </dl>
        )}
      </section>
    </AppScreen>
  )
}

AppsShow.layout = [ConsoleLayout]
