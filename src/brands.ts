// GH-2098 — the repo's first Zod `.brand<>()` types. Nominal safety for the
// three core ID strings that flow through the raw-fact carrier
// (`rawStateV1Schema`) and the handoff envelope: a work-unit id, a branch
// name, and a git commit sha are no longer mutually assignable.
//
// Layering note: this package peer-depends only on `zod`. The *canonical*
// work-unit-id shape (the GH/NOTION/BD union) is registry-derived at runtime
// in `src/machine/work_unit.ts` and must NOT be duplicated here. Zod brands
// unify on the literal type argument, so `src/` can append
// `.brand<"WorkUnitId">()` to its canonical schema and produce the SAME TS
// type as the permissive carrier below — no symbol import across the layer.
//
// All three carriers are permissive on shape (`min(1)`): branding is nominal
// typing, not a new validation gate. `derivePhase`/`assertInvariants`
// re-`.parse()` the raw-fact schema, so tightening shape here would change
// runtime acceptance — out of scope for this pure type-nominalization step.

import { z } from "zod";

// ── git commit sha ─────────────────────────────────────────────────────────

/** Zod schema for a {@link Sha}: validates a non-empty string and brands it as `"Sha"`. */
export const shaSchema = z.string().min(1).brand<"Sha">();

/** A git commit SHA — a non-empty string nominally typed to prevent accidental mixing with branch names or work-unit ids. */
export type Sha = z.infer<typeof shaSchema>;

// ── branch name ────────────────────────────────────────────────────────────

/** Zod schema for a {@link BranchName}: validates a non-empty string and brands it as `"BranchName"`. */
export const branchNameSchema = z.string().min(1).brand<"BranchName">();

/** A git branch name — a non-empty string nominally typed to prevent mixing with {@link Sha} or {@link WorkUnitId}. */
export type BranchName = z.infer<typeof branchNameSchema>;

// ── work-unit id ───────────────────────────────────────────────────────────
//
// Permissive carrier. `src/machine/work_unit.ts` owns canonical-shape
// validation and brands its registry-derived schema with the same
// `"WorkUnitId"` tag, yielding an identical TS type.

/** Zod schema for a {@link WorkUnitId}: validates a non-empty string and brands it as `"WorkUnitId"`. */
export const workUnitIdSchema = z.string().min(1).brand<"WorkUnitId">();

/** A work-unit identifier (e.g. `"GH-1234"`) — a non-empty string nominally typed to prevent mixing with {@link Sha} or {@link BranchName}. Permissive carrier; `src/machine/work_unit.ts` owns canonical-shape validation. */
export type WorkUnitId = z.infer<typeof workUnitIdSchema>;

// ── thin parse seams ─────────────────────────────────────────────────────────
//
// Brand a raw string on the way in at a validated boundary. Nullable variants
// pass `null` through untouched (the schema fields they back are nullable).

/** Parse and brand a raw string as a {@link Sha}. Throws if the value is empty. */
export const parseSha = (value: string): Sha => shaSchema.parse(value);

/** Parse and brand a raw string as a {@link BranchName}. Throws if the value is empty. */
export const parseBranchName = (value: string): BranchName => branchNameSchema.parse(value);

/** Parse and brand a raw string as a {@link WorkUnitId}. Throws if the value is empty. */
export const parseWorkUnitId = (value: string): WorkUnitId => workUnitIdSchema.parse(value);

/** Parse and brand a nullable string as `Sha | null` — passes `null` through without validation. */
export const parseShaNullable = (value: string | null): Sha | null =>
  value === null ? null : shaSchema.parse(value);

/** Parse and brand a nullable string as `BranchName | null` — passes `null` through without validation. */
export const parseBranchNameNullable = (value: string | null): BranchName | null =>
  value === null ? null : branchNameSchema.parse(value);

/** Parse and brand a nullable string as `WorkUnitId | null` — passes `null` through without validation. */
export const parseWorkUnitIdNullable = (value: string | null): WorkUnitId | null =>
  value === null ? null : workUnitIdSchema.parse(value);
