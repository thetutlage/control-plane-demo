import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import CopyButton from '~/components/copy_button'
import EnvironmentBadge from '~/components/environment_badge'

type PageProps = InertiaProps<{
  environmentSummaries: Data.Environment.Variants['forSettings'][]
}>

/**
 * The stages the organization's apps move through, each with its own
 * issuer
 */
export default function EnvironmentsIndex({ environmentSummaries }: PageProps) {
  return (
    <Page
      title="Environments"
      description="The stages your apps move through. Each one signs members in through its own issuer."
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Environment</th>
              <th>Issuer URL</th>
              <th>Rules</th>
              <th>Apps set up</th>
            </tr>
          </thead>
          <tbody>
            {environmentSummaries.map((environment) => (
              <tr key={environment.id}>
                <td>
                  <EnvironmentBadge environment={environment} />
                </td>
                <td>
                  <span className="kv__value">
                    <code className="mono">{environment.issuerUrl}</code>
                    <CopyButton
                      value={environment.issuerUrl}
                      label={`Copy ${environment.name} issuer URL`}
                    />
                  </span>
                </td>
                <td>
                  {environment.isProduction
                    ? 'https only, secrets shown once'
                    : 'http on localhost, secrets viewable'}
                </td>
                <td>{environment.appsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  )
}

EnvironmentsIndex.layout = [ConsoleLayout]
