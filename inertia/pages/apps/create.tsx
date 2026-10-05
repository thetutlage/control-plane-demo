import Page from '~/components/page'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import ClientUrlFields from '~/components/client_url_fields'
import EnvironmentBadge from '~/components/environment_badge'
import { useConsoleParams, useCurrentEnvironment } from '~/components/environment_switcher'

export default function AppsCreate(_props: InertiaProps) {
  const routeParams = useConsoleParams()
  const environment = useCurrentEnvironment()!

  return (
    <Page
      title="Register app"
      description={
        <>
          <EnvironmentBadge environment={environment} /> Register an internal app. You get its
          client ID and secret next.
        </>
      }
    >
      <Form route="apps.store" routeParams={routeParams} options={{ preserveScroll: true }}>
        {({ errors, processing }) => (
          <div className="panel form">
            <div className="field">
              <label className="field__label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="field__input"
                placeholder="Invoices"
                aria-invalid={errors.name ? 'true' : 'false'}
              />
              {errors.name && <span className="field__error">{errors.name}</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                className="field__input"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="invoices"
                aria-describedby="slugHint"
                aria-invalid={errors.slug ? 'true' : 'false'}
              />
              <span id="slugHint" className="field__hint">
                Lowercase letters, numbers and single dashes. Used in this app&apos;s console URL.
              </span>
              {errors.slug && <span className="field__error">{errors.slug}</span>}
            </div>

            <ClientUrlFields errors={errors} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Register app
              </button>
              <Link route="apps.index" routeParams={routeParams} className="btn btn--ghost">
                Cancel
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

AppsCreate.layout = [ConsoleLayout]
