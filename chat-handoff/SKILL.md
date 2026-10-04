---
name: handoff-chat
description: Generate a structured handoff document when a chat is approaching token limits or hitting a natural task boundary, so the next chat resumes with full state. Triggers on phrases like "handoff", "handoff to part N", "new chat", "close this chat", "pass context to next session", "we need to continue elsewhere". Use BEFORE any planned context switch, not after. Pairs with the coached-build skill — if coached-build is active, the turn counter from its STATE HEADER feeds directly into the "Closed at turn" field below. Sender-side counterpart of chat-hand-in: every handoff MUST end with an Intake Payload section that the receiving chat's turn-1 batched intake consumes. Do not use for normal task completion — only when context will be transferred to a fresh chat.
---

# Handoff Chat

## When to invoke

- User says: `handoff`, `new chat`, `passing to part N`, `close this chat`, `continue elsewhere`.
- Chat shows context strain: re-asking answered questions, contradicting earlier turns, slower responses.
- About to do a big context burn (paste large files, long codegen, open a new sub-domain).
- `coached-build` skill auto-suggested handoff at turn ≥ 40 / ≥ 60 / ≥ 80 (see thresholds below).

## When to CLOSE the current chat

Priority order:

1. **Task boundary.** Finish current `Task X / Step Y` then handoff. Mid-task handoffs lose more than they save.
2. **Symptoms.** Claude re-asks, forgets, or contradicts earlier turns. Latency creeps up.
3. **Big burn ahead.** Large paste / long codegen / new sub-domain → handoff first.
4. **Soft caps (using turn counter from coached-build STATE HEADER):**
   - Code-heavy: turn 50–70
   - Discussion-heavy: turn 80–100
   - Hard ceiling: turn 120 — handoff regardless of task state

Symptoms beat counts. The right question is not *"when to close"* — it is *"is my next move worth its token cost in THIS chat?"*

## Premortem (proactive)

When chat crosses ~40 turns OR context strain appears, surface one line:
> "⚠ Handoff window approaching. Draft one at the next task boundary?"

If `coached-build` is active, this line is already being emitted via its STATE HEADER. Don't duplicate.

## Output format

Produce ONE fenced code block. User copies it as the first message of the new chat. No prose around it. No commentary. The block is the deliverable.

Required structure — every section is mandatory. If empty, write `None` — DO NOT omit. Missing sections are what burned the last handoff.

Free-text values (rationale, descriptions, notes) follow the caveman skill: fact-only, no filler, no restating the field label. Structure — field labels, section headers — is fixed and exempt from cutting.

```
# HANDOFF: <Current Chat Name> → <Next Chat Name>
Generated: <ISO timestamp>
Closed at turn: <n>
Reason for handoff: <task boundary | symptoms | big-burn ahead | hard ceiling>

## Identity
- Project:
- Sprint / Task:
- Coached position: Task X of Y, Step Z of W
- Repo / branch:
- Environment / store flag: (e.g., --store=segalvein)

## State — Done (with proof)
- <item> — file:line | commit SHA | Slack/HubSpot link
- ...

## State — In Progress
- Exact stop point: file, line, function, OR "waiting on <person> for <thing>"
- Last working hypothesis:

## State — Blocked
- Blocker:
- On whom / what:
- Workaround in place:

## Decisions Locked (DO NOT re-litigate)
- <Decision> — chosen because <one-line rationale>
- Example: "Routing key = company number + owner lookup. Per-rep DID rejected because <reason>."

## Assumptions in Play (silent ones — these kill handoffs)
- <Assumption that, if wrong, breaks everything>
- ...

## Open Questions
- Q: <question> — answered by <who> by <when>

## Next Concrete Action
- One sentence. What the new chat does in its first response.

## Resume Recipe (if mid-task)
- Exact commands, queries, file opens the new chat must run BEFORE doing anything else, to rebuild minimal working state.

## Out of Scope (this chat)
- Deferred items, with reason:

## Sensitive / Secrets
- NEVER paste tokens, keys, passwords. Reference by name only.
  e.g., "HubSpot private-app token — rotate pending, see <vault ref>"

## Control Vocabulary (reaffirm — pulled from coached-build skill)
- Active control words: ok / done / zoom / skip / why / code / dump / state / confirm <action>
- SAFE-MODE active for: <list any pending destructive ops>
- Formatting: TL;DR first, bullets for long, caveman terseness, STATE HEADER each turn

## Pointers (DRY — link, do not restate)
- Issue:
- Docs:
- Prior chat URL:

## Memory Promotion Candidates
- Facts that proved durable across chats and should move to user memory next:
- ...

## Intake Payload (for chat-hand-in)
### NOW — commands
- `<verification command 1>`   # verifies: <claim it verifies>
- `<verification command 2>`   # verifies: <claim it verifies>
### NOW — attach on arrival
- <file/path>                  # needed for: <the Next Concrete Action>
### RULE on arrival
- <pending decision + options, one line each> (write `None` if none)
### DEFER
- <item> → blocks <step/concern> (write `None` if none)
→ On resume: invoke chat-hand-in before any work.
```

**Intake Payload authoring rules (sender-side — this is the half that was missing):**
- Every Open Question that a COMMAND can answer gets that command in `NOW — commands`,
  copy-paste-ready. "Verify decisions.md committed" without the `git log` line is a defect.
- Every file the Next Concrete Action reads goes in `NOW — attach on arrival` with its path.
- Unruled decisions the next chat will hit go in `RULE on arrival` WITH their options.
- Items real but not blocking the next action → `DEFER`, tagged with what they block.
- NOW items capped at 7 — more means the Next Concrete Action is over-scoped; shrink it.
- The breadcrumb line (`→ On resume: ...`) is mandatory and literal — it is the receiving
  chat's trigger. A handoff without it relies on the user remembering to invoke the skill,
  which is the failure mode being killed.

## Receiving-chat behavior — DELEGATED to chat-hand-in

The receiving chat's turn-1 protocol (batched intake, tiering, turn-counter continuation,
contradiction handling) lives in `skills/chat-hand-in/SKILL.md`. Do not restate it here.
One rule repeated because this file previously contradicted it: **the turn counter CONTINUES
from `Closed at turn`** (`Turn: 44 (chat 2)` format) — it does NOT reset to 1.

## DRY enforcement

- Durable facts (rep roster, store mapping, auth account, locked architectural decisions) belong in **user memory**, not in every handoff. End each handoff by listing **Memory Promotion Candidates**.
- Link to source of truth (GitHub issue, repo file, Slack thread). Do not restate content of linked artifacts.

## Edge cases

- **Mid-task forced handoff.** `Resume Recipe` section is mandatory in this case.
- **Fork (parallel chats).** One handoff per fork. Each gets an explicit `Do Not Touch` list to prevent overlap.
- **Stale handoff pasted into new chat.** If timestamp is older than recent work in current chat, ask: *"Handoff is from <timestamp>. Anything newer I should know?"* before proceeding.
- **Secret leak risk.** Scan handoff text for token-shaped strings (long base64, `sk-*`, `hapikey=`, `xoxb-`, `pat-`, AWS key patterns). If found, refuse to output until redacted. Intake Payload commands are NOT exempt — a command embedding a token is a leak.
- **Memory conflict.** If handoff contradicts current user memory, surface the conflict explicitly. Do not silently pick one.
- **Empty-section temptation.** If a section is empty, write `None`. Missing sections are how Part 1 → Part 2 lost context.
- **Handoff drift during long chats.** If user keeps working past the handoff draft, regenerate before closing — do not paste a stale one. The Intake Payload is the most drift-sensitive section — its commands verify claims as of drafting time.
- **Turn counter missing.** If `coached-build` was not active during the chat, ask user to estimate turns OR write `unknown` and rely on symptom-based judgement for soft caps.

## Failure modes this skill prevents

- **Narrative-summary handoffs** (Sprint 1 - Z09 - Part 1 → Part 2): Part 2 inherited prose, not state; re-litigated locked decisions. → Decisions Locked + Assumptions in Play sections.
- **Push-without-pull** (Sprint 1 - R series - Part 5 → Part 6, measured 2026-07-09): the handoff enumerated every open question, yet the receiving chat burned 11 turns of serial elicitation deriving asks the sender could have shipped as commands. → Intake Payload section + mandatory chat-hand-in breadcrumb.