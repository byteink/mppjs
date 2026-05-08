import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convert } from "../src/index.js";

const SAMPLES_DIR = process.env.MPXJ_SAMPLES ?? "/tmp/mpxj/junit/data";

const cases = [
  ["DurationTest8.mpp", "MPP8 (Project 98)"],
  ["DurationTest9.mpp", "MPP9 (Project 2000/2002)"],
  ["mpp12assignmentcustom.mpp", "MPP12 (Project 2007)"],
  ["ResourceIdAndUniqueId-project2010-mpp14.mpp", "MPP14 (Project 2010)"],
  ["ResourceIdAndUniqueId-project2013-mpp14.mpp", "MPP14 (Project 2013)"],
] as const;

for (const [file, label] of cases) {
  test(`converts ${label}`, async () => {
    const input = join(SAMPLES_DIR, file);
    if (!existsSync(input)) {
      assert.fail(`sample not found: ${input}`);
    }
    const dir = mkdtempSync(join(tmpdir(), "mpxj-"));
    const output = join(dir, file.replace(/\.mpp$/, ".xml"));
    const result = await convert(input, output);
    const xml = readFileSync(result.outputPath, "utf8");
    assert.match(xml, /^<\?xml /);
    assert.match(xml, /xmlns="http:\/\/schemas\.microsoft\.com\/project"/);
  });
}
