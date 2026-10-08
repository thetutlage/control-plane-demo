import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import IdentityProviderFields from '~/components/identity_provider_fields'

type PageProps = InertiaProps<{ identityProvider: Data.IdentityProvider; redirectUri: string }>

export default function IdentityProvidersEdit({
  identityProvider,
  redirectUri,
  organization,
}: PageProps) {
  const routeParams = { org: organization?.slug ?? '' }

  return (
    <Page title="Edit your identity provider">
      <Form
        route="identity_providers.update"
        routeParams={{ ...routeParams, provider: identityProvider.id }}
        options={{ preserveScroll: true }}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <IdentityProviderFields
              redirectUri={redirectUri}
              errors={errors}
              values={identityProvider}
            />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={processing}>
                Save
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

IdentityProvidersEdit.layout = [ConsoleLayout]
