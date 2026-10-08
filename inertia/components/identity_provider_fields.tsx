import type { Data } from '@generated/data'
import CopyButton from '~/components/copy_button'

type Props = {
  redirectUri: string
  errors: Record<string, string | undefined>
  values?: Data.IdentityProvider
}

/**
 * The redirect URI to register at the identity provider, then the fields
 * that connect it: the staff email domains and the client the company
 * created at the provider. `values` prefills them when editing, where a
 * blank client secret keeps the current one.
 */
export default function IdentityProviderFields({ redirectUri, errors, values }: Props) {
  return (
    <>
      <div className="notice">
        <p>
          Create an OpenID Connect app at your provider, and register this redirect URI there. It is
          the same for every environment.
        </p>
        <span className="kv__value">
          <code className="mono">{redirectUri}</code>
          <CopyButton value={redirectUri} label="Copy redirect URI" />
        </span>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="domains">
          Email domains
        </label>
        <textarea
          id="domains"
          name="domains"
          rows={2}
          className="field__input field__input--textarea mono"
          spellCheck={false}
          placeholder="acme.com"
          defaultValue={values?.domains.join('\n')}
          aria-describedby="domainsHint"
          aria-invalid={errors.domains ? 'true' : 'false'}
        />
        <span id="domainsHint" className="field__hint">
          One per line. People with an email on these domains are your staff.
        </span>
        {errors.domains && <span className="field__error">{errors.domains}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="issuer">
          Issuer URL
        </label>
        <input
          id="issuer"
          name="issuer"
          type="url"
          className="field__input mono"
          spellCheck={false}
          placeholder="https://acme.okta.com"
          defaultValue={values?.issuer}
          aria-describedby="issuerHint"
          aria-invalid={errors.issuer ? 'true' : 'false'}
        />
        <span id="issuerHint" className="field__hint">
          Google Workspace: <code className="mono">https://accounts.google.com</code>. Entra:{' '}
          <code className="mono">https://login.microsoftonline.com/&lt;tenant ID&gt;/v2.0</code>.
          Okta: <code className="mono">https://&lt;your org&gt;.okta.com</code>.
        </span>
        {errors.issuer && <span className="field__error">{errors.issuer}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="clientId">
          Client ID
        </label>
        <input
          id="clientId"
          name="clientId"
          type="text"
          className="field__input mono"
          spellCheck={false}
          autoComplete="off"
          defaultValue={values?.clientId}
          aria-invalid={errors.clientId ? 'true' : 'false'}
        />
        {errors.clientId && <span className="field__error">{errors.clientId}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="clientSecret">
          Client secret
        </label>
        <input
          id="clientSecret"
          name="clientSecret"
          type="password"
          className="field__input mono"
          autoComplete="off"
          aria-describedby={values ? 'clientSecretHint' : undefined}
          aria-invalid={errors.clientSecret ? 'true' : 'false'}
        />
        {values && (
          <span id="clientSecretHint" className="field__hint">
            Leave blank to keep the current secret, ending in {values.secretHint}.
          </span>
        )}
        {errors.clientSecret && <span className="field__error">{errors.clientSecret}</span>}
      </div>
    </>
  )
}
