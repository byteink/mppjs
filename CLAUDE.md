# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A `.mpp` → MSPDI XML converter that ships as a single native binary (no JVM at runtime) wrapped by a small TypeScript module. The actual parsing is done by [MPXJ](https://www.mpxj.org/) (Java, LGPL 2.1), AOT-compiled via GraalVM `native-image`. The TS layer spawns the binary as a subprocess — this isolation is intentional, both for keeping LGPL out of consumer code and for keeping JVM concerns out of the TS API.

The legacy [Dockerfile](Dockerfile) and [convert.sh](convert.sh) are the previous setup (Python+JPype+JVM in a container) and are pending deletion once the new flow is fully adopted.

## Architecture (3 stages, one direction)

1. **Java entry** — [java/src/main/java/org/msproject2xml/Convert.java](java/src/main/java/org/msproject2xml/Convert.java)
   - Single class with `main()`. Uses `UniversalProjectReader` (auto-detects format) + `MSPDIWriter`. Exit codes: 0 ok, 1 conversion failed, 2 usage/IO error.
   - [java/pom.xml](java/pom.xml) excludes MPXJ's optional reader deps (sqlite-jdbc, jackcess, jackson, jsoup, jgoodies-binding) — we only need MPP read + MSPDI write. **Re-adding these will break the native-image build** unless their reflection/feature configs are also added.

2. **Native binary** — `bin/mpxj-convert`
   - Built by `native-image` from the shaded jar. Reflection metadata captured under [.ni-config/](.ni-config/) by running the JVM jar with the tracing agent against sample MPP files.
   - **`-H:+AddAllCharsets` is required** — POI uses CP1252 for legacy MPP encoding; without this flag every conversion fails with `UnsupportedCharsetException`.

3. **TS wrapper** — [src/index.ts](src/index.ts), [src/cli.ts](src/cli.ts)
   - `convert(input, output?)` spawns `bin/mpxj-convert`, captures stderr, returns the output path. Zero runtime deps (`node:child_process` only). Works under Node, Bun, Deno.
   - Binary lookup walks `dist/../bin/` and `src/../bin/` so it resolves both from compiled `dist/` and from `src/` during tests.

## Toolchain

GraalVM is **not** installed system-wide. Liberica NIK 23.1.11 (JDK 21 LTS, GPL+CE — license-clean for commercial) lives at `~/.local/bellsoft-liberica-vm-core-openjdk21-23.1.11`. Every shell that builds Java/native must have:

```bash
export JAVA_HOME=~/.local/bellsoft-liberica-vm-core-openjdk21-23.1.11/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
```

Maven is from Homebrew. Bun is required for `npm test` (the test file uses TS imports directly).

## Commands

```bash
# Full build chain (Java → jar → native binary → TS):
npm run build

# Individual stages:
npm run build:jar      # Maven shade — outputs java/target/mpxj-convert.jar
npm run build:native   # native-image — outputs bin/mpxj-convert (~85MB, ~6 min on M-series)
npm run build:ts       # tsc — outputs dist/

# Run tests (5 samples covering MPP8/9/12/14):
npm test
# Single sample: bun test test/convert.test.ts -t "MPP9"

# Direct binary use:
./bin/mpxj-convert path/to/file.mpp [output.xml]

# Programmatic:
bun run src/cli.ts path/to/file.mpp
```

## When MPXJ version changes

The `.ni-config/` reflection metadata is captured per MPXJ version. After bumping `<version>` in [java/pom.xml](java/pom.xml):

```bash
rm -rf .ni-config && mkdir .ni-config
# Re-run the agent against representative samples (MPP8/9/12/14):
for f in /tmp/mpxj/junit/data/{DurationTest8,DurationTest9,mpp12assignmentcustom,ResourceIdAndUniqueId-project2010-mpp14,ResourceIdAndUniqueId-project2013-mpp14}.mpp; do
  java -agentlib:native-image-agent=config-merge-dir=.ni-config -jar java/target/mpxj-convert.jar "$f" /tmp/$(basename $f .mpp).xml
done
npm run build:native
```

Test samples live under `/tmp/mpxj/junit/data/` from `git clone https://github.com/joniles/mpxj /tmp/mpxj`.

## Distribution

Multi-platform sidecar pattern (esbuild/swc-style):

- Main package **`@byteink/mpxjs`** — pure TS, MIT, OS-agnostic. (The unscoped name `mpxjs` was rejected by the npm registry as too similar to `rxjs`.) Declares each `@byteink/mpxjs-<platform>` as an `optionalDependency` with `os`/`cpu` constraints, so package managers install only the matching one.
- Per-platform sidecars under [packages/](packages/) — `@byteink/mpxjs-{darwin-arm64,linux-arm64,linux-x64,win32-x64}`, each LGPL-2.1-or-later (because they ship a binary derived from MPXJ). Intel-mac (darwin-x64) was dropped because GitHub's free `macos-13` runner pool is unusable.
- [packages/_assets/](packages/_assets/) — shared `LICENSE` (LGPL 2.1 text), `NOTICE`, `README.md` template. CI copies these into each sidecar at publish time so the repo doesn't carry 5 duplicates.
- Binary lookup chain in [src/platform.ts](src/platform.ts): `MPXJS_BINARY` env / option override → installed `@byteink/mpxjs-<platform>` sidecar via `require.resolve` → local `bin/` (development).

## Release workflow

Tag `vX.Y.Z` → [.github/workflows/release.yml](.github/workflows/release.yml) fans out:

1. Matrix build on `macos-14`, `ubuntu-24.04`, `ubuntu-24.04-arm`, `windows-2022` — each runs `mvn package` + `native-image`, stages the sidecar (binary + LICENSE + NOTICE + README), uploads as artifact.
2. Linux publish job downloads artifacts, syncs version across all `package.json` files (root + 5 sidecars), compiles TS, then `npm publish` each sidecar followed by the main package — all with `--access public --provenance`.

Required secret: `NPM_TOKEN` (npm automation token with publish rights to the `@byteink` scope).

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on PRs/main: builds + tests on `linux-x64` only — the matrix is reserved for releases to keep CI fast.
