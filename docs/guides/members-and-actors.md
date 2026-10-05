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

`/w/:org/:environment/members` lists the environment's members, with how many **active sessions** each has: browsers signed in at the issuer right now.

**The member page** (`/w/:org/:environment/members/:member`) shows the member's environment as a badge, and:

- **Active sessions:** one row per browser, with when they signed in and when the session expires.
- **Apps used:** every app the member has ever signed in to, with the first and last sign-in.
- **Sign out everywhere:** asks first, then `DELETE …/members/:member/sessions` (`MemberSessionsController.destroy`) calls `member.signOutEverywhere()`, which deletes the member's sessions and grants in the environment (their codes and refresh tokens go with the grants). Every app on every browser fails its next refresh, within 5 minutes, and the next visit to the issuer asks for the password.

### Apps used

Grants are temporary: they expire after 14 days, and sign-out deletes them. So `member_apps` keeps the lasting record, one row per member (`actor_id`) and app, with `first_signed_in_at` and `last_signed_in_at`. Removing the app removes its rows.

A row is written on every visit to the issuer, including silent SSO ones: `createProvider()` calls its `recordSignIn` input when it creates a grant, and both issuer middleware pass `MemberApp.recordSignIn()`.

There's no "active apps": a member is signed in on browsers (sessions), and has used apps.

**Add member** (`/members/create`) adds an **active** member with a password the admin chooses (8 to 32 characters). They can sign in right away. Emails are unique within the environment (`app/validators/member.ts`).

Inviting members, so they choose their own password, is not built yet.
