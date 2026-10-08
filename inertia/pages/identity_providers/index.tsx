import { useState } from 'react'
import Page from '~/components/page'
import { Fingerprint } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'
import CopyButton from '~/components/copy_button'
import EmptyState from '~/components/empty_state'

type PageProps = InertiaProps<{
  identityProviders: Data.IdentityProvider[]
  redirectUri: string
  passwordMembersCount: number
  providerMembersCount: number
}>

/**
 * Edit the provider or remove it. Removing asks first, in the panel.
 */
function ProviderActions({
  org,
  provider,
  membersCount,
}: {
  org: string
  provider: number
  membersCount: number
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <div className="client__actions">
        <Link
          route="identity_providers.edit"
          routeParams={{ org, provider }}
          className="btn btn--secondary btn--sm"
        >
          Edit
        </Link>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => setConfirming(true)}
        >
          Remove
        </button>
      </div>

      {confirming && (
        <Form
          route="identity_providers.destroy"
          routeParams={{ org, provider }}
          className="client__confirm"
          onSuccess={() => setConfirming(false)}
        >
          {({ processing }) => (
            <>
              <p>
                {membersCount === 0
                  ? 'Nobody signs in with it yet.'
                  : `${membersCount} ${membersCount === 1 ? 'member signs' : 'members sign'} in with it. They switch to a password, are signed out everywhere, and can't sign in until they have a password.`}
              </p>
              <div className="client__confirm-actions">
                <button type="submit" className="btn btn--danger btn--sm" disabled={processing}>
                  Yes, remove
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </Form>
      )}
    </>
  )
}

/**
 * How the organization's members sign in: with a password, or with the
 * company's own identity provider once one is connected
 */
export default function IdentityProvidersIndex({
  identityProviders,
  redirectUri,
  passwordMembersCount,
  providerMembersCount,
  organization,
}: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <Page title="Authentication" description="How the people who use your apps prove who they are.">
      {identityProviders.map((identityProvider) => (
        <section key={identityProvider.id} className="panel client" aria-label="Identity provider">
          <header className="client__header">
            <h2 className="section__title">Identity provider</h2>
            <ProviderActions
              org={org}
              provider={identityProvider.id}
              membersCount={providerMembersCount}
            />
          </header>

          <p className="notice">
            {providerMembersCount} {providerMembersCount === 1 ? 'member signs' : 'members sign'} in
            with it.{' '}
            {passwordMembersCount > 0 && (
              <>
                {passwordMembersCount} still {passwordMembersCount === 1 ? 'signs' : 'sign'} in with
                a password.{' '}
                <Link
                  route="identity_providers.members.create"
                  routeParams={{ org, provider: identityProvider.id }}
                >
                  Choose who switches
                </Link>
              </>
            )}
          </p>

          <dl className="kv">
            <dt>People you didn&apos;t add</dt>
            <dd>
              {identityProvider.admitsNewcomers
                ? 'Can join when your provider lets them through, with no access'
                : 'Are refused'}
            </dd>

            <dt>Issuer URL</dt>
            <dd>
              <code className="mono">{identityProvider.issuer}</code>
            </dd>

            <dt>Client ID</dt>
            <dd>
              <code className="mono">{identityProvider.clientId}</code>
            </dd>

            <dt>Client secret</dt>
            <dd>
              <code className="mono">••••••••{identityProvider.secretHint}</code>
            </dd>

            <dt>Redirect URI</dt>
            <dd className="kv__value">
              <code className="mono">{redirectUri}</code>
              <CopyButton value={redirectUri} label="Copy redirect URI" />
            </dd>
          </dl>
        </section>
      ))}

      {identityProviders.length === 0 && (
        <section className="panel" aria-label="Identity provider">
          <EmptyState
            icon={Fingerprint}
            title="Members sign in with an email and password"
            action={
              <Link
                route="identity_providers.create"
                routeParams={{ org }}
                className="btn btn--primary btn--sm"
              >
                Connect your identity provider
              </Link>
            }
          >
            Connect Google Workspace, Microsoft Entra or Okta, and your staff sign in with the
            accounts they already have.
          </EmptyState>
        </section>
      )}
    </Page>
  )
}

IdentityProvidersIndex.layout = [ConsoleLayout]
