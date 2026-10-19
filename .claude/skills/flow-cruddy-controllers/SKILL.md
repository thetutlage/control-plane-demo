---
name: flow-cruddy-controllers
description: "CRUDDY controllers — decide which controller and which method each action goes to in an AdonisJS app - a resource controller with the 7 RESTful methods, or a single action controller. Use when you write or review a controller or a route, when you want to add a method such as `approve` or `cancel` to a controller, when two routes need the same method, when you nest a route under a parent, or when another skill needs a controller and a route for each action."
user-invocable: false
---
# CRUDDY Controllers

A resource controller owns **one resource**. It has only the 7 methods in this table. They are its **regular methods**.

| Method    | Purpose                       | HTTP Verb |
| --------- | ----------------------------- | --------- |
| `index`   | List resources                | GET       |
| `show`    | View a single resource        | GET       |
| `create`  | Render the creation page/form | GET       |
| `store`   | Create the resource           | POST      |
| `edit`    | Render the edit page/form     | GET       |
| `update`  | Update the resource           | PUT/PATCH |
| `destroy` | Delete the resource           | DELETE    |

Use these rules when you write controllers and routes and when you review them.

**Harness docs.** Open `CLAUDE.md`. Find the `[AdonisJS Harness Docs Index]` block. Join its `root:` field to the absolute path of the project root. Each `<harness>/...` path starts at that directory. If the block is missing, say that the AdonisJS harness is not installed, and stop.

## Rules

- Do not add a method that is not in the table, such as `approve`, `cancel` or `confirm`. "Transitions" says where such an action goes.
- A controller has one route for each method. Two routes that need the same method are a **collision**. In a collision, one of the routes acts on a different resource. Give that resource its own controller. For example, `POST /posts/:id/reviews` and `POST /reviews/:id/moderations` both need `store`. The second route creates a moderation, so it is `store` of `ModerationsController`.
- Different permissions are not a reason for a second controller. One `store` with a policy serves a customer and an admin who send the same payload.
- When a second route lists the same records with a condition, it is a filter and not a collision. Use a query string, such as `/posts?status=draft`, not a `DraftsController`.
- A URL uses the word that the user knows. It does not have to match the name of the controller. `/login` goes to `SessionsController`.
- Do not name a controller like a join table, such as `UserMutesController`. `references/naming.md` gives the names to use.
- `references/examples.md` has worked layouts to compare with.

## Transitions

A **transition** is an action that changes the state of a resource, such as confirm, cancel or publish.

- When the transitions are the whole life of the resource, they are its regular methods. A newsletter subscription has `store` to subscribe, `update` to confirm and `destroy` to unsubscribe.
- When the resource already uses its regular methods for ordinary editing and deleting, a transition is a separate thing on top of it. Give the transition its own controller. An order is changed with `update` and deleted with `destroy`, so its cancellation is `store` of `OrderCancellationsController`.
- `references/state-transitions.md` has worked cases.

## Nested routes

- When a child can be found by its own id, use shallow routes. `index`, `create` and `store` keep the parent in the URL. `show`, `edit`, `update` and `destroy` use the id of the child only.
- Nest a child fully only when its id has a meaning inside the parent only, for example a line number inside an order.
- Do not nest more than one level.
- `<harness>/routing.md` shows `router.shallowResource`.

## Single action controllers

A resource controller is the norm. A single action controller is the exception.

- Use a single action controller for an action that is not part of a resource and that will stay one action. Name it for the action, and give it one `handle` method. An example is `ReceiveStripeWebhookController`.
- Do not use a single action controller for a transition. A transition is a method of its resource, or it gets a resource controller of its own.
- When a single action controller needs a second action, replace it with a resource controller. Do not add a second method to it.

## Hand back

Start with the receipt: `Reads: <the harness docs read this run>`. Then give these blocks. Omit a block that has nothing in it.

- **Controllers to add** — each controller with its kind (resource or single action), its methods and the route of each method.
- **Rules broken** — each controller or route that breaks a rule, with its file, the rule and the change that it needs.
