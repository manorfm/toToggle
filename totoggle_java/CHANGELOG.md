# Changelog

All notable changes to `totoggle_java` are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [2.0.0] — Breaking: `parameter` rename and `cohort` semantics change

The ToToggle server (v2.6.4) renamed the `attribute` activation rule type to `parameter` (the
wire value itself, not just a label) and changed `cohort` from a comma-separated list match to a
presence check. Both changes are breaking for anyone consuming this library's public API
directly.

### Changed
- **Breaking**: `AttributeStrategy` renamed to `ParameterStrategy`; `ActivationRule.TYPE_ATTRIBUTE`
  renamed to `ActivationRule.TYPE_PARAMETER` (value changed from `"attribute"` to `"parameter"`).
  A toggle still using the old `"attribute"` type string is no longer recognized — the server
  itself migrated every stored rule to `"parameter"` on upgrade, so this only matters for a
  client pinned to a pre-2.6.4 server or for code that referenced the old constant directly.
- **Breaking**: `CohortStrategy.evaluate(rule, contextValue)` no longer compares `rule.value`
  against a comma-separated list — it now activates whenever the resolved `cohort` context value
  is present and non-blank, regardless of content. `rule.value` is not read for this type
  anymore (a rule saved before this change may still carry a legacy value like `"canary,beta"`;
  it stays inert, never consulted).
- `ActivationRule.isValid()` now treats a `cohort` rule with a blank `value` as valid (every other
  rule type still requires a non-blank value).

### Migration
- Replace any reference to `ActivationRule.TYPE_ATTRIBUTE`/`AttributeStrategy` with
  `TYPE_PARAMETER`/`ParameterStrategy`.
- If you relied on `cohort` matching a specific named value, that comparison must move into your
  own application logic (e.g., only send a `cohort` context value for requests that should
  qualify) — the SDK no longer performs the comparison.

## [1.0.0] — Initial public release

First tagged release, published after a full development cycle (25 commits touching this
package — see `git log -- totoggle_java` for the exact history), including bug fixes found by
validating the client against the real running server. Reflects a stable, tested public API
considered ready for external consumers.

### Added
- Kotlin/Java client (`ToToggleClient`, `ToToggleConfig.builder()`) that fetches and caches an
  application's toggle catalog from the ToToggle server via a secret key, evaluating `isActive`
  entirely from the local cache.
- All 7 activation rule types (percentage, attribute, user_id, ip, country, time, cohort), with
  cascading ancestor validation matching the server's semantics.
- Secure network context extraction with trusted `Forwarded` header coverage, and request-local
  HTTP middleware adapters.
- Background refresh, offline mode, staleness-aware health checks, and a metrics listener hook.
- Cross-SDK contract and end-to-end test coverage shared with the Go and Node clients.

### Changed
- Replaced the obsolete parameter strategy with `AttributeStrategy` and standardized canonical
  activation terminology across all 3 client libraries.
- Completed context-key evaluation and replaced the `Canary` rule concept with `Cohort`.
- Migrated to an isolated, canonical per-request context shared across SDK adapters.

### Fixed
- Corrected the client against the real public API and rule semantics (found by testing against
  a live server rather than only fixtures).
- Threaded the `isActive()` parameter through ancestor rule evaluation correctly.
- Fail-closed country context resolution when no trusted source is configured.
- Context evaluation, synchronization safety, and IPv6 handling hardened for production use.
