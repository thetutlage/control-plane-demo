# Passwords and email

A member who signs in with a password sets it themselves, from a link we email. An admin never types one. The same link resets a forgotten password. A member who signs in with the identity provider has no password here and gets no link.

## The three emails

| Email (`app/mails`)          | Sent when                                                                                                       | Link works for |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------- |
| `SetPasswordNotification`    | An admin adds a password member, switches a member to a password, removes the provider, or sends the link again | 3 days         |
| `ResetPasswordNotification`  | A member asks from **Forgot password?** on the sign-in page                                                     | 1 hour         |
| `ProviderSignInNotification` | An admin adds a member set to the provider, or switches one to it. It has no link                               |                |

- **Where a link points.** A reset link points at the issuer host the member asked on, and outside production its subject starts with the environment's name (`[STAGING]`). A link an admin's action sends has no environment, so it points at the production issuer host.
- **One link at a time from an admin.** `member.sendPasswordSetup()` deletes the member's earlier links, makes a new one and queues the email. Every admin action above calls it.
- **A reset is sent at most once a minute** per member.
- **Switching a member to the provider deletes their links** (`member.signInWith()`).

## Routes

On the issuer host, with no session:

| Method | Path                      | Controller action                 |
| ------ | ------------------------- | --------------------------------- |
| GET    | `/password-resets/create` | `PasswordResetsController.create` |
| POST   | `/password-resets`        | `PasswordResetsController.store`  |
| GET    | `/password-resets/:token` | `PasswordResetsController.show`   |
| PUT    | `/password-resets/:token` | `PasswordResetsController.update` |

In the console:

| Method | Path                                      | Controller action                      |
| ------ | ----------------------------------------- | -------------------------------------- |
| POST   | `/w/:org/members/:member/password-resets` | `MemberPasswordResetsController.store` |

## Asking for a link

- The sign-in page links to the form with `?sign_in=<id>`. It is used only to draw **Back to sign in**.
- **The answer is always the same:** "If that email signs in with a password, we sent it a link." An email is sent only to an active member of the issuer's organization who is set to a password. Unknown emails, suspended members, provider members and other organizations' members get nothing.

## Setting the password

- **A link is looked up within the issuer's organization.** On another organization's host it doesn't work. It also needs its member to still be active and set to a password.
- **A link that doesn't work** gets a page saying so, with a link to ask for a new one.
- **Setting the password** (8 to 32 characters, typed twice) deletes the member's other links and signs them out everywhere, so nobody stays signed in on the old password.
- **It ends on a "Password set" page.** The sign-in that started it may be gone by then, so the member goes back to their app and signs in.

## Tokens

`withManagedPassword()` from `@adonisplus/persona` on `Member` keeps links in `password_reset_tokens`. Only a hash of each token is stored, and a member's rows go with the member.

## Sending

- `config/mail.ts` uses SMTP. In development, `docker compose up -d` starts Mailpit; read every email at http://localhost:8025.
- Emails are MJML with a plain-text twin, in `resources/views/emails`, inside `components/email_layout.edge`.
- `mail.sendLater` queues in memory, so an email queued just before a restart is lost. A lasting queue comes with housekeeping.
- No form here is rate limited by IP yet; that also comes with housekeeping.

## Events

Nothing listens yet; the audit log will.

| Event                     | When                                    |
| ------------------------- | --------------------------------------- |
| `MemberPasswordSet`       | A member set their password from a link |
| `MemberPasswordSetupSent` | An admin sent a member the link again   |

## Tests

- `tests/browser/oidc/password_reset.spec.ts`: asking from the sign-in page and signing in with the new password, a link working once, a first password, being signed out everywhere, the two validation errors, the same answer for emails that get nothing, one email a minute, staging links, another organization's host, and links dying when a member is switched to the provider.
- `tests/browser/console/members.spec.ts` and `provider_members.spec.ts`: which email each admin action queues.
- No test sends real email: `tests/bootstrap.ts` fakes the mailer for every test. A test that checks mail calls `mail.fake()` itself, and `linkIn()` (`tests/helpers/mail.ts`) reads the link from an email's text.
