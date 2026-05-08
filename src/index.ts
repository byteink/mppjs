import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolveBinary } from "./platform.js";

export interface ConvertOptions {
  /** Override the binary location. Falls back to MPXJS_BINARY env var, then platform sidecar, then local dev binary. */
  binaryPath?: string;
  /** Milliseconds before the spawned process is killed. Default 60_000. */
  timeoutMs?: number;
}

export interface ConvertResult {
  outputPath: string;
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Convert a Microsoft Project file (.mpp, .mpx, .xml MSPDI, etc.) to MSPDI XML.
 * Returns the absolute path to the written XML.
 */
export async function convert(
  input: string,
  output?: string,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const inputPath = resolve(input);
  if (!existsSync(inputPath)) {
    throw new Error(`Input not found: ${inputPath}`);
  }
  const outputPath = output
    ? resolve(output)
    : inputPath.replace(/\.[^./\\]+$/, "") + ".xml";

  const bin = resolveBinary(options.binaryPath ?? process.env.MPXJS_BINARY);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  await new Promise<void>((resolveP, rejectP) => {
    const child = spawn(bin, [inputPath, outputPath], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectP(new Error(`mpxjs timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      rejectP(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolveP();
      rejectP(new Error(`mpxjs exited ${code}: ${stderr.trim() || "no stderr"}`));
    });
  });

  return { outputPath };
}
