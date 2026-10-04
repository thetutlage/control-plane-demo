import { Head } from '@inertiajs/react'
import type { InertiaProps } from '~/types'
import SignInLayout from '~/layouts/sign_in'

type PageProps = InertiaProps<{
  title: string
  message: string
  code: string
}>

/**
 * The error page of an issuer host, for everything outside `/oauth`: the
 * sign-in page's errors, unknown pages and crashes. Its twin for
 * oidc-provider's own endpoints is `resources/views/errors/oidc.edge`.
 */
export default function OidcError({ title, message, code }: PageProps) {
  return (
    <>
      <Head title={title} />
      <h1 className="auth__title">{title}</h1>
      <p className="auth__sub">{message}</p>
      <p className="signin__code mono">{code}</p>
    </>
  )
}

OidcError.layout = [SignInLayout]
