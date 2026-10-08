import Page from '~/components/page'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'

type PageProps = InertiaProps<{ hasIdentityProvider: boolean }>

/**
 * Adds a member. With an identity provider connected, the admin chooses
 * how the member signs in. A password member sets their own password from
 * an email.
 */
export default function MembersCreate({ hasIdentityProvider, organization }: PageProps) {
  const routeParams = { org: organization?.slug ?? '' }

  return (
    <Page
      title="Add member"
      description="Add someone who signs in to your apps, in every environment. We email them how to sign in."
    >
      <Form route="members.store" routeParams={routeParams} options={{ preserveScroll: true }}>
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

            {hasIdentityProvider ? (
              <fieldset className="field">
                <legend className="field__label">Signs in with</legend>
                <div className="checks">
                  <label className="check">
                    <input type="radio" name="signsInWith" value="provider" defaultChecked />
                    Your identity provider
                    <span className="check__hint">They never have a password here.</span>
                  </label>
                  <label className="check">
                    <input type="radio" name="signsInWith" value="password" />A password
                    <span className="check__hint">
                      For someone who isn&apos;t in your identity provider. We email them a link to
                      set it.
                    </span>
                  </label>
                </div>
                {errors.signsInWith && <span className="field__error">{errors.signsInWith}</span>}
              </fieldset>
            ) : (
              <>
                <input type="hidden" name="signsInWith" value="password" />
                <p className="field__hint">We email them a link to set their password.</p>
              </>
            )}

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Add member
              </button>
              <Link route="members.index" routeParams={routeParams} className="btn btn--ghost">
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
