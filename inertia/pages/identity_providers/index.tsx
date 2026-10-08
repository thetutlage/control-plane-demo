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
}>

/**
 * Edit the provider or remove it. Removing asks first, in the panel.
 */
function ProviderActions({ org, provider }: { org: string; provider: number }) {
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
              <p>The provider&apos;s details and its client secret are removed from here.</p>
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
  organization,
}: PageProps) {
  const org = organization?.slug ?? ''

  return (
    <Page title="Authentication" description="How the people who use your apps prove who they are.">
      {identityProviders.map((identityProvider) => (
        <section key={identityProvider.id} className="panel client" aria-label="Identity provider">
          <header className="client__header">
            <h2 className="section__title">Identity provider</h2>
            <ProviderActions org={org} provider={identityProvider.id} />
          </header>

          <p className="notice">
            Saved, and not used yet. Members sign in with an email and password until sign-in with
            your provider is switched on.
          </p>

          <dl className="kv">
            <dt>Email domains</dt>
            <dd>
              <ul className="kv__list">
                {identityProvider.domains.map((domain) => (
                  <li key={domain}>
                    <code className="mono">{domain}</code>
                  </li>
                ))}
              </ul>
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
