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

/**
 * A signed-in member who has no role on the app in this environment.
 * Going back tells the app the sign-in was refused.
 */
export default function SignInNoAccess({
  signInId,
  organizationName,
  environmentName,
  isProduction,
  appName,
}: PageProps) {
  return (
    <>
      <Head title={`No access to ${appName}`} />
      {!isProduction && (
        <p className="signin__env" role="note">
          {environmentName}
        </p>
      )}
      <h1 className="auth__title">You don&apos;t have access to {appName}</h1>
      <p className="auth__sub">
        Ask an admin of {organizationName} to give you a role on {appName}.
      </p>

      <Form route="sign_in.destroy" routeParams={{ signInId }}>
        {({ processing }) => (
          <div className="auth__form">
            <button type="submit" className="btn btn--secondary btn--block" disabled={processing}>
              Back to {appName}
            </button>
          </div>
        )}
      </Form>
    </>
  )
}

SignInNoAccess.layout = [SignInLayout]
