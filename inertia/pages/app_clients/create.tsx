import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'

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

            <div className="field">
              <label className="field__label" htmlFor="appUrl">
                App URL
              </label>
              <input
                id="appUrl"
                name="appUrl"
                type="url"
                className="field__input"
                placeholder="https://invoices.acme.com"
                aria-describedby="appUrlHint"
                aria-invalid={errors.appUrl ? 'true' : 'false'}
              />
              <span id="appUrlHint" className="field__hint">
                Where the app runs in this environment.
              </span>
              {errors.appUrl && <span className="field__error">{errors.appUrl}</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="redirectUris">
                Redirect URIs
              </label>
              <textarea
                id="redirectUris"
                name="redirectUris"
                rows={4}
                className="field__input field__input--textarea mono"
                spellCheck={false}
                placeholder="https://invoices.acme.com/auth/callback"
                aria-describedby="redirectUrisHint"
                aria-invalid={errors.redirectUris ? 'true' : 'false'}
              />
              <span id="redirectUrisHint" className="field__hint">
                One per line. Members are only ever sent back to these exact URLs after signing in.
                Production requires https; other environments also allow http on localhost.
              </span>
              {errors.redirectUris && <span className="field__error">{errors.redirectUris}</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="postLogoutRedirectUris">
                Sign-out redirect URIs
              </label>
              <textarea
                id="postLogoutRedirectUris"
                name="postLogoutRedirectUris"
                rows={2}
                className="field__input field__input--textarea mono"
                spellCheck={false}
                placeholder="https://invoices.acme.com"
                aria-describedby="postLogoutRedirectUrisHint"
                aria-invalid={errors.postLogoutRedirectUris ? 'true' : 'false'}
              />
              <span id="postLogoutRedirectUrisHint" className="field__hint">
                {
                  'Optional, one per line. Where the app may send members after signing them out. Without one, members see a "You\'re signed out" page.'
                }
              </span>
              {errors.postLogoutRedirectUris && (
                <span className="field__error">{errors.postLogoutRedirectUris}</span>
              )}
            </div>

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
