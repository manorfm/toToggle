#!/usr/bin/env sh
set -eu

# Single source of truth for "what's the latest released version of each component" — regenerates
# website/releases.json (read by website/index.html to render the landing page's release badges
# and install snippets) and patches every hardcoded version-pin example in the docs that mirrors
# it. Idempotent: safe to run any time, re-run, or run when nothing changed (writes the same
# content back). Invoked from two places, both required to actually stay in sync — the second is
# what was missing before this fix:
#   1. .githooks/pre-commit — covers file-based versions (java/node) at the moment their version
#      file is bumped in a normal commit.
#   2. .github/workflows/totoggle-*-release.yml, after a tag is pushed and the release succeeds —
#      covers tag-based versions (server/go), which only change at tag-push time, never at a
#      regular commit, so the pre-commit hook alone can never observe them.

# Portable in-place sed: BSD sed (macOS, used by contributors running this locally) requires an
# explicit (even if empty) backup suffix after -i; GNU sed (Linux, used by CI) treats a bare -i
# followed by no backup file as the script itself if given `-i ''`. `-i.bak` + cleanup works
# identically on both.
sed_inplace() {
  pattern="$1"
  file="$2"
  sed -E -i.bak "$pattern" "$file"
  rm -f "$file.bak"
}

latest_tag() {
  git tag --merged HEAD --list "$1/v[0-9]*" --sort=-v:refname | head -n 1
}

version_from_tag() {
  tag="$1"
  if [ -n "$tag" ]; then
    printf '%s' "${tag##*/v}"
  fi
}

# Renders a component's version as a JSON value: the quoted version string, or the bare `null`
# literal when there's no release yet. Used for every field — a naive `"%s"` would wrongly wrap
# `null` in quotes (a JSON string "null", not the JSON null value), and a naive bare `%s` would
# emit an unquoted version number, which isn't valid JSON at all once it's a real X.Y.Z (two dots
# make it invalid even as a JSON number) — exactly the bug this replaced.
json_version() {
  if [ -n "$1" ]; then
    printf '"%s"' "$1"
  else
    printf 'null'
  fi
}

server_version="$(version_from_tag "$(latest_tag server)")"
java_version="$(sed -nE 's/^version = "([^"]+)"/\1/p' totoggle_java/build.gradle.kts)"
node_version="$(node -p 'require("./totoggle_node/package.json").version')"
go_version="$(version_from_tag "$(latest_tag totoggle_go)")"

printf '{\n  "server": %s,\n  "java": %s,\n  "node": %s,\n  "go": %s\n}\n' \
  "$(json_version "$server_version")" "$(json_version "$java_version")" \
  "$(json_version "$node_version")" "$(json_version "$go_version")" > website/releases.json

semver='[0-9]+\.[0-9]+\.[0-9]+'

# Every hardcoded doc example that mirrors a released version, kept in lockstep here instead of
# drifting until someone notices. Each pattern anchors on a fixed, unambiguous prefix (the
# artifact coordinate) so it only ever touches its own version number, never an unrelated one
# that happens to look like X.Y.Z elsewhere in the same file.
sed_inplace "s/(totoggle_java-)$semver(\.jar)/\1$java_version\2/g" README.md
sed_inplace "s/(totoggle_java:)$semver/\1$java_version/g" README.md
sed_inplace "s#(totoggle_java/)$semver(/)#\1$java_version\2#g" README.md
sed_inplace "s/(totoggle_java:)$semver/\1$java_version/g" totoggle_java/README.md

sed_inplace "s/(totoggle-node@)$semver/\1$node_version/g" README.md

if [ -n "$server_version" ]; then
  sed_inplace "s/(totoggle:)$semver/\1$server_version/g" server/README.md
fi

# The landing page's own inline fallback (shown only if fetching releases.json itself fails, e.g.
# JS disabled or offline — website/index.html reads the file as its normal, single source of
# truth otherwise; see the script comment there).
if [ -n "$server_version" ]; then
  sed_inplace "s/(data-version=\"server\">)$semver(<)/\1$server_version\2/" website/index.html
fi
if [ -n "$java_version" ]; then
  sed_inplace "s/(data-version=\"java\">)$semver(<)/\1$java_version\2/" website/index.html
fi
if [ -n "$node_version" ]; then
  sed_inplace "s/(data-version=\"node\">)$semver(<)/\1$node_version\2/" website/index.html
fi
if [ -n "$go_version" ]; then
  sed_inplace "s#(data-version-label=\"go\">)[^<]+(<)#\1v$go_version\2#" website/index.html
fi
