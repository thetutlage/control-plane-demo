import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import AppScreen from '~/components/app_screen'
import CopyButton from '~/components/copy_button'

type PageProps = InertiaProps<{ app: Data.App; issuerUrl: string }>

export default function AppsShow({ app, issuerUrl }: PageProps) {
  return (
    <AppScreen app={app}>
      <section className="panel client" aria-label="Overview">
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

          <dt>App URL</dt>
          <dd>
            <code className="mono">{app.appUrl}</code>
          </dd>
        </dl>
      </section>
    </AppScreen>
  )
}

AppsShow.layout = [ConsoleLayout]
