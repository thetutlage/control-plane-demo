import Page from '~/components/page'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import EnvironmentBadge from '~/components/environment_badge'
import { useCurrentEnvironment } from '~/components/environment_switcher'

export default function MembersCreate({ organization }: InertiaProps) {
  const routeParams = { org: organization?.slug ?? '' }
  const environment = useCurrentEnvironment()!

  return (
    <Page
      title="Add member"
      description={
        <>
          <EnvironmentBadge environment={environment} /> Add someone who signs in to the apps. They
          can sign in right away with this password.
        </>
      }
    >
      <Form
        route="members.store"
        routeParams={routeParams}
        qs={{ environment: environment.slug }}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <div className="field">
              <label className="field__label" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="field__input"
                autoComplete="off"
                placeholder="Sara Lee"
                aria-invalid={errors.fullName ? 'true' : 'false'}
              />
              {errors.fullName && <span className="field__error">{errors.fullName}</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="field__input"
                autoComplete="off"
                placeholder="sara@acme.com"
                aria-invalid={errors.email ? 'true' : 'false'}
              />
              {errors.email && <span className="field__error">{errors.email}</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="field__input"
                autoComplete="new-password"
                aria-describedby="passwordHint"
                aria-invalid={errors.password ? 'true' : 'false'}
              />
              <span id="passwordHint" className="field__hint">
                8 to 32 characters. Share it with them yourself.
              </span>
              {errors.password && <span className="field__error">{errors.password}</span>}
            </div>

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Add member
              </button>
              <Link
                route="members.index"
                routeParams={routeParams}
                qs={{ environment: environment.slug }}
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

MembersCreate.layout = [ConsoleLayout]
