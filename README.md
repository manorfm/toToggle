<div align="center">
  <img src="website/favicon.svg" width="64" height="64" alt="" />

  # toToggle

  *A self-hosted feature flag platform: a Go server with a role-based admin UI, plus official client libraries for Kotlin/Java, Go, and Node/TypeScript*

  [![server-go](https://github.com/manorfm/toToggle/actions/workflows/server-go.yml/badge.svg)](https://github.com/manorfm/toToggle/actions/workflows/server-go.yml)
  [![frontend-web](https://github.com/manorfm/toToggle/actions/workflows/frontend-web.yml/badge.svg)](https://github.com/manorfm/toToggle/actions/workflows/frontend-web.yml)
  [![e2e](https://github.com/manorfm/toToggle/actions/workflows/e2e.yml/badge.svg)](https://github.com/manorfm/toToggle/actions/workflows/e2e.yml)
  [![security](https://github.com/manorfm/toToggle/actions/workflows/security.yml/badge.svg)](https://github.com/manorfm/toToggle/actions/workflows/security.yml)
  [![totoggle-java](https://github.com/manorfm/toToggle/actions/workflows/totoggle-java.yml/badge.svg)](https://github.com/manorfm/toToggle/actions/workflows/totoggle-java.yml)
  [![totoggle-go](https://github.com/manorfm/toToggle/actions/workflows/totoggle-go.yml/badge.svg)](https://github.com/manorfm/toToggle/actions/workflows/totoggle-go.yml)
  [![totoggle-node](https://github.com/manorfm/toToggle/actions/workflows/totoggle-node.yml/badge.svg)](https://github.com/manorfm/toToggle/actions/workflows/totoggle-node.yml)
  <br>
  [![Server version](https://img.shields.io/docker/v/manorfm/totoggle?sort=semver&label=server)](https://hub.docker.com/r/manorfm/totoggle/tags)
  [![Java version](https://img.shields.io/maven-central/v/io.github.manorfm/totoggle_java?label=java)](https://central.sonatype.com/artifact/io.github.manorfm/totoggle_java)
  [![Node version](https://img.shields.io/npm/v/totoggle-node?label=node)](https://www.npmjs.com/package/totoggle-node)
  [![Go module](https://img.shields.io/badge/go-module-00ADD8?logo=go)](https://pkg.go.dev/github.com/manorfm/toToggle/totoggle_go)
  [![License](https://img.shields.io/badge/license-ToToggle%201.0-blue)](LICENSE)

  [Overview](#overview) • [Architecture](#architecture) • [Quick start](#quick-start) • [Key features](#key-features) • [Configuration](#configuration) • [Testing](#testing) • [Resources](#resources)
</div>

toToggle manages feature flags with hierarchical toggles (`service.feature.flag`), team-based
access control, and an optional approval workflow for sensitive changes. Three official client
libraries fetch and cache toggles locally and evaluate them against 7 activation rule types, with
cascading validation matching the server's semantics.

See **[the project landing page](https://manorfm.github.io/toToggle/)** for a hosted overview of
all 3 SDKs.

## Overview

**Server**

- **Hierarchical toggles** with cascading validation — a disabled parent disables every
  descendant, regardless of the child's own state.
- **7 activation rule types**: percentage rollout (consistent per-key hashing), named context
  parameter, user ID, IP/CIDR, country, time window, and cohort (presence-based).
- **Role-based access control** (`root`/`admin`/`user`), with teams scoping which applications an
  admin can manage.
- **Optional approval workflow**: gate selected mutation types behind a propose → approve →
  execute flow, with a full audit trail.
- **Public secret-key API** (`GET /api/toggles`, `X-API-Key` header) for external
  services/client libraries — no session or cookie involved.
- **Production-ready by default**: structured JSON logging, optional TLS, a Jenkins-style
  initial-root-password flow (file-only, never stdout/logs), self-applying database migrations
  embedded in the binary.

**Client libraries** (all 3 share the same cascading-validation semantics — see each one's own
README for the language-idiomatic API):

- Fetch and cache toggles locally — evaluation never blocks on the network.
- Evaluate all 7 activation rule types.
- Background refresh with configurable interval, and offline mode (keep serving cached data if
  the server becomes unreachable).
- Observability hooks (refresh success/failure, evaluation events) and health/staleness getters.

## Architecture

```
toToggle/
├── server/           # Go server: REST API + role-based admin UI (React/Vite), same-origin,
│                      # single SQLite-backed binary — see server/README.md
├── totoggle_java/     # Kotlin/Java client library (Gradle)
├── totoggle_go/       # Go client library (go get github.com/manorfm/toToggle/totoggle_go)
├── totoggle_node/     # Node.js/TypeScript client library (npm)
├── stress-tests/      # Gatling/Kotlin load tests against the server's public toggle API
├── website/           # Static landing page (GitHub Pages)
└── docs/
    └── rest-flow.md   # Full REST API contract — source of truth for any integration
```

The server is a single Go binary: it serves both the REST API and the built admin frontend from
the same origin — no separate frontend process, no CORS needed for the browser UI (see
[Security](#security)). Each client library is fully independent — own module, own tests, own CI
workflow — and only talks to the server over the public secret-key API.

## Quick start

### Prerequisites

- **Server**: Go 1.23+
- **Kotlin/Java client**: Java 17+ or Kotlin 1.9+, Gradle 8.7+
- **Go client**: Go 1.23+
- **Node/TypeScript client**: Node.js 20+

### Run the server

```bash
cd server
go run main.go
```

The binary applies its own database migrations at startup — nothing to install separately, even
inside the production Docker image. It starts on `http://localhost:3056` by default (override
with `SERVER_PORT`).

> [!NOTE]
> On first boot, a `root` user is created with a random password written to
> `<directory of DB_PATH>/initial-root-password.txt` (owner-only readable, never logged to
> stdout). That file is deleted automatically once the forced first-login password change
> completes — see
> [totoggle_java/README.md](totoggle_java/README.md#first-boot-getting-the-initial-root-password)
> for the full flow.

### Add a client library

```kotlin
// build.gradle.kts
dependencies {
    implementation(files("path/to/totoggle_java/build/libs/totoggle_java-2.0.0.jar"))
}
```

```kotlin
import com.totoggle.client.ToToggleClient
import com.totoggle.client.config.ToToggleConfig

val config = ToToggleConfig.builder()
    .applicationName("my-awesome-app")
    .serverUrl("http://localhost:3056")
    .secretKey("sk_your_secret_key_here")
    .refreshInterval(Duration.ofMinutes(5))
    .enableOfflineMode(true)
    .build()

val client = ToToggleClient(config)
client.start()

val isPaymentsEnabled = client.isActive("user.payments")
val isTableViewEnabled = client.isActive("user.payments.view-table")

client.shutdown()
```

Go and Node/TypeScript are equally complete (same cascading-validation semantics, all 7 rule
types, offline mode, observability hooks) — see each one's own README for a full example:

- **Go**: [`totoggle_go/README.md`](totoggle_go/README.md) —
  `go get github.com/manorfm/toToggle/totoggle_go`
- **Node/TypeScript**: [`totoggle_node/README.md`](totoggle_node/README.md) —
  `npm install totoggle-node`

## Key features

### Cascading validation

All parent segments of a toggle path must be active for a child to be effectively active:

```
user                    ← must be active
└── payments            ← must be active
    └── view-table      ← target feature
```

If `user` or `payments` is disabled, `view-table` is automatically inactive — its own `enabled`
bit is irrelevant.

### Activation rule types

**Percentage** — activates for ~N% of requests, using consistent per-key hashing:

```json
{ "type": "percentage", "value": "25" }
```

**Parameter** — activates when a named context value matches one of the configured values:

```json
{
  "type": "parameter",
  "value": "premium,enterprise",
  "config": { "context_key": "attributes.plan" }
}
```

**Cohort** — a presence check, not a match against a named list: activates whenever the app
supplies any non-empty `cohort` context value.

```json
{ "type": "cohort", "value": "", "config": { "context_key": "cohort" } }
```

The remaining 4 types (`user_id`, `ip`, `country`, `time`) follow the same
`{type, value, config}` shape — see [`docs/rest-flow.md`](docs/rest-flow.md) for every field.

> [!NOTE]
> Rules are evaluated by the SDKs, not by the server. A hierarchical ancestor contributes only
> its `enabled` state to a child query — its own rule never affects a descendant. A missing
> context field or resolver failure evaluates to `false`; `isActive` always fails closed and
> never throws.

### Resilience & performance

- **Local caching** — evaluation never touches the network; every client reads from its own
  in-memory cache.
- **Offline mode** — keeps serving the last successfully fetched data if the server becomes
  unreachable, instead of failing closed.
- **Background refresh** on a configurable interval, without blocking callers.
- **Thread-safe** in all 3 client libraries.

### Security

- **Session auth (admin UI)**: opaque, server-side-validated session tokens in an `HttpOnly`,
  `SameSite=Strict` cookie — no `Authorization` header alternative, and no CORS configuration:
  `SameSite=Strict` already blocks cross-site use, and the admin UI is served same-origin by this
  same binary.
- **Public API auth**: a `sk_`-prefixed, 256-bit `crypto/rand` secret key, stored only as its
  SHA-256 hash — never plaintext. Regenerating a key rotates it (the prior one stops working,
  not additive).
- **Login rate limiting** on `POST /api/auth/login`, in-memory sliding window per IP.
- **TLS** is optional and terminated directly in the binary (`TLS_CERT_FILE`/`TLS_KEY_FILE`) — a
  half-configured pair fails the boot loudly instead of silently falling back to plain HTTP.

## Configuration

The client libraries are configured purely programmatically (via `ToToggleConfig.builder()` /
each language's equivalent — there's no env var reading built in). The server reads:

```bash
SERVER_PORT=3056           # default
DB_PATH=./db/toggles.db    # default
COOKIE_SECURE=true         # default; only set to false for local HTTP-only dev
TLS_CERT_FILE=/etc/totoggle/tls/cert.pem  # optional — set both to terminate HTTPS in the binary
TLS_KEY_FILE=/etc/totoggle/tls/key.pem
```

## Testing

```bash
cd server && go test ./...              # Go server
cd totoggle_java && ./gradlew test      # Kotlin/Java client
cd totoggle_go && go test ./...         # Go client
cd totoggle_node && npm test            # Node/TypeScript client
```

Each CI badge above reflects its component's current, real test status — no test count is
hardcoded here, since it goes stale the moment any suite grows.

## Publishing status

All 3 client libraries ship from this monorepo with their own CI (test-on-push) and a release
pipeline that triggers automatically on a version tag
(`totoggle_go/vX.Y.Z`/`totoggle_java/vX.Y.Z`/`totoggle_node/vX.Y.Z`):

| Library | Registry | Install |
|---|---|---|
| Go | resolves off the `totoggle_go/v*` tag directly, no registry | `go get github.com/manorfm/toToggle/totoggle_go` |
| Java/Kotlin | [Maven Central](https://repo1.maven.org/maven2/io/github/manorfm/totoggle_java/) | `io.github.manorfm:totoggle_java:2.0.0` |
| Node/TypeScript | [npm](https://www.npmjs.com/package/totoggle-node) | `totoggle-node@1.0.0` |

## Resources

- **API contract**: [`docs/rest-flow.md`](docs/rest-flow.md) — treat it as the source of truth
  when integrating with the REST API.
- **Contributing**: [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to propose a change, and how to
  run each component's test suite.
- **Documentation**: [Wiki](https://github.com/manorfm/toToggle/wiki)
- **Issues**: [GitHub Issues](https://github.com/manorfm/toToggle/issues)
- **Discussions**: [GitHub Discussions](https://github.com/manorfm/toToggle/discussions)

---

<div align="center">

Built by [Manoel Medeiros](https://github.com/manorfm)

</div>
