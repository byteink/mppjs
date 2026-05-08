# @byteink/mppjs

Convert Microsoft Project (`.mpp`) files to MSPDI XML from Node, Bun, or Deno.
Native binary, **no JVM required at runtime**.

```bash
npx @byteink/mppjs project.mpp                  # → project.xml
npx @byteink/mppjs project.mpp out/result.xml
```

```ts
import { convert } from "@byteink/mppjs";

const { outputPath } = await convert("project.mpp", "out.xml");
```

## Why

The standard tool for parsing `.mpp` is [MPXJ](https://www.mpxj.org/) (Java).
`@byteink/mppjs` ships MPXJ as a GraalVM-AOT-compiled native binary, so you
get the parser without Docker, without a JVM, without `jpype`/IKVM, and
without a multi-second cold start.

## Install

```bash
npm install @byteink/mppjs   # or pnpm add / yarn add / bun add
```

The native binary for your platform is delivered via an `optionalDependencies`
sidecar (`@byteink/mppjs-<platform>-<arch>`). Supported targets:

| Platform      | Sidecar package                  |
| ------------- | -------------------------------- |
| macOS arm64   | `@byteink/mppjs-darwin-arm64`    |
| Linux x64     | `@byteink/mppjs-linux-x64`       |
| Linux arm64   | `@byteink/mppjs-linux-arm64`     |
| Windows x64   | `@byteink/mppjs-win32-x64`       |

If your platform isn't listed, [open an issue](https://github.com/byteink/mppjs/issues).

## API

```ts
import { convert, type ConvertOptions, type ConvertResult } from "@byteink/mppjs";

await convert(input: string, output?: string, options?: ConvertOptions): Promise<ConvertResult>
```

- `input` — path to `.mpp`, `.mpx`, or any [format MPXJ understands](https://www.mpxj.org/supported-formats.html)
- `output` — path for the MSPDI XML; defaults to `<input-without-ext>.xml`
- `options.binaryPath` — override the bundled binary path (also via `MPPJS_BINARY` env var)
- `options.timeoutMs` — kill the spawned process after this many ms (default `60_000`)

## CLI

```
Usage: mppjs <input> [output.xml]
```

Exit codes: `0` ok, `1` conversion failure, `2` usage/IO error.

## Building from source

Requires **Liberica NIK 23.1.x** (or any GraalVM JDK 21 distribution including
`native-image`) and **Maven 3.9+**.

```bash
git clone https://github.com/byteink/mppjs
cd mppjs
npm install
npm run build              # jar → native binary → tsc
npm test                   # via bun, against MPXJ sample files
```

The native-image build takes 5–8 minutes on a modern laptop.

See [CLAUDE.md](./CLAUDE.md) for architecture details, including how the
reflection metadata under `.ni-config/` is regenerated when MPXJ is upgraded.

## License

- The TypeScript wrapper (this package) is **MIT**.
- The platform-specific binaries shipped via `@byteink/mppjs-<platform>` sidecars
  contain MPXJ and are **LGPL-2.1-or-later**. Each sidecar package includes
  the LGPL text and a `NOTICE` pointing to the upstream source.

The wrapper invokes the binary as a subprocess; LGPL obligations are
contained to the sidecar packages.
