import { test } from "bun:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertSeam } from "@bounded-systems/seam-check";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// machine-schema is a pure schema leaf: it depends only on zod. The harness
// proves that edge and that prod files hold no ambient authority.
test("@bounded-systems/machine-schema upholds its seam claim", () => {
  assertSeam({
    root: SRC,
    prod: ["zod"],
    test: ["@bounded-systems/machine-schema", "@bounded-systems/seam-check"],
  });
});
