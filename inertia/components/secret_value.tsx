import { useState } from 'react'
import CopyButton from '~/components/copy_button'

/**
 * A client secret, masked down to its last four characters. When the full
 * secret is available it can be revealed and copied; otherwise only the
 * hint is shown.
 */
export default function SecretValue({ secret, hint }: { secret: string | null; hint: string }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <span className="kv__value">
      <code className="mono">{revealed && secret ? secret : `••••••••${hint}`}</code>
      {secret && (
        <>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
          <CopyButton value={secret} label="Copy client secret" />
        </>
      )}
    </span>
  )
}
