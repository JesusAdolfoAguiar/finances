---
name: handoff-checklist
description: Generate the list of Brandon-gated items that need to be resolved upfront before a build session, to avoid mid-build permission gaps. Use at the start of any new Zap work, when planning a Brandon sync, or whenever Jesus says "what do I need from Brandon for <task>".
---

# Brandon handoff checklist

## Why this skill exists
Per recurring pattern: Brandon-gated blockers stall every Z-series build mid-stream. Get them all in one Brandon session, upfront.

## When to trigger
- "what do I need from Brandon for <task>"
- "handoff checklist"
- "brandon list"
- Before scheduling a Brandon sync
- At the start of any new Z-series build

## Procedure
1. Read the relevant brief(s) and any available JSON.
2. Identify everything that requires Brandon's access:
   - Live Zap ownership transfer (per Zap — needed for JSON export)
   - Connection sharing (per app: HubSpot, RingCentral, Slack, others)
   - Token rotation (any exposed credentials found in scans)
   - Workspace role changes (Super Admin promotion if needed)
   - Plan-tier confirmation (Team vs Enterprise affects export options and shared folder behavior)
   - RingCentral admin actions (webhook subscriptions, JWT app config, extension config)
3. Format as a single checklist Jesus can paste to Brandon, with verification steps.

## Output format
Save to `briefs/<program>/decisions.md` as an entry (preferred — keeps program-local history together), OR if it's a cross-program build (e.g. infrastructure migration), save to `briefs/02-decisions/<topic>-handoff-<YYYY-MM-DD>.md`. Format:

```
# Brandon — Zapier handoff for <task>
Date: <date>

## Owner transfers (per Zap)
- [ ] Change owner: `<zap-name>` → jesus.drjohnnys@gmail.com
  - Path: three-dot menu → Change owner → enter email → save
- [ ] Change owner: ...

## Connection sharing (per app, with workspace)
- [ ] Share HubSpot connection `<exact name>` with workspace
- [ ] Share RingCentral connection `<exact name>` with workspace
- [ ] Share Slack connection `<exact name>` with workspace

## Token rotation
- [ ] Rotate HubSpot private-app token (currently exposed in <zap, step>)
- [ ] Update <zap> to pull from <Storage by Zapier | private integration auth>

## Workspace
- [ ] Promote jesus.drjohnnys@gmail.com to Super Admin (if not already)
- [ ] Confirm plan: Team or Enterprise?
- [ ] Confirm whether bulk JSON export (Settings → Security and data) is available

## RingCentral (if applicable)
- [ ] <list any RC admin-only actions needed>

## Verification (Jesus, after Brandon completes the list)
- [ ] Each Zap shows "Export JSON" in three-dot menu
- [ ] Each shared connection appears in my "Connections" page
- [ ] `npm run snapshot` then `npm run scan-secrets` passes
- [ ] First live Zap export lands in `zaps/live/<name>.json`
```

## Don't
- Don't bundle requests across multiple unrelated Zap series. One handoff per task.
- Don't omit verification. Brandon-gated items have a high re-block rate.
- Don't ask for credentials. Ask for ownership transfer + connection sharing instead.
- Don't ask for "access to Brandon's account". That's the same Google login as his Gmail and not a valid path.
