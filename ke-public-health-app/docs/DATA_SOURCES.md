# DATA_SOURCES.md

## Purpose

This document defines the data sources for the Kenya public health risk application, the role each source plays, and how the system should behave when a source is unavailable, stale, incomplete, or only available at a broader geographic level.

## Source Prioritization

Order sources by trust and authority:

1. Official Kenya Ministry of Health (MOH) sources
2. Other official Kenya government and county government health sources
3. Official international public health partners and structured registries
4. Environmental and contextual support sources
5. Community or field-submitted reports

The UI and backend must always distinguish between:

- Official reported data
- Official advisory content
- Derived or inferred risk signals
- Unverified community reports

## Core Data Categories

The app needs data for:

- Administrative geography
- Alerts and advisories
- Outbreak and surveillance events
- Health facilities and service access
- Environmental context
- Guidance content
- Community reports

## Candidate Source Inventory

### 1. Kenya Ministry of Health (MOH) Alerts and Advisories

#### Role

Primary source for official public health alerts, advisories, outbreak notices, prevention messages, campaign updates, and emergency health communications.

#### Expected Use

- Alert cards
- Map overlays
- Timeline updates
- Local guidance links

#### Integration Notes

- Prefer structured APIs if available.
- If only RSS, JSON feed, HTML pages, or downloadable documents are available, use a parser adapter with explicit source metadata.
- Record the publication time and retrieval time separately.

#### Required Metadata

- `source_id`
- `title`
- `summary`
- `published_at`
- `retrieved_at`
- `url`
- `alert_type`
- `disease_tags`
- `severity`
- `affected_geographies`
- `official_status`

### 2. Kenya MOH Outbreak or Surveillance Feeds

#### Role

Primary source for official outbreak reporting, disease surveillance summaries, situational updates, or epidemiological bulletins.

#### Expected Use

- Disease-specific risk scoring
- Outbreak map layers
- Trend timeline
- What changed today panel

#### Integration Notes

- Normalize all records into a common event schema regardless of source format.
- Preserve reporting level such as national, county, sub-county, ward, or facility.
- If counts are unavailable, support qualitative outbreak statuses.

#### Required Metadata

- `event_id`
- `event_type`
- `disease`
- `status`
- `reported_at`
- `effective_start`
- `effective_end`
- `geographic_level`
- `geographic_codes`
- `case_counts`
- `deaths`
- `source_url`

### 3. Kenya Health Facility Registry

#### Role

Support nearby care access, referral options, facility availability context, and map markers.

#### Expected Use

- Nearby facility panel
- Map markers
- Referral and hotline guidance

#### Integration Notes

- Should include facility type, ownership, coordinates, administrative area, and contact details where available.
- Must tolerate incomplete coordinates and fall back to area-level placement only if clearly labeled.

#### Required Metadata

- `facility_id`
- `facility_name`
- `facility_type`
- `county`
- `sub_county`
- `ward`
- `latitude`
- `longitude`
- `phone`
- `ownership`
- `services`

### 4. County Government Health Notices

#### Role

Supplement MOH data with county-specific health notices, campaigns, closures, spraying drives, immunization efforts, and local advisories.

#### Expected Use

- Local guidance panel
- Change timeline
- Facility and service context

#### Integration Notes

- Treat as official only when clearly attributable to county government health entities.
- Do not let county notices override a newer MOH alert unless business rules explicitly allow it.
- County coverage may be partial in the first release and should be reported transparently in source health.

### 5. CDC Kenya and CDC Global Health Kenya Sources

#### Role

Provide CDC program updates, disease detection references, and global health response context linked to Kenya.

#### Expected Use

- Source traceability panel
- Risk context explanation
- Disease response and surveillance references

#### Integration Notes

- Treat CDC as an official international public health source.
- Prefer Kenya-specific or Kenya-linked CDC pages rather than generic global pages.

### 6. KEMRI Sources

#### Role

Provide Kenya Medical Research Institute research, surveillance, and public health science context relevant to disease monitoring and response.

#### Expected Use

- Disease drilldowns
- Surveillance context
- Source traceability panel

#### Integration Notes

- Treat KEMRI as an official Kenya research institution.
- Distinguish research or explainer content from official outbreak declarations.

### 7. Environmental Context Sources

#### Role

Provide supportive risk context for flooding, rainfall, heat, drought, water-borne disease conditions, or vector-friendly conditions.

#### Expected Use

- Risk modifiers
- Environmental map layers
- Explanation of contributing factors

#### Integration Notes

- These sources should influence inferred risk, not replace official disease alerts.
- Weight should be lower than official outbreak or advisory signals.

#### Example Fields

- `hazard_type`
- `observed_at`
- `forecast_window`
- `severity`
- `geometry`
- `source_url`

### 8. Guidance Content Sources

#### Role

Provide official prevention, response, and care-seeking guidance that can be shown for a selected disease or threat.

#### Expected Use

- Local guidance cards
- Disease drilldowns
- Bulletin mode summaries

#### Integration Notes

- Prefer MOH-authored guidance.
- If local guidance is not available, fall back to broader official guidance and label it as national-level.

### 9. Community and Field Reports

#### Role

Allow CHVs, local staff, or trusted users to submit observations such as symptom clusters, water contamination concerns, medicine stockouts, or unusual events.

#### Expected Use

- Separate community reporting layer
- Contextual awareness
- Escalation candidates for human moderation

#### Integration Notes

- Must never be presented as official unless explicitly verified through a moderation workflow.
- Require moderation metadata.

#### Required Metadata

- `report_id`
- `submitted_at`
- `submitted_by_role`
- `location`
- `report_type`
- `description`
- `verification_status`
- `moderation_notes`

## Normalized Internal Models

All live integrations should map into a small set of internal models:

- `AlertRecord`
- `OutbreakEvent`
- `FacilityRecord`
- `EnvironmentalSignal`
- `GuidanceRecord`
- `CommunityReport`
- `SourceStatus`

Every normalized record should include:

- `source_id`
- `source_name`
- `official_status`
- `retrieved_at`
- `fresh_until`
- `geographic_level`
- `geographic_codes`
- `confidence`

## Geographic Resolution Rules

- Prefer ward-level data when truly available.
- If only sub-county or county level data exists, show it to the user with a clear precision label.
- Do not imply a ward-specific outbreak from a county-level alert unless the official source explicitly names the ward.
- Map and timeline components must show the reporting level.

## Freshness Rules

- Each source adapter must define a refresh cadence and a stale threshold.
- The UI should display when data is fresh, delayed, stale, or unavailable.
- Stale data may remain visible for historical awareness but must not be treated as current without a warning.

## Fallback Behavior

If a source fails:

- Log the failure in source health status.
- Preserve the last successful snapshot if it is within a safe retention window.
- Mark the source as delayed or unavailable in the UI.
- Avoid collapsing the entire risk view if only one source is unavailable.

If no official live alert source is available:

- State that official live alerts are currently unavailable.
- Continue showing cached historical information if safely labeled.
- Reduce confidence in risk summaries.

## Validation Rules

- Reject records missing source attribution.
- Reject records with impossible coordinates.
- Normalize Kenya administrative names and codes before matching.
- Deduplicate alerts and events by source identifier, URL, timestamp, and title similarity where needed.
- Preserve raw payloads for debugging where storage policy allows.

## Operational Requirements

- Adapters must expose health metrics such as last success, last failure, latency, and record count.
- Polling intervals should be configurable by environment.
- Source credentials or keys, if required, must be stored in environment variables.
- Parsing logic should be covered by tests using representative fixtures.

## Open Questions to Resolve During Build

- Which official MOH endpoints are available as stable APIs versus scrapeable feeds?
- Which Kenya facility datasets are public and up to date enough for production use?
- What county-level feeds are reliable enough to integrate in the first release?
- Which environmental sources meaningfully improve risk quality without overwhelming the user?
