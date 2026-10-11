# multi-tour-identity-audit-portal

## What it is

The React 19 remote with the screens of the identity and audit domain (tenants and their lifecycle).
The container (`multi-tour-front`) calls `mount(element, { apiClient, session })`; the portal owns no HTTP
client, no session and no gateway address. Today it renders a placeholder and builds and tests in the CI.

## How to start it

Node 22.12 or later:

```bash
npm ci
npm run build
```

## Where the data is

Nowhere: this repository holds no data. It asks the container's client for relative paths such as
`/api/v1/identity-audit/tenants`.

## How to test it

```bash
npm test     # Vitest with Testing Library and jsdom
npm run build
```

The CI runs `npm ci`, `npm run build` and `npm test` on every pull request to `develop` and `qa`.

## What is missing

Every screen: the tenant list, the registration form, the tenant detail and the status change. The
`ApiClient` and `Session` types are a local stub until the container publishes its contract. The check that
the built files contain no client, token or gateway address, and the light end-to-end tests, come with the
next tasks of the piece.
