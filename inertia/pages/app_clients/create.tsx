import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import ClientUrlFields from '~/components/client_url_fields'

type PageProps = InertiaProps<{
  app: Data.App
  availableEnvironments: Data.Environment[]
  selectedEnvironment: string | null
}>

export default function AppClientsCreate({
  app,
  availableEnvironments,
  selectedEnvironment,
  organization,
}: PageProps) {
  const org = organization?.slug ?? ''
  const defaultEnvironment = availableEnvironments.some(({ slug }) => slug === selectedEnvironment)
    ? selectedEnvironment!
    : availableEnvironments[0].slug

  return (
    <Page
      title={`Configure ${app.name}`}
      description="Create the client this app signs in with, in one environment. You get its client ID and secret next."
    >
      <Form
        route="apps.clients.store"
        routeParams={{ org, app: app.slug }}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <div className="field">
              <label className="field__label" htmlFor="environment">
                Environment
              </label>
              <select
                id="environment"
                name="environment"
                className="field__input"
                defaultValue={defaultEnvironment}
                aria-invalid={errors.environment ? 'true' : 'false'}
              >
                {availableEnvironments.map((environment) => (
                  <option key={environment.id} value={environment.slug}>
                    {environment.name}
                  </option>
                ))}
              </select>
              {errors.environment && <span className="field__error">{errors.environment}</span>}
            </div>

            <ClientUrlFields errors={errors} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Create client
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

AppClientsCreate.layout = [ConsoleLayout]
