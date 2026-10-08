import { useState } from 'react'
import Page from '~/components/page'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import ConsoleLayout from '~/layouts/console'
import { Form, Link } from '@adonisjs/inertia/react'

type PageProps = InertiaProps<{
  identityProvider: Data.IdentityProvider
  members: Data.Member[]
}>

/**
 * Who signs in with the identity provider? Lists the members who still
 * sign in with a password. It is the last step of connecting a provider,
 * and is linked from the Authentication page afterwards.
 */
export default function ProviderMembersCreate({
  identityProvider,
  members,
  organization,
}: PageProps) {
  const org = organization?.slug ?? ''
  const [selected, setSelected] = useState<number[]>([])
  const everyone = selected.length === members.length

  function toggle(id: number) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]))
  }

  return (
    <Page
      title="Who signs in with your identity provider?"
      description="These members sign in with a password. Nobody changes until you switch them, and a member you switch is signed out everywhere, can no longer use a password, and gets an email saying so."
    >
      <Form
        route="identity_providers.members.store"
        routeParams={{ org, provider: identityProvider.id }}
        options={{ preserveScroll: true }}
        onSuccess={() => setSelected([])}
      >
        {({ errors, processing }) => (
          <div className="panel form">
            <fieldset className="field">
              <legend className="field__label">Members</legend>
              <div className="checks">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={everyone}
                    onChange={() => setSelected(everyone ? [] : members.map(({ id }) => id))}
                  />
                  Everyone ({members.length})
                </label>
                {members.map((member) => (
                  <label key={member.id} className="check">
                    <input
                      type="checkbox"
                      name="memberIds[]"
                      value={member.id}
                      checked={selected.includes(member.id)}
                      onChange={() => toggle(member.id)}
                    />
                    {member.email}
                    {member.fullName && <span className="check__hint">{member.fullName}</span>}
                  </label>
                ))}
              </div>
              {errors.memberIds && <span className="field__error">{errors.memberIds}</span>}
            </fieldset>

            <div className="form__actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={processing || selected.length === 0}
              >
                Switch {selected.length || ''} to the provider
              </button>
              <Link
                route="identity_providers.index"
                routeParams={{ org }}
                className="btn btn--ghost"
              >
                Not now
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

ProviderMembersCreate.layout = [ConsoleLayout]
