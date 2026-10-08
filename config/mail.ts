import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER'),

  /**
   * The sender of every email
   */
  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },

  /**
   * Shared with every email template
   */
  globals: {
    brandName: 'Backlit',
  },

  /**
   * In development, SMTP points at the Mailpit container in
   * `compose.yaml`, which keeps every email for reading at
   * http://localhost:8025
   */
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
