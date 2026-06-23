// GH-1397 — structured handoff envelope for executor-blocked verbs.
//
// When any prx actor session hits a harness-denied verb today, it emits a
// free-text "run this from a fresh shell" string. The handoff queue replaces
// that with a typed envelope routed to the recipient actor (publisher /
// triage / submit / author). GH-1398's recipient-actor ADR settled the
// recipient-actor model and named `publisher` as the primary recipient;
// this package owns the wire-shape contract every downstream recipient
// ticket builds against.
//
// `intent.verb` is opaque (string) and `intent.args` is `unknown` — each
// drainer validates its own arg shape with a per-recipient Zod at the drain
// boundary. The discriminated-union alternative becomes a god-type every
// drainer imports the moment a fourth recipient lands; mirror the
// `appendAuditRow` boundary contract (src/audit/sink.ts:67) instead.
//
// Large `intent.args` (PR bodies, diffs) spill to plan-store CAS by
// `sha256:` handle; the handle lives in `inputRefs[]`. Satisfies I-AUD2
// (artifact lineage) by construction; the bd row stays small for cheap
// prefix scans.
//
// All zod schemas are package-internal — the public API is explicit types
// and thin parse/safe-parse seams. This keeps the public entry point free
// of slow-type schema objects (JSR fast-types gate).

import { z } from "zod";

import { workUnitIdSchema, type WorkUnitId } from "./brands.ts";

// ── recipient actors ──────────────────────────────────────────────────────

/** The recipient actor for a handoff envelope — one of `"publisher" | "keeper" | "triage" | "submit" | "author" | "noop"`. */
export type HandoffTargetActor =
  | "publisher"
  | "keeper"
  | "triage"
  | "submit"
  | "author"
  | "noop";

/** All valid {@link HandoffTargetActor} values, in declaration order. Use instead of a schema's `.options` array. */
export const HANDOFF_TARGET_ACTOR_VALUES: readonly HandoffTargetActor[] = [
  "publisher",
  // GH-2348.3: keeper owns git-write (push/branch) — the recipient for denied
  // git-tool verbs, split out of publisher (which keeps the forge pr.* surface).
  "keeper",
  "triage",
  "submit",
  "author",
  // Generic no-op adapter — drain plumbing for end-to-end test coverage.
  "noop",
] as const satisfies readonly HandoffTargetActor[];

// ── envelope status ───────────────────────────────────────────────────────

/** The durable lifecycle status of a handoff envelope. Mirrors the `handoffMachine` state graph. */
export type HandoffStatus =
  | "pending"
  | "claimed"
  | "draining"
  | "done"
  | "failed"
  | "abandoned";

// ── denial provenance ─────────────────────────────────────────────────────

/** The denial reason for a handoff: why the verb was denied and enqueued. */
export type HandoffDenialReason =
  | "blocked"
  | "not-allowlisted-for-role"
  | "unknown-tool"
  | "flag-layer-deny";

// ── intent payload ────────────────────────────────────────────────────────

/** The intent payload of a handoff: a verb name and opaque args that the draining recipient validates. */
export type HandoffIntent = {
  /** Non-empty verb name, opaque to the queue. */
  verb: string;
  /** Verb-specific args — the recipient validates at drain time. */
  args: unknown;
};

// ── policy-key tag (audit join hint) ──────────────────────────────────────

/** A policy-key tag: tool + subcommand + state + role, carried on policy-table deny enqueues for audit correlation. */
export type HandoffPolicyKey = {
  tool: string;
  subcommand: string;
  state: string;
  role: string;
};

// ── worktree ref ──────────────────────────────────────────────────────────

/** A worktree reference: absolute `path` and `branch` name. Used by publisher and author drain adapters. */
export type HandoffWorkTreeRef = {
  path: string;
  branch: string;
};

// ── envelope ──────────────────────────────────────────────────────────────

/**
 * A fully-parsed handoff envelope — one row per harness-denied verb.
 * Persisted in bd memory; large `args` spill to plan-store CAS via `inputRefs`.
 * All fields have defaults applied. Use when reading from bd memory.
 */
export type HandoffEnvelope = {
  /** ULID. Stable identity for replay and audit joins. */
  id: string;
  /** Idempotency key per I-HQ3. */
  dedupKey: string;
  /** UoW lineage. Nullable for ambient enqueues. */
  workUnitId: WorkUnitId | null;
  /** Refuses cross-repo enqueue when this disagrees with the current repo. */
  repoSlug: string;
  /** Originating actor that produced the deny. */
  sourceActor: string;
  /** Originating session id (for audit lookup). */
  sourceSessionId?: string | undefined;
  /** Recipient actor. */
  targetActor: HandoffTargetActor;
  /** Verb + opaque args. Drainer validates `args` at the boundary. */
  intent: HandoffIntent;
  /** CAS handles (`cas://sha256:...`, `scout://`, `plan://`, `submit://`). Defaults to `[]`. */
  inputRefs: string[];
  /** `event_id` of the deny that produced this handoff. */
  causedBy?: string | undefined;
  /** Why the verb was denied. */
  denialReason: HandoffDenialReason;
  /** Optional join-tag for policy-table denies. */
  policyKey?: HandoffPolicyKey | undefined;
  enqueuedAt: string;
  status: HandoffStatus;
  /** Claimant — set on CLAIM, cleared on RELEASE. */
  claimedBy?: string | undefined;
  claimAt?: string | undefined;
  claimTtlSec?: number | undefined;
  /** Defaults to `0`. */
  attempts: number;
  /** Defaults to `3`. */
  maxAttempts: number;
  lastError?: string | undefined;
  workTreeRef?: HandoffWorkTreeRef | undefined;
};

/** The input shape of a {@link HandoffEnvelope} — fields with defaults (`inputRefs`, `attempts`, `maxAttempts`) are optional. Use when constructing an envelope for enqueueing. */
export type HandoffEnvelopeInput = Omit<
  HandoffEnvelope,
  "inputRefs" | "attempts" | "maxAttempts"
> & {
  inputRefs?: string[] | undefined;
  attempts?: number | undefined;
  maxAttempts?: number | undefined;
};

// ── drain outcome ─────────────────────────────────────────────────────────

/** The outcome of a drain adapter call: `{ ok: true }` on success, `{ ok: false, error }` on failure. */
export type HandoffDrainOutcome = { ok: true } | { ok: false; error: string };

// ── internal schemas ──────────────────────────────────────────────────────
//
// NOT exported — use the parse functions below as the public API.

const _handoffTargetActor = z.enum([
  "publisher",
  "keeper",
  "triage",
  "submit",
  "author",
  "noop",
] as const);

const _handoffStatus = z.enum([
  "pending",
  "claimed",
  "draining",
  "done",
  "failed",
  "abandoned",
] as const);

const _handoffDenialReason = z.enum([
  "blocked",
  "not-allowlisted-for-role",
  "unknown-tool",
  "flag-layer-deny",
] as const);

const _handoffIntent = z.object({
  verb: z.string().min(1),
  args: z.unknown(),
});

const _handoffPolicyKey = z.object({
  tool: z.string(),
  subcommand: z.string(),
  state: z.string(),
  role: z.string(),
});

const _handoffWorkTreeRef = z.object({
  path: z.string(),
  branch: z.string(),
});

const _handoffEnvelope = z.object({
  id: z.string().min(1),
  dedupKey: z.string().min(1),
  workUnitId: workUnitIdSchema.nullable(),
  repoSlug: z.string().min(1),
  sourceActor: z.string().min(1),
  sourceSessionId: z.string().optional(),
  targetActor: _handoffTargetActor,
  intent: _handoffIntent,
  inputRefs: z.array(z.string()).default([]),
  causedBy: z.string().optional(),
  denialReason: _handoffDenialReason,
  policyKey: _handoffPolicyKey.optional(),
  enqueuedAt: z.string().datetime({ offset: true }),
  status: _handoffStatus,
  claimedBy: z.string().optional(),
  claimAt: z.string().datetime({ offset: true }).optional(),
  claimTtlSec: z.number().int().positive().optional(),
  attempts: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().positive().default(3),
  lastError: z.string().optional(),
  workTreeRef: _handoffWorkTreeRef.optional(),
});

const _handoffDrainOutcome = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

// Compile-time drift guards — fail if explicit types diverge from schema output.
type _Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _driftEnvelope: _Eq<HandoffEnvelope, z.output<typeof _handoffEnvelope>> = true;
void _driftEnvelope;
const _driftOutcome: _Eq<HandoffDrainOutcome, z.output<typeof _handoffDrainOutcome>> = true;
void _driftOutcome;

// ── public parse seams ─────────────────────────────────────────────────────

/**
 * Validate and parse an unknown value as a {@link HandoffEnvelope}.
 * Throws a ZodError on invalid input. Defaults are applied (`inputRefs=[]`, `attempts=0`, `maxAttempts=3`).
 */
export function parseHandoffEnvelope(raw: unknown): HandoffEnvelope {
  return _handoffEnvelope.parse(raw);
}

/**
 * Safe-parse an unknown value as a {@link HandoffTargetActor}.
 * Returns `{ success: true, data }` on match, `{ success: false }` otherwise.
 */
export function safeParseHandoffTargetActor(
  value: unknown,
): { success: true; data: HandoffTargetActor } | { success: false } {
  const result = _handoffTargetActor.safeParse(value);
  if (result.success) return { success: true, data: result.data };
  return { success: false };
}

/**
 * Validate and parse an unknown value as a {@link HandoffDrainOutcome}.
 * Throws a ZodError on invalid input.
 */
export function parseHandoffDrainOutcome(raw: unknown): HandoffDrainOutcome {
  return _handoffDrainOutcome.parse(raw);
}
