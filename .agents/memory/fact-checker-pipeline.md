---
name: Fact Checker Pipeline
description: Architecture decisions for the evidence-based fact-check pipeline added to AIEngine
---

## Architecture

Single Groq call (`llama-3.3-70b-versatile`) does classification + evidence gathering in one structured JSON response.
Pipeline modules live in `artifacts/api-server/src/lib/fact-checker/` (NOT `fact-check/` which is the old provider chain).

## Key Rules

- AI must never invent sources. `safeParseEvidence()` in `groq-analyzer.ts` filters out any item whose URL doesn't start with `http`.
- `sourcesAvailable` is only true if AI reports it AND at least one evidence item survived URL validation.
- If no real sources: trust score capped at 50, verdict forced to UNVERIFIED.
- Non-fact claims (Opinion/Question/Prediction) → UNVERIFIED immediately, no trust score computation.

## Trust Formula

40% avg source credibility + 30% source agreement ratio + 20% evidence strength (min(100, count*20)) + 10% AI confidence

## Verdict Thresholds

score≥80 + support ratio≥0.7 → TRUE; score≥65 + ratio≥0.55 → MOSTLY TRUE; score≥40 → MIXED; ratio<0.35 + contradictions → MISLEADING; else FALSE

**Why:** Formula-based scoring prevents the AI from always returning "TRUE" and ensures evidence balance is weighted.

## DB Columns Added (migration applied)

fact_checks: claimType (text), summary (text), supportingEvidence (jsonb), contradictingEvidence (jsonb), sources (jsonb), timeline (jsonb)
