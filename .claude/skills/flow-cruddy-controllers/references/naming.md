# Naming Rules

The single most common CRUDDY mistake is naming a controller after a verb. Controllers are nouns. Methods are verbs (and only the 7 RESTful ones).

## The naming rule

**Name the thing that gets created, viewed, or destroyed.** If you cannot name it, the model is wrong.

| Bad (verb)                      | Good (noun)                                     | Reasoning                                      |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| `LoginController`               | `SessionsController`                            | A session is the thing that gets created.      |
| `LogoutController`              | `SessionsController.destroy()`                  | Logout destroys a session.                     |
| `SignupController`              | `AccountsController`                            | Signup creates an account.                     |
| `ConfirmSubscriptionController` | `NewsletterSubscriptionsController.update()`    | Confirming updates the subscription.           |
| `UnsubscribeController`         | `NewsletterSubscriptionsController.destroy()`   | Unsubscribing destroys the subscription.       |
| `ApproveController`             | `ModerationsController`                         | A moderation is the thing.                     |
| `ResetPasswordController`       | `PasswordResetsController`                      | A password reset is the thing.                 |
| `VerifyEmailController`         | `EmailVerificationsController`                  | An email verification is the thing.            |
| `PayController`                 | `OrderPaymentsController`                       | A payment is the thing.                        |
| `RefundController`              | `OrderRefundsController`                        | A refund is the thing.                         |
| `CancelOrderController`         | `OrderCancellationsController`                  | A cancellation is the thing that gets created.  |

The translation rule: if the verb describes an action that produces a record (logical or physical), the noun form of that record is the controller name. "Approve a post" produces a **post moderation** → `PostModerationsController`.

Name the decision, not one of its outcomes. A moderator approves *or* rejects, so the noun is a moderation, not an approval — `store()` records it with the decision in the payload.

## Tokens are side effects

Flows involving tokens (email verification, password reset, magic links) tempt you to name the controller around the token: `PasswordResetTokensController`, `EmailVerificationTokensController`. Resist.

The user does not think "I am destroying a token." They think "I am resetting my password" or "I am verifying my email." Name the controller around the **user intent**, not the system mechanic.

| Bad                                 | Good                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `PasswordResetTokensController`     | `PasswordResetsController`                                                                  |
| `EmailVerificationTokensController` | `EmailVerificationsController`                                                              |
| `MagicLinkTokensController`         | `MagicLinkSessionsController` (or `SessionsController` if magic link is just one auth path) |

The token is an implementation detail of the resource. The resource is the user-facing flow.

## State-based resources

When the resource represents a **state applied to another entity** (muted users, archived posts, pinned tabs, blocked senders), pick the name by how the user describes the collection in the product, not by mashing the entity name with an abstract state noun.

**Spoken-aloud test:** say the controller name as `my <name>` or `list of <name>`. If it sounds like something a user would say in the UI, keep it. If it sounds like a database junction table or backend record, refactor.

Two valid shapes:

1. **Domain noun the user already says.** Use when one exists.
   - `SubscriptionsController`, `BookmarksController`, `FavoritesController`, `FriendRequestsController`, `BansController`, `ReservationsController`.
   - Spoken: "my subscriptions" ✓.
2. **Adjective + entity.** Use when no single domain noun exists for the state.
   - `MutedUsersController`, `ArchivedPostsController`, `PinnedTabsController`, `BlockedSendersController`.
   - Spoken: "my muted users" ✓.

**Avoid: entity + abstract state noun.** Reads like a junction table, not a user-facing collection.

| Bad                      | Good                       | Reasoning                                                              |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------- |
| `UserMutesController`    | `MutedUsersController`     | "my muted users" reads natural; "my user mutes" reads like a DB table. |
| `PostArchivesController` | `ArchivedPostsController`  | "list of archived posts" ✓.                                            |
| `TabPinsController`      | `PinnedTabsController`     | "my pinned tabs" ✓.                                                    |
| `SenderBlocksController` | `BlockedSendersController` | "my blocked senders" ✓.                                                |

Once named, the **lifecycle** maps onto the 7 RESTful methods naturally:

- `store` adds an entity to the state collection (`mute this user` → add to `MutedUsers`).
- `destroy` removes it (`unmute` → remove from `MutedUsers`).
- `update` changes the state instance (rare for binary states; common for `Subscriptions` where tier or preference changes).
- `index` lists the collection.
- `show` views a single instance when it has detail worth displaying.
- `create` / `edit` render the form pages when a dedicated page is part of the flow.

Use as many of the 7 methods as the lifecycle actually needs — could be just `store` + `destroy`, could be all 7.

This is the case where several routes share one controller because they trace **one noun's lifecycle**: mute and unmute both act on a muted user, so they are `store` and `destroy` on `MutedUsersController`, not two controllers.

## Same row, two resources

The same database row can be exposed as two resources — but the test is how the row is **identified**, not who is allowed to touch it.

`AccountsController` and `UsersController` both read the `users` table:

```
GET    /account       → the row comes from the session; there is no id
GET    /users/:id     → the row comes from the collection, named by id
```

Both need `show`, `update`, and `destroy`, so those methods **collide** — two resources. The shapes differ because the identity does: `/account` is a single thing with no `index` (you cannot list your own one account) and no `:id` (the URL would be meaningless), while `/users/:id` is a member of a collection.

| Controller           | Identified by | Methods                                   |
| -------------------- | ------------- | ----------------------------------------- |
| `AccountsController` | the session   | `create`, `store`, `show`, `edit`, `update`, `destroy` |
| `UsersController`    | an id in the URL | `index`, `show`, `edit`, `update`, `destroy`   |

**Differing permissions are not a second resource.** When a customer and an admin both `POST /tickets` with the same payload, that is one `store()` and a policy that admits both. Splitting into two controllers to encode a permission duplicates the whole CRUD surface to express what a policy expresses in a line — and a third role then wants a third controller. A role a policy can express is a policy. Fields only one role may set are a validator; fields only one role may see are a transformer.

**`Admin/` is a routing decision, not a naming one.** A namespace groups URLs under an admin area with its own middleware and layout. It does not make a resource, and it cannot disambiguate two controllers that should have been one.

## Temporary vs lasting resources

Some flows produce a **temporary** resource that resolves into a **lasting** one. These are separate controllers because their lifecycles do not overlap — and the route table shows it: both want `index` and `destroy`.

| Temporary                   | Lasting                      |
| --------------------------- | ---------------------------- |
| `FriendRequestsController`  | `FriendshipsController`      |
| `TeamInvitationsController` | `TeamMembershipsController`  |
| `JobApplicationsController` | `EmploymentsController`      |
| `RsvpsController`           | `EventAttendancesController` |

Why split: a friend request and a friendship are different things. A friend request can be withdrawn, accepted, rejected. A friendship can be unfriended. Same database concern (a relationship between two users), different lifecycles.

When a temporary resolves into a lasting:

- Temporary: `FriendRequestsController.store()` creates the request, `update()` accepts/rejects, `destroy()` withdraws.
- Lasting: `FriendshipsController.index()` lists friends, `destroy()` unfriends. (No `store()` — friendships come into being as a side effect of accepting a friend request, not by direct creation.)

## Quick translation drills

When the user describes a feature with a verb, find the noun. Practice:

- "the user resets their password" → a **password reset** is created → `PasswordResetsController`
- "the moderator approves a post" → a **moderation** is created → `PostModerationsController`
- "the customer pays for an order" → a **payment** is created → `OrderPaymentsController`
- "the admin invites a teammate" → an **invitation** is created → `TeamInvitationsController`
- "the user verifies their email" → a **verification** is created (and then consumed) → `EmailVerificationsController`

If you cannot turn the verb into a noun, the model is wrong.
