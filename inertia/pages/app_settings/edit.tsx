import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import ClientUrlFields from '~/components/client_url_fields'
import EnvironmentBadge from '~/components/environment_badge'
import { useConsoleParams, useCurrentEnvironment } from '~/components/environment_switcher'

type PageProps = InertiaProps<{ app: Data.App.Variants['forSettings'] }>

export default function AppSettingsEdit({ app }: PageProps) {
  const routeParams = { ...useConsoleParams(), app: app.slug }
  const environment = useCurrentEnvironment()!

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
        route="app_settings.update"
        routeParams={routeParams}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <ClientUrlFields errors={errors} values={app} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Save
              </button>
              <Link route="app_settings.show" routeParams={routeParams} className="btn btn--ghost">
                Cancel
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

AppSettingsEdit.layout = [ConsoleLayout]
