# AGENTS.md

## Mission

Build a Kenya public health intelligence application that helps a user select a county, sub-county, and ward and understand live public health risks in that area through official Ministry of Health (MOH) data, supporting contextual signals, and clear local guidance.

The application should prioritize:

- Official and recent health alerts
- Geographic precision within Kenya administrative boundaries
- Fast understanding for public users and decision support for field staff
- Safe communication that does not overstate certainty
- Mobile-friendly access for low-bandwidth environments

## Product Outcomes

The app should allow a user to:

1. Select a Kenya county, sub-county, and ward.
2. View live or near-real-time MOH alerts and advisories relevant to that location.
3. See an interactive map with outbreak, advisory, facility, and guidance layers.
4. Understand a summarized risk level for key public health threats.
5. Read localized public health guidance written in plain language.
6. Review what changed recently in the selected area.
7. Inspect source provenance, timestamps, and confidence labels for each signal.

## Non-Negotiable Product Rules

- Treat MOH and other official Kenya government sources as the highest-priority data sources.
- Distinguish clearly between official reported data and inferred model outputs.
- Never fabricate a live API, live record, case count, advisory, or location.
- If a source is unavailable, the UI must say so explicitly and fall back safely.
- Every alert, score, and advisory should expose its source and last-updated time.
- Risk labels must be explainable and traceable to contributing signals.
- The app must remain usable on mobile screens before desktop polish is added.

## Feature Scope

The implementation should include all of the following:

1. Hierarchical county, sub-county, and ward selector
2. Live risk scorecard
3. MOH alert map
4. "What changed today" timeline
5. Localized guidance
6. Disease-specific drilldowns
7. Nearby health service access
8. Source traceability and confidence indicators
9. Low-bandwidth bulletin mode
10. Community and field reporting intake with moderation labeling

## Data and Integration Expectations

The app should be designed around adapters so each source can be swapped or extended. At minimum, architecture should support:

- Official MOH alert and advisory ingestion
- Outbreak or event feeds
- Kenya administrative boundary data for county, sub-county, and ward
- Health facility registries
- Weather, flooding, or environmental context if available
- Optional field reports from CHVs or local officers

Each source adapter should define:

- `source_id`
- `source_name`
- `source_type`
- `official_status`
- `fetch_method`
- `refresh_interval`
- `geographic_resolution`
- `record_schema`
- `error_behavior`

## UX Guidance

- Default to a map-first workflow paired with a compact risk summary.
- Make the selected geography persistent and shareable through the URL.
- Use color carefully and ensure the interface remains readable under low contrast conditions.
- Avoid alarmist copy; use actionable and specific language.
- Make "why is this risk level shown?" one tap away.
- Support both expert and non-expert users with layered detail.
- Always show the selected county, sub-county, and ward in the page header.

## Mapping Guidance

- All mapped alerts should be filterable by disease, severity, time window, and source.
- Distinguish polygons, points, and advisory regions visually.
- Use clustering where point density is high.
- Clicking a map feature should reveal source, timestamp, status, and local guidance.
- When exact ward-level coordinates are not available, show the best available geography and label that precision clearly.

## Risk Engine Guidance

The risk engine should combine official alerts with supporting context and produce:

- Overall local risk status
- Threat-specific risk statuses
- Contributing factors
- Confidence score
- Freshness status

The engine should be conservative:

- Recent official outbreaks should dominate inferred signals.
- Stale data should reduce confidence.
- Missing data should not silently imply low risk.

## Safety and Content Standards

- Include a visible disclaimer that the app supports awareness and response but does not replace clinical care or emergency services.
- For urgent symptoms or suspected outbreaks, direct users to official hotlines or nearby care pathways where available.
- Content should be understandable to the public, CHVs, and county responders.
- Avoid diagnostic language unless quoting official clinical guidance.

## Technical Preferences

- Prefer a modular frontend and backend with typed schemas.
- Keep ingestion logic separate from presentation logic.
- Normalize external records into a common internal event model.
- Cache API responses with explicit timestamps and expiry metadata.
- Build for graceful degradation when live services fail.
- Write tests for parsers, risk scoring rules, and geography selection behavior.

## Delivery Phases

Build in this order unless constraints require adjustment:

1. Project scaffold and design system
2. Kenya geography selector and administrative boundary model
3. Live source adapters and normalized event pipeline
4. Risk scoring and local guidance generation
5. Map layers and timeline views
6. Facility access and bulletin mode
7. Community reporting intake
8. Testing, observability, and deployment hardening

## Definition of Done

The app is ready when:

- A user can select a real Kenya county, sub-county, and ward
- The app fetches live or live-simulated official-source data through adapters
- The map updates based on the selected geography
- Risk cards and guidance update from normalized signals
- Every visible item has a source and timestamp
- Failure states are honest and understandable
- The experience works on mobile and desktop
