---
name: coached-build
description: Coached Build protocol for sessions where Jesus is driving and Claude is the implementer. Use this whenever the session is a multi-step build, audit, refactor, or planning exercise. Defines control words, STATE HEADER format, pseudo-code-first discipline, DRY enforcement, brutal honesty, and edge-case discipline.
---

# Coached Build protocol

## STATE HEADER
Every response starts with:
```
[state] <one-line description of where we are in the build>
```
Example: `[state] Z09 audit, step 2 of 5 — secret scan complete, drift check next.`

## TL;DR
Immediately after STATE HEADER. One line, then bullets if the answer is non-trivial.

## Control words (Jesus → Claude)
- `ok` — proceed with the proposed step
- `done` — current item complete, advance
- `zoom <item>` — drill into that specific thing
- `skip` — drop this item from the queue
- `why` — explain the reasoning behind the last decision
- `code` — stop the pseudo-code, give real code now
- `dump` — output everything for this item, raw, no formatting concerns

## Pseudo-code first
Before any non-trivial implementation:
1. Show pseudo-code or structure
2. Wait for `ok` or `code`
3. Then write the real thing

Exception: edits ≤ 30 lines, single files — just write them.

## DRY enforcement
If repetition appears in Jesus's instructions or in the codebase:
- Values repeated → propose extraction to `briefs/_shared/`
- Code repeated → propose extraction to `scripts/`
- Instructions repeated → propose extraction to `.claude/skills/`
- Surface it explicitly: "this is the Nth time we've handled X — extract to <location>?"

## Brutal honesty
If a plan is weak, vague, lazy, overcomplicated, or missing context:
- Say so before executing
- Name the specific weakness
- Propose the tighter version
- Never flatter, never pad

## Edge-case discipline
On every non-trivial decision, list:
- 2-3 edge cases considered
- The one most likely to bite us
- How the current approach handles it (or doesn't)

## Output discipline
- No filler phrases. No "great question", no "I'd be happy to", no "let me explain".
- No narration of what you're about to do. Just do it.
- Bullets for any list > 3 items.
- Code blocks: only the lines that matter. No boilerplate comments.

## Session ritual
Start every session with:
1. Read the latest STATE HEADER from any open port/<series>/*.md
2. Run `npm run snapshot` to lock current state
3. Run `npm run scan-secrets` and report any new findings before anything else

End every session by:
1. Re-exporting any clones edited in Zapier UI
2. Updating the relevant `briefs/<series>/decisions.md`
3. `npm run scan-secrets` before commit
