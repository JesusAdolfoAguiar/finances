---
name: reference-pics
description: Look at the refrence-pics/ folder whenever Jesus references pics, pictures, screenshots, or images. Use when he says "check the pics", "look at the screenshot", "see the last N pics", or anything similar — a picture beats a description for verifying live Zapier/UI state.
---

# Reference pics

## When to trigger
- "check the pics" / "look at the screenshots" / "see the last N pics"
- Any mention of a picture, image, or screenshot without a full explicit path
- Right after asking Jesus to confirm a live UI edit was applied — he'll often answer with pics
  instead of words

## Procedure
1. Note: the folder is `refrence-pics/` (misspelled, no middle "e" — not "reference-pics").
2. Read `refrence-pics/README.md` if session conventions are unclear (session vs persisted,
   retention buckets) — don't re-derive these rules, they're already written there.
3. Two subfolders:
   - `refrence-pics/session/` — ephemeral, gitignored, generic names (`t1.png`, `t2.png`, ...).
     This is almost always where a just-taken screenshot lands.
   - `refrence-pics/persisted/` — renamed, committed, cited by name in briefs/decisions/ports.
4. "Last N pics" = N most recently modified files across both subfolders (check `session/`
   first — that's the default landing spot). Use `find <dir> -type f -printf '%T@ %p\n' | sort -n`
   to order by mtime, don't assume filename order (generic names like `t1`/`t2` get reused and
   overwritten across sessions).
5. Read the images directly (Read tool handles image files) — don't just list filenames.
6. If a picture is about to be cited as evidence in a persisted file (`decisions.md`, a port,
   a brief), it needs to move to `persisted/` under a real name first — flag this to Jesus rather
   than citing a `session/` generic filename directly (those get silently overwritten).

## Don't
- Don't assume "reference-pics" spelling — check `refrence-pics/` first.
- Don't cite a `session/`-folder generic filename (`t1.png` etc.) in any committed file — it will
  rot. Rename into `persisted/` first, per the README's convention.
- Don't treat a screenshot as ground truth over a re-exported Zap JSON once one exists — JSON
  wins per `CLAUDE.md`. A screenshot is corroboration for something not yet re-exportable (a
  live-editor UI state, a Slack DM, an SMS received), not a permanent record once the JSON can
  confirm the same fact.
