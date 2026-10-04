import { Head } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'
import SignInLayout from '~/layouts/sign_in'

type PageProps = InertiaProps<{
  signInId: string
  organizationName: string
  environmentName: string
  isProduction: boolean
  appName: string
}>

export default function SignInShow({
  signInId,
  organizationName,
  environmentName,
  isProduction,
  appName,
}: PageProps) {
  return (
    <>
      <Head title={`Sign in to ${organizationName}`} />
      {!isProduction && (
        <p className="signin__env" role="note">
          {environmentName}
        </p>
      )}
      <h1 className="auth__title">Sign in to {organizationName}</h1>
      <p className="auth__sub">to continue to {appName}</p>

      <Form route="sign_in.store" routeParams={{ signInId }}>
        {({ errors, processing }) => (
          <div className="auth__form">
            <div className="field">
              <label className="field__label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="field__input"
                autoComplete="username"
                autoFocus
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
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
              />
              {errors.password && <span className="field__error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={processing}
              style={{ marginTop: 4 }}
            >
              {processing ? 'One moment…' : 'Sign in'}
            </button>
          </div>
        )}
      </Form>
    </>
  )
}

SignInShow.layout = [SignInLayout]
