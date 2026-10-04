# Getting started

## Requirements

- Node.js 24 or later
- Docker, for PostgreSQL

## Run it

```sh
docker compose up -d        # PostgreSQL 17 on port 5433
npm install
node ace migration:run
npm run dev                 # http://localhost:3333
```

Open `/signup` to create an organization. Signing up redirects you to its console at `/w/<org>/overview`.

The database runs on port **5433**, so it never clashes with a PostgreSQL already running on 5432. On first start, Docker creates two databases: `control_plane` for development and `control_plane_test` for tests (`docker/postgres/create_test_database.sql`).

## Running on HTTPS domains with portless

Issuers live on subdomains (`acme.<host>`), and `*.localhost` resolves without setup, so `npm run dev` works as is. To run on HTTPS like production, use [portless](https://portless.sh) with wildcard routing:

```sh
npx portless proxy start --wildcard -p 1355      # once; the proxy keeps running
APP_URL=https://controlplane.localhost:1355 npx portless controlplane npm run dev
```

- Console: `https://controlplane.localhost:1355`
- Acme production's issuer: `https://acme.controlplane.localhost:1355/oauth`
- Acme staging's issuer: `https://acme--staging.controlplane.localhost:1355/oauth`

`APP_URL` must match the address you open, because issuer URLs are built from it. `portless` ends TLS and forwards `X-Forwarded-*` headers from loopback, which AdonisJS trusts by default.

## Tests

```sh
npm test                                          # every suite
node ace test --files tests/functional/oidc/issuers.spec.ts
```

| Suite        | Folder             | What it covers                      |
| ------------ | ------------------ | ----------------------------------- |
| `functional` | `tests/functional` | HTTP endpoints and database rules   |
| `browser`    | `tests/browser`    | Console pages, driven by Playwright |

Tests use `.env.test`: a separate database and in-memory sessions. Migrations run once before the suite. Each group truncates tables before every test.

`setupOnboardedOrganization()` in `tests/helpers/organizations.ts` signs up an organization, with its user and three environments, through the real signup code.

## Checks

```sh
npm run typecheck
npm run lint
```

Run `node ace codegen` first if you changed routes, controllers or pages. It regenerates the route and page types in `.adonisjs/`.

## Changing the schema

1. Add or edit a migration in `database/migrations/`.
2. Run `node ace migration:run`. This also regenerates `database/schema.ts`.
3. Never edit `database/schema.ts` by hand. To change a generated column type, add a rule in `database/schema_rules.ts`.
