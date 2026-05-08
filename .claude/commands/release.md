---
description: Cut a new mppjs release — bump versions, tag, push (CI publishes)
argument-hint: <version> (e.g. 0.1.1)
---

You are cutting an `mppjs` release. Actual building and publishing happens in
[.github/workflows/release.yml](.github/workflows/release.yml) when the tag is
pushed — your job is the local prep and the tag push, nothing more.

Target version: `$ARGUMENTS` (must be SemVer, no `v` prefix).

## Preconditions — verify all before touching anything

Run these checks in parallel. If any fails, stop and report; do not proceed.

1. `git rev-parse --is-inside-work-tree` — repo must exist. If not, tell the user to `git init`, add a `byteink/mppjs` remote, and commit the current tree first.
2. `git status --porcelain` — working tree must be clean.
3. `git rev-parse --abbrev-ref HEAD` — must be `main` (or confirm with the user if on another branch).
4. `git fetch --tags && git tag -l "v$ARGUMENTS"` — tag must not already exist.
5. `node -p "require('./package.json').version"` — current version must be lower than `$ARGUMENTS` (use semver order, not string compare).
6. Confirm the version bump is intentional: read the commits since the last tag (`git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline`) and pick the right bump (patch/minor/major) per SemVer. If `$ARGUMENTS` disagrees, flag it and ask before proceeding.

## Bump versions

Use `npm pkg set` so JSON formatting is preserved. Sync all six package.jsons and the optionalDependencies:

```bash
VERSION="$ARGUMENTS"
npm pkg set version="$VERSION"
for t in darwin-arm64 linux-arm64 linux-x64 win32-x64; do
  (cd "packages/$t" && npm pkg set version="$VERSION")
  npm pkg set "optionalDependencies.@byteink/mppjs-$t=$VERSION"
done
```

Then refresh the lockfile so it matches:

```bash
npm install --ignore-scripts
```

## Sanity check

Run `npm pack --dry-run` from the root and verify the output reports
`name: mppjs` and `version: $ARGUMENTS`. Do **not** publish locally — CI does
that with provenance.

## Commit, tag, push

One commit, one tag, push both. Use a HEREDOC for the commit message.

```bash
git add package.json package-lock.json packages/*/package.json
git commit -m "chore: release v$ARGUMENTS"
git tag -a "v$ARGUMENTS" -m "v$ARGUMENTS"
git push origin main
git push origin "v$ARGUMENTS"
```

The tag push triggers [release.yml](.github/workflows/release.yml): matrix
build on 5 runners → upload sidecar artifacts → publish each
`@byteink/mppjs-<platform>` then the unscoped `mppjs`, all with `--access
public --provenance`.

## After pushing

Report the tag URL and the Actions run URL so the user can watch it. Do not
poll. Remind them once that:

- The `@byteink` scope must exist on npm under the account that owns
  `NPM_TOKEN`, or sidecar publishes will 403.
- If a single platform build fails, the publish job won't run — fix and
  re-tag with a patch bump (`v$ARGUMENTS` is now burned even if nothing
  shipped).

## TLDR at the end

Two bullets max: version bumped, tag pushed.
