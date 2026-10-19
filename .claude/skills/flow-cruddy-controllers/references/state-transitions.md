# State Transitions

A transition is an action that changes the state of a resource, such as confirm, cancel or publish. A transition is not a method name.

One question decides where a transition goes: **does the resource already use its regular methods for ordinary editing and deleting?**

## Transitions that are the life of the resource

The resource has no ordinary editing. Its transitions are how it is created, changed and ended, so they are its regular methods.

- **Newsletter subscription**: `store` subscribes, `update` confirms, `destroy` unsubscribes. One `NewsletterSubscriptionsController`.
- **Friend request**: `store` sends it, `update` accepts or rejects it with the choice in the payload, `destroy` withdraws it. One `FriendRequestsController`.
- **Email verification**: `store` sends the email, `update` confirms the address when the link is opened. One `EmailVerificationsController`.

## Transitions on top of a resource

The resource already uses `update` to change its content and `destroy` to delete it. A transition is a separate thing on top of that. Give each transition its own controller. More transitions can then be added later with no change to the controller of the resource.

- **Order**: cancel is `store` of `OrderCancellationsController`. Ship is `store` of `OrderShipmentsController`. Refund is `store` of `OrderRefundsController`.
- **Post**: publish is `store` of `PublishedPostsController`, and unpublish is its `destroy`. Archive is `store` of `ArchivedPostsController`, and restore is its `destroy`. A moderator's decision is `store` of `PostModerationsController`, with approve or reject in the payload.

## Naming the controller of a transition

`references/naming.md` has the rules. There are two forms:

- A noun for the thing that the transition creates: a cancellation, a refund, a moderation.
- A state with the resource, when the transition puts the resource in a list that the user knows: archived posts, muted users. `store` adds to the list and `destroy` removes from it.

## Worked traces

### Trace 1 — Newsletter subscription

Actions: subscribe, confirm from an email link, unsubscribe from an email link.

```
POST   /newsletter/subscriptions          → store     subscribe
GET    /newsletter/subscriptions/:token   → show      the page that the email links open
PATCH  /newsletter/subscriptions/:token   → update    confirm
DELETE /newsletter/subscriptions/:token   → destroy   unsubscribe
```

Four routes and four different methods, so nothing collides. A subscription has no other editing, so its transitions are its methods. One `NewsletterSubscriptionsController`.

### Trace 2 — Friend request

Actions: send, accept, reject, withdraw, list friends, unfriend.

```
POST   /friend-requests        → store
GET    /friend-requests        → index
GET    /friend-requests/:id    → show
PATCH  /friend-requests/:id    → update     (accept or reject, in the payload)
DELETE /friend-requests/:id    → destroy    (withdraw)
GET    /friends                → index      ← collides
DELETE /friends/:id            → destroy    ← collides
```

Accept, reject and withdraw are the life of the request, so they are its methods. The list of friends collides on `index` and `destroy`, and a friendship is a different resource. `FriendshipsController` has no `store`, because a friendship starts when a request is accepted.

### Trace 3 — Blog post

Actions: write, edit, delete, publish, unpublish, archive, and a moderator's approve or reject.

```
PATCH  /posts/:id                → PostsController.update             save the content
DELETE /posts/:id                → PostsController.destroy            delete the post
POST   /posts/:id/publication    → PublishedPostsController.store     publish
DELETE /posts/:id/publication    → PublishedPostsController.destroy   unpublish
POST   /posts/:id/archive        → ArchivedPostsController.store      archive
GET    /posts/:id/moderation     → PostModerationsController.create   the review page
POST   /posts/:id/moderation     → PostModerationsController.store    approve or reject
```

`PostsController` already uses `update` and `destroy` for the content. Each transition is a controller of its own.

### Trace 4 — Support tickets

Actions: a customer opens a ticket. Support staff also open tickets for a customer. Both read tickets.

```
POST /tickets    → store
GET  /tickets    → index
```

Both roles use the same two routes with the same payload, so nothing collides. One `TicketsController`, and a policy admits both roles. `index` limits the list to what the caller can see.

It becomes two resources only when the list for support is a different view: different columns, its own filters and its own pagination. Then `GET /support/tickets` is a second `index`, and the collision is real.
