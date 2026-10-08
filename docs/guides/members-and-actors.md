# Members and actors

## Actors

An **actor** is any identity that can hold roles or appear in the audit log. Right now that means members. Apps and agents will be actors later. Sign-in records point to `actor_id`, not to a member, so one table covers every kind. Actors belong to the organization, so a token's `sub` is the same in every environment; its `iss` tells them apart.

| Column            | Meaning                           |
| ----------------- | --------------------------------- |
| `type`            | `ActorType`: MEMBER, APP or AGENT |
| `organization_id` | where it lives                    |

## Members

A member is a person who signs in to the organization's internal apps. They are the same member in every environment, with one password.

| Column           | Meaning                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `email`          | unique within the organization                                                                                               |
| `full_name`      | optional                                                                                                                     |
| `password`       | nullable; hashed on save (`withAuthFinder`). Without one, the member can't sign in                                           |
| `sign_in_method` | `MemberSignInMethod`: PASSWORD or PROVIDER. Set by an admin ([Identity provider](identity-provider.md#who-signs-in-with-it)) |
| `status`         | `MemberStatus`: INVITED, ACTIVE or SUSPENDED                                                                                 |
| `actor_id`       | the member's actor, one-to-one                                                                                               |

## Creating a member

Always create members through the organization, which creates the actor and the member together in one transaction:

```ts
const member = await organization.createMember({
  email: 'sara@acme.com',
  fullName: 'Sara Lee',
  status: MemberStatus.INVITED,
})
```

`Organization.createMember()` is in `app/models/organization.ts`.

## In the console

`/w/:org/members` lists the organization's members, with how many **active sessions** each has: browsers signed in right now, across every environment's issuer.

**The member page** (`/w/:org/members/:member`) has one section per environment, each with:

- how many browsers the member is signed in on there;
- the apps they have access to there, with their roles and last sign-in.

**Sign out everywhere** asks first, then `DELETE /w/:org/members/:member/sessions` (`MemberSessionsController.destroy`) calls `member.signOutEverywhere()`. It deletes the member's sessions and grants in every environment (their codes and refresh tokens go with the grants). Every app on every browser fails its next refresh, within 5 minutes, and the next visit to an issuer asks for the password.

### Access to apps

A member can sign in to an app in an environment only as an **app member** (`app_members`): one row per environment, member (`actor_id`) and app, holding one or more roles (`app_member_roles`). It's granted and changed on the app's environment tab ([Apps](apps.md#app-members)).

- **Always at least one role.** The forms require one, and deleting a role removes the app members it was the only role of.
- **Sign-ins are recorded on it:** `first_signed_in_at` and `last_signed_in_at`, empty until the member first signs in. They're updated on every visit to the issuer, including silent single sign-on.
- **No app member, no sign-in.** See [Member login](member-login.md#access-to-the-app).

There's no "active apps": a member is signed in on browsers (sessions), and has access to apps.

**Add member** (`/members/create`) adds an **active** member who can sign in right away, in every environment. With an identity provider connected, the admin chooses how they sign in: with the provider, and then no password is stored, or with a password the admin chooses (8 to 32 characters). Without a provider it is always a password. Emails are unique within the organization (`app/validators/member.ts`).

The member's page shows how they sign in, with a control to switch it, when a provider is connected.

Inviting members, so they choose their own password, is not built yet.
