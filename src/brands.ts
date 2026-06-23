// GH-2098 — nominal brand types for the three core ID strings.
//
// Layering note: schemas are package-internal (consumed by state.ts).
// Only the explicit types and thin parse functions are public API.
// This keeps the public entry point free of zod schema objects (JSR fast-types).

import { z } from "zod";

// ── brand markers (unique symbols — nominal typing, no zod dependency) ────

declare const _sha: unique symbol;
declare const _branch: unique symbol;
declare const _unit: unique symbol;

// ── git commit sha ─────────────────────────────────────────────────────────

/** A git commit SHA — a non-empty string nominally typed to prevent accidental mixing with branch names or work-unit ids. */
export type Sha = string & { readonly [_sha]: void };

// ── branch name ────────────────────────────────────────────────────────────

/** A git branch name — a non-empty string nominally typed to prevent mixing with {@link Sha} or {@link WorkUnitId}. */
export type BranchName = string & { readonly [_branch]: void };

// ── work-unit id ───────────────────────────────────────────────────────────
//
// Permissive carrier. `src/machine/work_unit.ts` in prx owns canonical-shape
// validation (the GH/NOTION/BD union). To produce a WorkUnitId, callers must
// go through parseWorkUnitId (non-empty gate) or explicit `as WorkUnitId` cast
// at a validated boundary.

/** A work-unit identifier (e.g. `"GH-1234"`) — a non-empty string nominally typed to prevent mixing with {@link Sha} or {@link BranchName}. Permissive carrier; prx's `work_unit.ts` owns canonical-shape validation. */
export type WorkUnitId = string & { readonly [_unit]: void };

// ── internal schemas (NOT re-exported from index.ts) ─────────────────────────
//
// These are exported from brands.ts so state.ts can import them for building
// rawStateV1Schema. They are explicitly excluded from the public index.ts.

/** @internal */
export const shaSchema = z.string().min(1).transform((v) => v as Sha);
/** @internal */
export const branchNameSchema = z.string().min(1).transform((v) => v as BranchName);
/** @internal */
export const workUnitIdSchema = z.string().min(1).transform((v) => v as WorkUnitId);

// ── thin parse seams ─────────────────────────────────────────────────────────
//
// Brand a raw string on the way in at a validated boundary. Nullable variants
// pass `null` through untouched.

/** Parse and brand a raw string as a {@link Sha}. Throws if the value is empty. */
export const parseSha = (value: string): Sha => {
  if (value.length === 0) throw new Error("Sha must be a non-empty string");
  return value as Sha;
};

/** Parse and brand a raw string as a {@link BranchName}. Throws if the value is empty. */
export const parseBranchName = (value: string): BranchName => {
  if (value.length === 0) throw new Error("BranchName must be a non-empty string");
  return value as BranchName;
};

/** Parse and brand a raw string as a {@link WorkUnitId}. Throws if the value is empty. */
export const parseWorkUnitId = (value: string): WorkUnitId => {
  if (value.length === 0) throw new Error("WorkUnitId must be a non-empty string");
  return value as WorkUnitId;
};

/** Parse and brand a nullable string as `Sha | null` — passes `null` through without validation. */
export const parseShaNullable = (value: string | null): Sha | null =>
  value === null ? null : parseSha(value);

/** Parse and brand a nullable string as `BranchName | null` — passes `null` through without validation. */
export const parseBranchNameNullable = (value: string | null): BranchName | null =>
  value === null ? null : parseBranchName(value);

/** Parse and brand a nullable string as `WorkUnitId | null` — passes `null` through without validation. */
export const parseWorkUnitIdNullable = (value: string | null): WorkUnitId | null =>
  value === null ? null : parseWorkUnitId(value);
