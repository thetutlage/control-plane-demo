# Members and actors

## Actors

An **actor** is any identity that can hold roles or appear in the audit log. Right now that means members. Apps and agents will be actors later. Role assignments point to `actor_id`, not to a member, so one table covers every kind.

| Column                              | Meaning                           |
| ----------------------------------- | --------------------------------- |
| `type`                              | `ActorType`: MEMBER, APP or AGENT |
| `organization_id`, `environment_id` | where it lives                    |

## Members

A member is a person who signs in to the organization's internal apps, within one environment.

| Column      | Meaning                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| `email`     | unique within the environment                                                      |
| `full_name` | optional                                                                           |
| `password`  | nullable; hashed on save (`withAuthFinder`). Without one, the member can't sign in |
| `status`    | `MemberStatus`: INVITED, ACTIVE or SUSPENDED                                       |
| `actor_id`  | the member's actor, one-to-one                                                     |

## Creating a member

Always create members through the environment, which creates the actor and the member together in one transaction:

```ts
const member = await environment.createMember({
  email: 'sara@acme.com',
  fullName: 'Sara Lee',
  status: MemberStatus.INVITED,
})
```

`Environment.createMember()` is in `app/models/environment.ts`.

## In the console

`/w/:org/environments/:environment/members` lists the environment's members.

**Add member** (`/members/create`) adds an **active** member with a password the admin chooses (8 to 32 characters). They can sign in right away. Emails are unique within the environment (`app/validators/member.ts`).

Inviting members, so they choose their own password, is not built yet.
