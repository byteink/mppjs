import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLATFORM_KEYS: Record<string, string> = {
  "darwin-arm64": "@byteink/mpxjs-darwin-arm64",
  "linux-arm64": "@byteink/mpxjs-linux-arm64",
  "linux-x64": "@byteink/mpxjs-linux-x64",
  "win32-x64": "@byteink/mpxjs-win32-x64",
};

function currentPlatformKey(): string {
  return `${process.platform}-${process.arch}`;
}

function binaryName(): string {
  return process.platform === "win32" ? "mpxj-convert.exe" : "mpxj-convert";
}

function resolveSidecar(): string | null {
  const key = currentPlatformKey();
  const pkg = PLATFORM_KEYS[key];
  if (!pkg) return null;

  const require = createRequire(import.meta.url);
  try {
    const pkgJsonPath = require.resolve(`${pkg}/package.json`);
    const candidate = join(dirname(pkgJsonPath), "bin", binaryName());
    return existsSync(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function resolveLocalDev(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "..", "bin", binaryName()),
    join(here, "..", "..", "bin", binaryName()),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/**
 * Locate the native mpxj-convert binary for the current platform.
 * Order: explicit override → installed @byteink/mpxjs-<platform> sidecar → local bin/ during dev.
 */
export function resolveBinary(override?: string): string {
  if (override) {
    if (!existsSync(override)) throw new Error(`Binary not found at ${override}`);
    return override;
  }
  const fromSidecar = resolveSidecar();
  if (fromSidecar) return fromSidecar;

  const fromDev = resolveLocalDev();
  if (fromDev) return fromDev;

  const key = currentPlatformKey();
  const supported = Object.keys(PLATFORM_KEYS).join(", ");
  throw new Error(
    `mpxjs has no prebuilt binary for ${key}. ` +
    `Install one of: ${supported}, or set the MPXJS_BINARY env var to a local binary path.`,
  );
}
