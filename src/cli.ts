#!/usr/bin/env node
import { convert } from "./index.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 2 || args[0] === "-h" || args[0] === "--help") {
    process.stderr.write("Usage: mpxjs <input> [output.xml]\n");
    process.exit(2);
  }
  try {
    const { outputPath } = await convert(args[0], args[1]);
    process.stdout.write(outputPath + "\n");
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(1);
  }
}

main();
