import { useState } from 'react'

/**
 * Copies a value to the clipboard, and says so for a moment
 */
export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button type="button" className="btn btn--ghost btn--sm" aria-label={label} onClick={copy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
