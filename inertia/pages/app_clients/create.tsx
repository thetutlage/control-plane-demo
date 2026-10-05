import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import ClientUrlFields from '~/components/client_url_fields'
import EnvironmentBadge from '~/components/environment_badge'
import { useCurrentEnvironment } from '~/components/environment_switcher'

type PageProps = InertiaProps<{ app: Data.App }>

export default function AppClientsCreate({ app, organization }: PageProps) {
  const org = organization?.slug ?? ''
  const environment = useCurrentEnvironment()!

  return (
    <Page
      title={`Configure ${app.name}`}
      description={
        <>
          <EnvironmentBadge environment={environment} /> Create the client this app signs in with.
          You get its client ID and secret next.
        </>
      }
    >
      <Form
        route="apps.clients.store"
        routeParams={{ org, app: app.slug }}
        qs={{ environment: environment.slug }}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <ClientUrlFields errors={errors} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Create client
              </button>
              <Link
                route="apps.settings"
                routeParams={{ org, app: app.slug }}
                className="btn btn--ghost"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

AppClientsCreate.layout = [ConsoleLayout]
