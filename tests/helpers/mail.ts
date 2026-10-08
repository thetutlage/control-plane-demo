import type { BaseMail } from '@adonisjs/mail'

/**
 * The link in a queued email, read from its plain-text body the way the
 * member's mail client shows it
 */
export async function linkIn(mail: BaseMail) {
  await mail.buildWithContents()
  const { text } = mail.message.toObject().message
  const link = String(text).match(/https?:\/\/\S+/)
  if (!link) {
    throw new Error('The email has no link')
  }
  return link[0]
}
