import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import AppScreen from '~/components/app_screen'
import CopyButton from '~/components/copy_button'

type PageProps = InertiaProps<{
  app: Data.App
  issuerUrl: string
  membersCount: number
  activeMembersCount: number
}>

export default function AppsShow({ app, issuerUrl, membersCount, activeMembersCount }: PageProps) {
  return (
    <AppScreen app={app}>
      <section className="panel client" aria-label="Overview">
        <dl className="kv">
          <dt>Members</dt>
          <dd>
            {membersCount} {membersCount === 1 ? 'member has' : 'members have'} used {app.name} ·{' '}
            {activeMembersCount} active now
          </dd>

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
