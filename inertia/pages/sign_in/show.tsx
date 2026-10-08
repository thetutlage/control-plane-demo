import { useEffect, useRef } from 'react'
import { Head, usePage } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'
import SignInLayout from '~/layouts/sign_in'

type PageProps = InertiaProps<{
  signInId: string
  organizationName: string
  environmentName: string
  isProduction: boolean
  appName: string
  providerSignIn: boolean
  providerRecheck: boolean
}>

export default function SignInShow({
  signInId,
  organizationName,
  environmentName,
  isProduction,
  appName,
  providerSignIn,
  providerRecheck,
}: PageProps) {
  const { flash } = usePage()
  const providerButton = useRef<HTMLButtonElement>(null)

  /**
   * A member whose sign-in through the provider is over a day old is sent
   * back through it without a click. Not after an error, such as
   * cancelling there, which would send them round again.
   */
  useEffect(() => {
    if (providerRecheck && !flash.error) {
      providerButton.current?.click()
    }
  }, [providerRecheck, flash.error])

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

      {providerSignIn && (
        <>
          <Form
            route="redirect_to_provider"
            routeParams={{ signInId }}
            className="signin__provider"
          >
            {({ processing }) => (
              <button
                ref={providerButton}
                type="submit"
                className="btn btn--primary btn--block"
                disabled={processing}
              >
                {processing ? 'One moment…' : 'Continue with your company account'}
              </button>
            )}
          </Form>
          <p className="signin__or">or sign in with a password</p>
        </>
      )}

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
                autoFocus={!providerSignIn}
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
              className={`btn ${providerSignIn ? 'btn--secondary' : 'btn--primary'} btn--block`}
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
