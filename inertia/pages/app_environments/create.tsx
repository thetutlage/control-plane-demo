import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import ClientUrlFields from '~/components/client_url_fields'
import EnvironmentBadge from '~/components/environment_badge'

type PageProps = InertiaProps<{ app: Data.App.Variants['forList']; environmentSlug: string }>

export default function AppEnvironmentsCreate({
  app,
  environmentSlug,
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
      title={`Set up ${app.name}`}
      description={
        <>
          <EnvironmentBadge environment={environment} /> Where {app.name} runs in this environment.
          You get its client ID and secret next.
        </>
      }
    >
      <Form
        route="app_environments.store"
        routeParams={routeParams}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <ClientUrlFields errors={errors} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Set up
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

AppEnvironmentsCreate.layout = [ConsoleLayout]
