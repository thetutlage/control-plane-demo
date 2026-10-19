# Worked Controller Layouts

Twelve concrete CRUDDY layouts for AdonisJS + Inertia React apps. Use these as comparison points when the user describes a feature that resembles one of these. `create()` and `edit()` render Inertia pages (e.g. `inertia/pages/posts/new.tsx`); `store()`/`update()`/`destroy()` are server actions that respond with redirects or Inertia responses.

Where a layout has more than one controller, the note says why.

## Table of contents

1. [Signup and Profile](#signup-and-profile)
2. [Login (Cookie Sessions)](#login-cookie-sessions)
3. [Login (API Tokens)](#login-api-tokens)
4. [Email Verification](#email-verification)
5. [Password Reset](#password-reset)
6. [Change Password (While Logged In)](#change-password-while-logged-in)
7. [Newsletter Subscription](#newsletter-subscription)
8. [Podcast Subscription](#podcast-subscription)
9. [E-commerce Order](#e-commerce-order)
10. [Friend Request](#friend-request)
11. [Team Invitation](#team-invitation)
12. [Blog Post Moderation](#blog-post-moderation)
13. [Two-Factor Authentication](#two-factor-authentication)

---

## Signup and Profile

```
AccountsController
  create()  → render signup page
  store()   → create account
  show()    → view profile
  edit()    → render settings page
  update()  → save settings
  destroy() → delete account
```

The same `users` row is also exposed as `UsersController` for admin screens, because `/account` (no id, resolved from the session) and `/users/:id` both want `show`, `update`, and `destroy`. The split is the identity collision, not the permission difference — see `references/naming.md` → Same row, two resources.

## Login (Cookie Sessions)

```
SessionsController
  create()  → render login page
  store()   → authenticate, create session
  destroy() → logout
```

Login is not a verb on the user — it is the creation of a session. Logout destroys the session.

## Login (API Tokens)

```
ApiTokensController
  store()   → issue token
  index()   → list active tokens
  destroy() → revoke token
```

Tokens are first-class resources here. The user can manage their tokens (list, create, revoke).

## Email Verification

```
EmailVerificationsController
  create()  → render resend page
  store()   → send verification email
  update()  → confirm email (token consumed as side effect)
```

The verify-via-link flow adds no route of its own: there is no page to read or fill in. The user clicks the email link, `update()` consumes the token, the email is confirmed. The token is a side effect — not the resource.

## Password Reset

```
PasswordResetsController
  create()  → render forgot password page
  store()   → send reset email
  show()    → render new password page
  update()  → submit new password (token consumed as side effect)
```

Two flows in one controller: requesting the reset (`create`/`store`) and consuming it (`show`/`update`). Four routes across two URL shapes — `/forgot-password` and `/reset-password/:token` — but four *different* methods, so nothing collides. A password reset is the resource; the token is the implementation mechanism.

## Change Password (While Logged In)

```
PasswordsController
  edit()    → render change password page
  update()  → change password
```

The authenticated user changes their existing password. Distinct from `PasswordResetsController`, which has already claimed `update()` for consuming a token.

## Newsletter Subscription

```
NewsletterSubscriptionsController
  store()   → subscribe
  show()    → render the page that the email links open
  update()  → confirm
  destroy() → unsubscribe
```

A subscription has no ordinary editing. Confirm and unsubscribe are the life of the subscription, so they are its `update` and `destroy`.

## Podcast Subscription

```
PodcastSubscriptionsController
  store()   → subscribe
  index()   → list subscriptions
  destroy() → unsubscribe
```

Subscribe and unsubscribe are the life of the subscription, so they are `store` and `destroy` of one controller.

## E-commerce Order

```
OrdersController
  create()  → render checkout page
  store()   → place order
  show()    → view order
  index()   → list orders

OrderPaymentsController
  store()   → pay for order

OrderCancellationsController
  create()  → render cancellation page
  store()   → cancel order

OrderRefundsController
  create()  → render refund page
  store()   → process refund
  show()    → view refund status
```

Paying, cancelling and refunding are transitions on top of the order, which already uses its regular methods. Payment, cancellation and refund are three nouns, with a controller each.

Shipping and delivery are transitions on top of the order too. Each gets its own controller, for example `OrderShipmentsController`.

## Friend Request

```
FriendRequestsController
  store()   → send request
  index()   → list pending requests
  show()    → view request (accept/reject buttons here)
  update()  → accept or reject (state passed in form)
  destroy() → withdraw sent request

FriendshipsController
  index()   → list friends
  destroy() → unfriend
```

Accept and reject share one page and one route, so they share one `update()`. The friends list is what splits: it collides on `index` and `destroy`, and a friendship is a different noun with a different lifecycle. `FriendshipsController` has no `store()` — a friendship comes into being as a side effect of accepting a request.

## Team Invitation

```
TeamInvitationsController
  store()   → send invitation
  index()   → list pending invitations
  show()    → view invitation (accept/decline here)
  update()  → accept or decline (state passed in form)
  destroy() → revoke invitation

TeamMembershipsController
  index()   → list members
  show()    → view member
  update()  → change role
  destroy() → remove member
```

Same shape as friend request: a temporary resource resolving into a lasting one, colliding on `index`, `show`, `update`, and `destroy`. Role changes are a button on the member row, so they ride `TeamMembershipsController.update()`.

## Blog Post Moderation

```
PostsController
  create()  → render new post page
  store()   → save draft
  index()   → list posts
  show()    → view post
  edit()    → render edit page
  update()  → update content
  destroy() → delete post

PublishedPostsController
  store()   → publish
  destroy() → unpublish

ArchivedPostsController
  store()   → archive
  destroy() → restore

PostModerationsController
  create()  → render review page (approve/reject buttons)
  store()   → record the decision
```

`PostsController.update()` saves the content. Publish and archive are transitions on top of the post, so each has its own controller. `store` puts the post in the state, and `destroy` takes it out.

A moderation is a transition on top of the post too. The noun is a **moderation** — the decision covering both outcomes — and the post's state change is a side effect of one being created. Approve and reject share the page and the route, so they are one `store()` with the decision in the payload.

Named `PostModerations` rather than `PostReviews` because reader-submitted reviews of a post are a different resource, and the name has to say which one it is.

## Two-Factor Authentication

```
TwoFactorSecretsController
  store()   → generate secret
  show()    → display QR code
  destroy() → disable 2FA

TwoFactorDevicesController
  store()   → register device (verify code)
  index()   → list devices
  destroy() → remove device

TwoFactorBackupCodesController
  store()   → generate backup codes
  index()   → view backup codes
```

Three nouns inside 2FA: the secret (the seed), the registered devices (clients that have proven they hold the seed), and backup codes (single-use recovery). Each has its own lifecycle, and the route table wants `store` three times, `index` twice, `destroy` twice. Cramming them into one `TwoFactorController` produces ten custom verb methods; the collisions produce three small controllers.
