# multi-tour-identity-audit-portal

## What it is

The React 19 remote of the identity and audit domain (macrodomain 1). The container (`multi-tour-front`) loads it
and calls `mount(element, props)` (ADR-007); the portal owns no HTTP client, no session and no gateway address: it
uses the `apiClient` and the `session` the container hands it, and asks for relative paths such as
`/api/v1/security/public/tenants/{identifier}/sessions`. It runs in its own container (`deploy/`), behind the
gateway, so stopping it only takes this area down.

## What it shows

The access mark of the session decides the screen. It fails closed: an unknown mark is treated as restricted.

| Screen | Who | Service behind it |
|---|---|---|
| Sign-in | Anyone, at the link of a company or at the platform | `multi-tour-security` (HU-SEC-001) |
| Sign-up of a Final Customer | Anyone, at the link of a company | `multi-tour-security` (HU-SEC-002) |
| First password | A person with a temporary credential | `multi-tour-security` |
| Restricted notice | The Administrator of an inactive company | `multi-tour-security` |
| Customer home and "Mi perfil" | Final Customer | The session (the profile shows the role; name, e-mail and phone read "No registrado" because the token does not carry them) |
| Staff home, team and permissions | Internal users | Screens on test data; the service does not serve them yet (HU-SEC-005, HU-SEC-006) |
| Platform panel: tenants, detail, create, audit | Platform Administrator | `multi-tour-identity-audit-api` for the tenants (HU-IDA-001); the audit view shows test data (HU-IDA-002) |

Test data is labelled "Datos de prueba" and is left out of the production build
(`B·test_data_is_not_in_the_production_build`).

## The routes

The routes belong to the container (`multi-tour-front`), not to this repository; this is what it serves and what the
portal does with each one:

| Route | What happens |
|---|---|
| `/t/{identifier}/ingresar` | Sign-in of that company; a signed-in person goes to their own screen |
| `/t/{identifier}` | Public home of the company (the container); the portal takes over after sign-in |
| `/t/{identifier}/recuperar` | Notice of the password recovery (visual; HU-SEC-004 is not built) |
| `/platform` | Sign-in of the Platform Administrator, with no company; after it, the platform panel |
| `/ingresar` and `/sign-in` | Aliases that lead to the sign-in of the company link |
| `/areas/{remote}` | The other portals (protected by the container) |

The sign-in lives only under the company link: there is no company field anywhere (RN-CAL-IDN-01).

## How to start it

Node 22.12 or later:

```bash
npm ci
npm run build    # tsc --noEmit and vite build
```

To see it with the whole platform, use the root composition of `multi-tour-infra-postgres`
(`scripts/up.sh dev --demo`, or `qa`), and open `http://localhost:8080/t/travesia-natural/ingresar` (the gateway).

## Where the data is

Nowhere: this repository holds no data and no copy of a person. Everything comes from the container's client.

## How to test it

```bash
npm test     # Vitest with Testing Library and jsdom
npm run build
```

There is no Playwright here (decision of 2026-10-23): the render test of each view proves that it loads, and the
end-to-end criterion of a story is checked on the root composition. The portal holds no `fetch(` call and no address
today (`grep` over `src/`), but no test enforces it yet: `B·built_files_have_no_client_token_or_gateway_url`, cited by the
specs, is still to be written (declared debt, norm §5.4.1).

The CI runs `npm ci`, `npm run build` and `npm test` on every pull request to `develop` and `qa`. While GitHub Actions is
locked for billing (since 2026-10-14), run the same three commands locally and put their result in the pull request.

## What is missing

- The service behind the staff screens: internal users, permissions and optional roles (HU-SEC-005, HU-SEC-006).
- The audit consultation (HU-IDA-002), so the audit view stops showing test data.
- Inactivating and reactivating a tenant from the panel sends nothing yet (HU-IDA-001).
- Password recovery and the verification of the e-mail (HU-SEC-004, HU-SEC-003).
