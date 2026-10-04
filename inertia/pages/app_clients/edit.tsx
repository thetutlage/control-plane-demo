import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import ClientUrlFields from '~/components/client_url_fields'

type PageProps = InertiaProps<{
  app: Data.App
  client: Data.AppClient
  environment: Data.Environment
}>

export default function AppClientsEdit({ app, client, environment, organization }: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <Page
      title={`Edit ${app.name} in ${environment.name}`}
      description="Members already signed in stay signed in. The client ID and secret don't change."
    >
      <Form
        route="apps.clients.update"
        routeParams={{ org, client: client.id }}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <ClientUrlFields errors={errors} values={client} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Save
              </button>
              <Link
                route="apps.show"
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

AppClientsEdit.layout = [ConsoleLayout]
