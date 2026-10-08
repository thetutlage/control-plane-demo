import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'
import SignInLayout from '~/layouts/sign_in'

type PageProps = InertiaProps<{
  organizationName: string
  environmentName: string
  isProduction: boolean
  token: string
  email: string | null
  passwordSet: boolean
}>

/**
 * The page behind an emailed link: the form to set a password while the
 * link works, and otherwise what happened to it. There is no app to send
 * the member on to, so a set password ends here.
 */
export default function PasswordResetsShow({
  organizationName,
  environmentName,
  isProduction,
  token,
  email,
  passwordSet,
}: PageProps) {
  const environment = !isProduction && (
    <p className="signin__env" role="note">
      {environmentName}
    </p>
  )

  if (passwordSet) {
    return (
      <>
        <Head title="Password set" />
        {environment}
        <h1 className="auth__title">Password set</h1>
        <p className="auth__sub">
          Go back to the app you were opening and sign in to {organizationName} with your new
          password. You were signed out everywhere else.
        </p>
      </>
    )
  }

  if (email === null) {
    return (
      <>
        <Head title="This link no longer works" />
        {environment}
        <h1 className="auth__title">This link no longer works</h1>
        <p className="auth__sub">
          It was already used, has expired, or was replaced by a newer one.
        </p>
        <p className="auth__foot">
          <Link route="password_resets.create">Send me a new link</Link>
        </p>
      </>
    )
  }

  return (
    <>
      <Head title="Set your password" />
      {environment}
      <h1 className="auth__title">Set your password</h1>
      <p className="auth__sub">
        for {email} at {organizationName}
      </p>

      <Form
        route="password_resets.update"
        routeParams={{ token }}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => {
          /**
           * The validator reports passwords that differ on the confirmation
           * field, which the form's error type does not list
           */
          const mismatch = (errors as Record<string, string | undefined>).passwordConfirmation

          return (
            <div className="auth__form">
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
                  autoFocus
                  aria-describedby="passwordHint"
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                <span id="passwordHint" className="field__hint">
                  8 to 32 characters
                </span>
                {errors.password && <span className="field__error">{errors.password}</span>}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="passwordConfirmation">
                  Confirm password
                </label>
                <input
                  id="passwordConfirmation"
                  name="passwordConfirmation"
                  type="password"
                  className="field__input"
                  autoComplete="new-password"
                  aria-invalid={mismatch ? 'true' : 'false'}
                />
                {mismatch && <span className="field__error">{mismatch}</span>}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--block"
                disabled={processing}
                style={{ marginTop: 4 }}
              >
                {processing ? 'Saving…' : 'Set password'}
              </button>
            </div>
          )
        }}
      </Form>
    </>
  )
}

PasswordResetsShow.layout = [SignInLayout]
