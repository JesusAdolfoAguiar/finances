---
name: chat-hand-in
description: Receiving-side counterpart of handoff-chat. MUST fire on turn 1 of any chat that begins with a handoff document in context (pasted, attached, or quoted) — recognizable by a "# HANDOFF:" header, "Closed at turn:", or sections like "Open Questions" / "Assumptions in Play" / "Next Concrete Action". Also triggers on "resume", "continue from handoff", "hand-in", "pick up where we left off". Its ONLY job on turn 1: emit ONE batched intake request covering every verification, artifact, and ruling the session needs — then stop. No work, no scoping, no substeps until intake returns. Works for ANY task type (Zapier sprints, Shopify, infra, writing) — it keys on handoff document structure, not domain. If you are about to start executing a Next Concrete Action from a handoff without having run intake, STOP: that is the exact failure this skill exists to kill (11 turns of serial elicitation, measured 2026-07-09).
---

# Chat Hand-In

Push is not enough. `handoff-chat` writes state DOWN; nothing forced the next chat to pull the
right things UP before working. Measured failure (R00 Part 5 → Part 6, 2026-07-09): the handoff
doc already listed every open question, and the receiving chat still burned **11 turns** of
one-at-a-time elicitation (git log → screenshot → "how do I get the port checklist" → format
sample → paths → scan output) before real work started. Same disease zap-sprint-loop phase 0
kills for Brandon gates: piecemeal asks. This skill applies the batching rule to Claude itself.

**Prime directive: turn 1 = one batched intake, nothing else. Work starts at turn 2, on
whatever the intake unblocked.**

## 1. Trigger conditions (any one)

- A handoff document is in context at chat start (`# HANDOFF:` header, `Closed at turn:` field,
  or ≥2 of: Open Questions / Assumptions in Play / State — Blocked / Next Concrete Action).
- User says "resume", "hand-in", "continue from the handoff", "pick up part N".
- The handoff doc's own breadcrumb: `→ On resume: invoke chat-hand-in before any work.`

If a handoff doc is present but the user's first message ALSO contains a new instruction
("here's the handoff — also do X"): intake still fires first; X is appended to the intake
response as a scope addendum, never a bypass.

## 2. Turn-1 protocol

1. **Parse the handoff.** Harvest every item from: Open Questions, Assumptions in Play,
   State — Blocked, State — In Progress, and the Next Concrete Action. Legacy docs without an
   Intake Payload section (§5): derive the intake from those sections — full backward
   compatibility, no complaint about the doc format.
2. **Classify every item into two tiers:**
   - `NOW` — blocks the Next Concrete Action or invalidates it if wrong (unconfirmed commits,
     unverified state the next step builds on, missing files/paths the next step reads).
   - `DEFER` — real, but only blocks a later step. Listed, tagged with the step it blocks,
     NOT asked for yet.
3. **Emit ONE intake block** (§3 format). Copy-paste-ready commands wherever a command can
   answer the question — never "check whether X committed" when
   `git log --oneline -3 -- <file>` can be handed over verbatim.
4. **STOP.** No STATE HEADER protocol resumption, no scoping, no substeps, no partial work.
   The intake block IS turn 1's entire output (plus a one-line header, §4).

## 3. Intake block format

```
## INTAKE — answer in one message, then we work
Handoff: <title> · Closed at turn <n> · Next action per doc: <one line>

### NOW (blocks next action)
1. [VERIFY] <claim> → run: `<exact command>` → paste output
2. [ATTACH] <file/artifact> → `<path or how to get it>` → paste content
3. [RULE]   <decision needed> → <options, one line each>

### DEFER (blocks later steps — do not answer now)
- <item> → blocks <step/concern> → will be requested when reached
```

Rules:
- NOW list ≤ 7 items. More than 7 → the handoff's Next Concrete Action is too big; say so and
  intake only for its first executable slice.
- Every VERIFY ships its command. Every ATTACH ships its path (or the command to find it).
  Every RULE ships its options. Zero items that require the user to figure out HOW to answer.
- Nothing from the handoff's "Decisions Locked" section may appear in intake. Locked is locked.
- Item descriptions (the `<claim>`, `<file/artifact>`, `<decision needed>` text) follow caveman: fact-only, no restating handoff prose, no throat-clearing.

## 4. Turn-2+ protocol (after intake returns)

- **Partial answers:** proceed immediately on whatever is unblocked; unanswered NOW items move
  to a visible `OPEN-INTAKE` line in the STATE HEADER's `Last:` field until resolved. Never
  re-ask serially one per turn — re-ask only in the next natural batch.
- **Turn counter:** continues from the handoff's `Closed at turn` value (this chat's turn 1 =
  closed_at + 1) for the 40/60/80 handoff-window triggers; a per-chat count may be shown in
  parentheses if useful. Rationale: the windows exist to bound CONTEXT, and context is
  per-chat — but continuity of the count across a task keeps estimates honest. Format:
  `Turn: 44 (chat 2)`.
- **Protocol resumption:** coached-build / zap-sprint-loop STATE HEADER resumes at turn 2 with
  position taken from the handoff (loop phase, concern, step) — corrected by anything intake
  contradicted. An intake answer beats the handoff doc; the handoff doc beats memory.
- **Contradiction rule:** if intake output contradicts the handoff (e.g., "committed" claim,
  empty git log), the contradiction becomes the new first task — log it, fix it, then resume
  the doc's Next Concrete Action.

## 5. Sender-side contract (amendment to handoff-chat)

`handoff-chat` MUST end every handoff document with:

```
## Intake Payload (for chat-hand-in)
### NOW — commands
- `<verification command 1>`   # verifies: <claim>
- `<verification command 2>`   # verifies: <claim>
### NOW — attach on arrival
- <file/path>                  # needed for: <next action>
### RULE on arrival
- <pending decision + options>
### DEFER
- <item> → blocks <step>
→ On resume: invoke chat-hand-in before any work.
```

The sender knows better than the receiver what the next chat needs — it just finished the work.
Deriving intake receiver-side (§2.1) is the fallback, not the design.

## 6. Failure modes this skill prevents

- Serial elicitation after resume (11 turns measured, 2026-07-09) → §2 single batch.
- Receiver re-deriving asks the handoff already enumerated → §5 sender payload.
- Work starting on unverified "done" claims (uncommitted decisions.md entries built on for a
  full session) → §2 NOW-tier VERIFY items with commands.
- Turn-counter ambiguity across chat boundaries (reset-vs-continue guessed, never ruled) →
  §4 explicit rule.
- Intake bloat (interrogating the user for 15 items before any value) → §3 NOW ≤ 7 + DEFER tier.
- Re-litigating locked decisions on fresh-chat amnesia → §3 locked-is-locked rule.