import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'
import SignInLayout from '~/layouts/sign_in'

type PageProps = InertiaProps<{
  organizationName: string
  environmentName: string
  isProduction: boolean
  signInId: string | null
}>

/**
 * Asks for the member's email, to send them a link to set a new password
 * from. Reached from the sign-in page, which it links back to.
 */
export default function PasswordResetsCreate({
  organizationName,
  environmentName,
  isProduction,
  signInId,
}: PageProps) {
  return (
    <>
      <Head title="Forgot password" />
      {!isProduction && (
        <p className="signin__env" role="note">
          {environmentName}
        </p>
      )}
      <h1 className="auth__title">Forgot password</h1>
      <p className="auth__sub">
        Enter the email you sign in to {organizationName} with, and we&apos;ll send a link to set a
        new password.
      </p>

      <Form route="password_resets.store" options={{ preserveScroll: true }} resetOnSuccess>
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

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={processing}
              style={{ marginTop: 4 }}
            >
              {processing ? 'Sending…' : 'Send link'}
            </button>
          </div>
        )}
      </Form>

      {signInId && (
        <p className="auth__foot">
          <Link route="sign_in.show" routeParams={{ signInId }}>
            Back to sign in
          </Link>
        </p>
      )}
    </>
  )
}

PasswordResetsCreate.layout = [SignInLayout]
