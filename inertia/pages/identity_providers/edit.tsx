import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import IdentityProviderFields from '~/components/identity_provider_fields'

type PageProps = InertiaProps<{
  identityProvider: Data.IdentityProvider
  redirectUri: string
  tiedMembersCount: number
}>

export default function IdentityProvidersEdit({
  identityProvider,
  redirectUri,
  tiedMembersCount,
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

            <div className="field">
              <label className="check">
                <input
                  type="checkbox"
                  name="admitsNewcomers"
                  defaultChecked={identityProvider.admitsNewcomers}
                />
                People my provider lets through can join without being added
                <span className="check__hint">
                  They become members with no access to any app. When this is off, only members you
                  set to sign in with your provider can.
                </span>
              </label>
            </div>

            {tiedMembersCount > 0 && (
              <div className="field">
                <label className="check">
                  <input type="checkbox" name="confirmsIssuerChange" />
                  I&apos;m replacing the provider
                  <span className="check__hint">
                    Only needed when you change the issuer URL. {tiedMembersCount}{' '}
                    {tiedMembersCount === 1 ? 'member has' : 'members have'} signed in with the
                    current provider. They keep signing in with your provider, and are matched by
                    email again the next time.
                  </span>
                </label>
                {errors.confirmsIssuerChange && (
                  <span className="field__error">{errors.confirmsIssuerChange}</span>
                )}
              </div>
            )}

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
