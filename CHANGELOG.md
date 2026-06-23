# @bounded-systems/machine-schema

## 0.3.0

### Breaking Changes

- Removed exported zod schema objects (`handoffTargetActor`, `handoffStatus`, `handoffDenialReason`, `handoffIntent`, `handoffPolicyKey`, `handoffWorkTreeRef`, `handoffEnvelope`, `handoffDrainOutcome`, `rawStateV1Schema`, `shaSchema`, `branchNameSchema`, `workUnitIdSchema`) from the public entry point. All schemas are now package-internal.

### Migration

Replace schema-object usages with the new explicit type + parse-function surface:

- `handoffTargetActor.safeParse(v)` → `safeParseHandoffTargetActor(v)`
- `handoffTargetActor.options` → `HANDOFF_TARGET_ACTOR_VALUES`
- `handoffEnvelope.parse(v)` → `parseHandoffEnvelope(v)`
- `rawStateV1Schema.parse(v)` → `parseRawStateV1(v)`
- Brand types (`Sha`, `BranchName`, `WorkUnitId`) are now plain unique-symbol types rather than `z.infer<...>` aliases. Explicit `as Sha` casts continue to work unchanged.

### Why

Exported zod schema objects are JSR "slow types" — they require the TypeScript compiler to fully evaluate generic parameters, blocking JSR from scoring the `allFastCheck` gate. Moving to explicit types + thin parse seams earns the fast-types point (gate 2/5) without changing any runtime behavior.

## 0.2.0

### Minor Changes

- 2f4b731: Make the remaining leaf packages publish-ready as standalone packages.

  For each of `env`, `policy`, `disposition`, `audit-context`, `fs`, `machine-schema`, and `prx-config`: drop `private`, add the publish metadata (MIT license, repository/homepage/bugs, keywords, `files`, `publishConfig`) and a dist build (`tsconfig.build.json` + `build`/`prepublishOnly` scripts; `exports` resolve `bun`→src and `types`/`import`→dist), plus a README and LICENSE — mirroring `@bounded-systems/cas`.

  These are all true leaves (no internal `@bounded-systems` dependencies). Additionally:

  - `machine-schema` and `prx-config` gain the extractability test the other leaves already had.
  - `prx-config` now declares its `zod` peer dependency (it imported `zod` without declaring it).
