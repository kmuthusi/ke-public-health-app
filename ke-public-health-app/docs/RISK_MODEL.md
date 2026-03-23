# RISK_MODEL.md

## Purpose

This document defines how the application converts official alerts, outbreak data, environmental context, facility access information, and community reports into understandable public health risk summaries for a selected Kenya county, sub-county, or ward.

## Design Principles

- Official MOH alerts should carry the greatest weight.
- The model should be conservative and explainable.
- Missing data should lower confidence, not silently imply safety.
- Geographic precision matters; broader-area data must not be overstated as ward-specific.
- Freshness matters; stale inputs should decay in influence.
- Community reports can inform awareness but cannot outweigh official alerts unless explicitly verified.

## Model Outputs

For any selected geography, the app should produce:

- `overall_risk_level`
- `overall_confidence`
- `freshness_status`
- `top_contributing_factors`
- `disease_risk_breakdowns`
- `recommended_actions`
- `source_summary`

## Risk Levels

Use a five-level risk scale:

1. `minimal`
2. `guarded`
3. `elevated`
4. `high`
5. `critical`

These levels should be presented with:

- Human-readable labels
- A short explanation
- A color treatment that remains accessible
- A visible confidence indicator

## Confidence Levels

Use:

- `low`
- `medium`
- `high`

Confidence should reflect:

- Source authority
- Data freshness
- Geographic match quality
- Cross-source agreement
- Completeness of data

## Input Signal Types

The model should consider the following signal classes:

1. Official alert or advisory signals
2. Official outbreak or surveillance signals
3. Environmental risk signals
4. Health service strain or access signals
5. Community report signals
6. Historical baseline or recent trend signals

## Weighting Philosophy

Apply weights in this approximate order of importance:

1. Official active outbreak notices
2. Official active advisories or emergency alerts
3. Official surveillance evidence
4. Facility strain or service disruption
5. Environmental risk indicators
6. Verified community reports
7. Unverified community reports

The model should not treat all signals as additive in a naive way. It should use rule-based promotion and suppression so that one strong official signal can dominate weaker contextual signals.

## Base Scoring Approach

Each disease or threat category should receive a score from `0` to `100`.

Suggested bands:

- `0-19`: minimal
- `20-39`: guarded
- `40-59`: elevated
- `60-79`: high
- `80-100`: critical

The overall risk may be derived from:

- The maximum disease-specific score with safeguards
- A weighted combination of active threats
- Explicit promotion rules for severe official events

## Promotion Rules

The following should raise risk strongly:

- A recent official outbreak declaration in the selected geography
- An official MOH advisory naming the selected county, sub-county, or ward
- A sharp recent increase in reported cases from an official source
- Facility disruption combined with active outbreak evidence
- Multiple agreeing official signals across separate MOH publications

## Suppression Rules

The following should reduce inferred risk or confidence:

- Signals are stale beyond the expected update window
- The signal applies only to a broader geography than the selected location
- A source is incomplete or missing key metadata
- Only low-authority sources support the threat
- Data is contradictory across sources

## Geographic Matching Rules

Score signal relevance based on geographic specificity:

- Exact ward match: highest relevance
- Sub-county match: high relevance
- County match: moderate relevance
- Neighboring county or regional signal: low relevance
- National advisory without local specificity: contextual relevance only

A county-level signal may influence a ward score, but the UI must indicate that the evidence is county-level.

## Freshness Rules

Signals should decay over time based on source type.

Suggested default windows:

- Active alerts: strongest within 72 hours
- Outbreak reports: strong within 7 days, decaying after
- Environmental alerts: follow source forecast or observation window
- Facility disruptions: strong within 48 hours unless updated
- Community reports: rapid decay unless verified

Freshness states:

- `current`
- `aging`
- `stale`
- `unknown`

## Disease Categories

The first release should support at least:

- Cholera and other water-borne disease risks
- Measles and vaccine-preventable disease risks
- Malaria and vector-borne disease risks
- Dengue or arboviral risks where relevant
- Polio vigilance
- Respiratory illness risks
- Maternal and child health access disruptions
- Environmental health threats such as flooding or unsafe water

## Example Rule Patterns

### Cholera

Increase risk when:

- Official cholera outbreak notices are active
- Flooding or water contamination signals are present
- Multiple community reports mention diarrhea clusters and are verified
- Nearby facilities report service strain

### Measles

Increase risk when:

- Official outbreak or exposure alerts exist
- Vaccination campaign notices indicate emergency response activity
- School cluster reports are verified

### Malaria

Increase risk when:

- Seasonal or environmental suitability is high
- Official surveillance shows elevated incidence
- Local facility reports suggest increased febrile case burden

## Community Report Handling

- Unverified reports should contribute mostly to awareness, not decisive risk escalation.
- Verified reports may meaningfully raise a localized score.
- A sudden cluster of unverified reports may increase "watchfulness" but should primarily lower confidence until corroborated.

## Confidence Calculation Guidance

Confidence should increase when:

- The source is official
- Multiple sources agree
- The data is recent
- The geography matches closely
- Metadata is complete

Confidence should decrease when:

- Only inferred sources exist
- The data is stale
- The geography is broad
- The source is unofficial or unverified
- There are parsing or matching uncertainties

## Explanation Requirements

Every displayed risk should support a "why" panel with:

- Top contributing signals
- Source list with timestamps
- Geographic precision labels
- Confidence explanation
- Missing-data warnings where relevant

## Safe Defaults

- If there is no data, do not show `minimal`; show `insufficient data` or a low-confidence guarded state depending on product choice.
- If official data is unavailable but contextual risk is high, say the risk is inferred from supporting signals.
- If the model detects a severe official event, prioritize surfacing the official language and source.

## Pseudologic

1. Gather all normalized records for the selected geography and recent relevant parent geographies.
2. Score each record for source authority, freshness, severity, and geographic match.
3. Group records by disease or threat type.
4. Apply disease-specific rules and modifiers.
5. Compute confidence separately from severity.
6. Derive overall risk from disease-level outputs and promotion rules.
7. Generate explanation and recommendation payloads.

## Testing Expectations

Add test coverage for:

- Geographic specificity weighting
- Freshness decay behavior
- Promotion rules for official alerts
- Confidence degradation under missing data
- Disease-specific scoring examples
- Separation of official and community signals
