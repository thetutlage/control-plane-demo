import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import ClientUrlFields from '~/components/client_url_fields'
import EnvironmentBadge from '~/components/environment_badge'

type PageProps = InertiaProps<{
  app: Data.App.Variants['forList']
  environmentSlug: string
  setup: Data.AppEnvironment
}>

export default function AppEnvironmentsEdit({
  app,
  environmentSlug,
  setup,
  organization,
  environments = [],
}: PageProps) {
  const environment = environments.find(({ slug }) => slug === environmentSlug)!
  const routeParams = {
    org: organization?.slug ?? '',
    app: app.slug,
    environment: environment.slug,
  }

  return (
    <Page
      title={`Edit ${app.name}`}
      description={
        <>
          <EnvironmentBadge environment={environment} /> Members already signed in stay signed in.
          The client ID and secret don&apos;t change.
        </>
      }
    >
      <Form
        route="app_environments.update"
        routeParams={routeParams}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <ClientUrlFields errors={errors} values={setup} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Save
              </button>
              <Link
                route="app_environments.show"
                routeParams={routeParams}
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

AppEnvironmentsEdit.layout = [ConsoleLayout]
