// GH-2096 — `@bounded-systems/machine-schema` package shell.
//
// Explicit named exports keep zod schema objects off the public entry point —
// JSR fast-types requires every exported symbol be statically analyzable
// without running the TypeScript compiler. Zod schema objects (ZodObject,
// ZodEnum, ZodEffects, …) do not meet that bar; explicit TS types + thin
// parse seams do.

// ── brands ────────────────────────────────────────────────────────────────
export type { Sha, BranchName, WorkUnitId } from "./brands.ts";
export {
  parseSha,
  parseBranchName,
  parseWorkUnitId,
  parseShaNullable,
  parseBranchNameNullable,
  parseWorkUnitIdNullable,
} from "./brands.ts";

// ── state ─────────────────────────────────────────────────────────────────
export type { RawStateV1, InvariantFinding, InvariantReport, WorkflowPhase } from "./state.ts";
export {
  workflowPhases,
  phasePrecedence,
  invariantSpecs,
  parseRawStateV1,
  derivePhase,
  assertInvariants,
} from "./state.ts";

// ── handoff ───────────────────────────────────────────────────────────────
export type {
  HandoffTargetActor,
  HandoffStatus,
  HandoffDenialReason,
  HandoffIntent,
  HandoffPolicyKey,
  HandoffWorkTreeRef,
  HandoffEnvelope,
  HandoffEnvelopeInput,
  HandoffDrainOutcome,
} from "./handoff.ts";
export {
  HANDOFF_TARGET_ACTOR_VALUES,
  parseHandoffEnvelope,
  safeParseHandoffTargetActor,
  parseHandoffDrainOutcome,
} from "./handoff.ts";
