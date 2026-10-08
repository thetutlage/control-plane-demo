import Page from '~/components/page'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import IdentityProviderFields from '~/components/identity_provider_fields'

type PageProps = InertiaProps<{ redirectUri: string }>

export default function IdentityProvidersCreate({ redirectUri, organization }: PageProps) {
  const routeParams = { org: organization?.slug ?? '' }

  return (
    <Page
      title="Connect your identity provider"
      description="Google Workspace, Microsoft Entra, Okta, or any provider that supports OpenID Connect."
    >
      <Form
        route="identity_providers.store"
        routeParams={routeParams}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <IdentityProviderFields redirectUri={redirectUri} errors={errors} />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Connect
              </button>
              <Link
                route="identity_providers.index"
                routeParams={routeParams}
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

IdentityProvidersCreate.layout = [ConsoleLayout]
