import type { Data } from '@generated/data'

type Props = {
  errors: Record<string, string | undefined>
  values?: Pick<
    Data.App.Variants['forSettings'],
    'appUrl' | 'redirectUris' | 'postLogoutRedirectUris'
  >
}

/**
 * The app URL, redirect URIs and sign-out redirect URIs of an app, for the
 * register and edit forms. `values` prefills them when editing.
 */
export default function ClientUrlFields({ errors, values }: Props) {
  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="appUrl">
          App URL
        </label>
        <input
          id="appUrl"
          name="appUrl"
          type="url"
          className="field__input"
          placeholder="https://invoices.acme.com"
          defaultValue={values?.appUrl}
          aria-describedby="appUrlHint"
          aria-invalid={errors.appUrl ? 'true' : 'false'}
        />
        <span id="appUrlHint" className="field__hint">
          Where the app runs in this environment.
        </span>
        {errors.appUrl && <span className="field__error">{errors.appUrl}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="redirectUris">
          Redirect URIs
        </label>
        <textarea
          id="redirectUris"
          name="redirectUris"
          rows={4}
          className="field__input field__input--textarea mono"
          spellCheck={false}
          placeholder="https://invoices.acme.com/auth/callback"
          defaultValue={values?.redirectUris.join('\n')}
          aria-describedby="redirectUrisHint"
          aria-invalid={errors.redirectUris ? 'true' : 'false'}
        />
        <span id="redirectUrisHint" className="field__hint">
          One per line. Members are only ever sent back to these exact URLs after signing in.
          Production requires https; other environments also allow http on localhost.
        </span>
        {errors.redirectUris && <span className="field__error">{errors.redirectUris}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="postLogoutRedirectUris">
          Sign-out redirect URIs
        </label>
        <textarea
          id="postLogoutRedirectUris"
          name="postLogoutRedirectUris"
          rows={2}
          className="field__input field__input--textarea mono"
          spellCheck={false}
          placeholder="https://invoices.acme.com"
          defaultValue={values?.postLogoutRedirectUris.join('\n')}
          aria-describedby="postLogoutRedirectUrisHint"
          aria-invalid={errors.postLogoutRedirectUris ? 'true' : 'false'}
        />
        <span id="postLogoutRedirectUrisHint" className="field__hint">
          {
            'Optional, one per line. Where the app may send members after signing them out. Without one, members see a "You\'re signed out" page.'
          }
        </span>
        {errors.postLogoutRedirectUris && (
          <span className="field__error">{errors.postLogoutRedirectUris}</span>
        )}
      </div>
    </>
  )
}
