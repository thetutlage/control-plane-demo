import Page from '~/components/page'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'

export default function AppsCreate({ organization }: InertiaProps) {
  const routeParams = { org: organization?.slug ?? '' }

  return (
    <Page
      title="Register app"
      description="Register an internal app once. You set it up in each environment it reaches next."
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
