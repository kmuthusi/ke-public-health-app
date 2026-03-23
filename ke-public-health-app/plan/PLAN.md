# PLAN.md

## Objective

Deliver a production-ready Kenya public health risk application where a user can select a county, sub-county, and ward and view live MOH-connected alerts, map layers, risk summaries, facility access information, and localized guidance.

## Working Assumptions

- The first release is a web application optimized for both desktop and mobile.
- Live integrations should prefer official MOH and Kenya government sources.
- Some "real-time" signals may arrive through polling intervals rather than push streams.
- Where ward-level official data is unavailable, the app may display county or sub-county level data with a clear precision label.
- The initial release should degrade safely if live APIs are partially unavailable.

## Phase 1: Foundation and Project Setup

### Goals

- Establish project structure, tooling, environment configuration, and design language.
- Decide frontend, backend, map, and data-fetching stack.

### Deliverables

- App scaffold
- Shared type definitions
- Environment variable strategy
- API service abstraction
- Base layout and responsive shell
- Documentation starter set

### Exit Criteria

- App runs locally
- Basic layout renders on mobile and desktop
- Shared schemas compile successfully

## Phase 2: Kenya Geography Model

### Goals

- Support county, sub-county, and ward selection using real Kenya administrative data.

### Deliverables

- Normalized geography dataset
- Searchable hierarchical selector
- URL state for selected geography
- Boundary lookup helpers
- Geometry loading strategy for maps

### Exit Criteria

- User can select county, sub-county, and ward
- Selector state persists in URL
- Selected geography can be resolved to map geometry and identifiers

## Phase 3: Live Data Source Adapters

### Goals

- Ingest official and supporting public health data through a normalized pipeline.

### Deliverables

- MOH advisory adapter
- MOH outbreak/event adapter
- Health facility registry adapter
- Optional environmental context adapter
- Adapter status and error metadata
- Cached normalized event store

### Exit Criteria

- At least one official-source adapter fetches live data successfully
- Source failures are surfaced without breaking the app
- Normalized event schema is stable across adapters

## Phase 4: Risk Engine and Guidance Layer

### Goals

- Translate incoming signals into understandable risk summaries and local recommendations.

### Deliverables

- Risk scoring rules
- Confidence scoring rules
- Freshness decay logic
- Disease-specific risk breakdowns
- Local guidance templates by threat type and severity
- Explanation model for "why this risk level?"

### Exit Criteria

- Selected location produces a risk summary from available signals
- UI can explain contributing factors and confidence
- Missing data is handled explicitly

## Phase 5: Map, Timeline, and Alert Experience

### Goals

- Visualize health intelligence in a clear, filterable, location-aware interface.

### Deliverables

- Interactive alert map
- Layer controls
- Severity and disease filters
- "What changed today" timeline
- Feature detail popovers
- Precision labels for geometry level

### Exit Criteria

- Map updates when location changes
- Timeline reflects recent changes in normalized events
- Users can inspect source details from the map

## Phase 6: Facilities, Bulletin Mode, and Accessibility

### Goals

- Make the app useful in field conditions and for rapid communication.

### Deliverables

- Nearby facility finder
- Hotline and service contact panel
- Low-bandwidth bulletin view
- Accessible color and keyboard interactions
- Print/share-friendly summary view

### Exit Criteria

- Users can view service access relevant to their area
- Bulletin mode is readable and lightweight
- Core workflows are accessible by keyboard and screen reader

## Phase 7: Community Reporting Intake

### Goals

- Allow trusted local inputs without confusing them with official reports.

### Deliverables

- Structured report submission form
- Moderation status model
- Labeling for unverified versus verified reports
- Admin-facing ingestion boundary or queue stub

### Exit Criteria

- Community reports can be submitted and stored safely
- UI clearly separates official data from community submissions

## Phase 8: Testing, Observability, and Release Readiness

### Goals

- Ensure reliability, traceability, and maintainability before deployment.

### Deliverables

- Unit tests for adapters and scoring logic
- Integration tests for geography and filtering flows
- Monitoring hooks and health checks
- Error logging strategy
- Deployment documentation

### Exit Criteria

- Critical flows are covered by automated tests
- Adapter failures are observable
- Deployment path is documented and repeatable

## Feature-to-Phase Mapping

1. Hierarchical location selector: Phase 2
2. Live risk scorecard: Phase 4
3. MOH alert map: Phase 5
4. What changed today timeline: Phase 5
5. Localized guidance: Phase 4
6. Disease-specific drilldowns: Phase 4 and Phase 5
7. Nearby health service access: Phase 6
8. Source traceability and confidence indicators: Phase 3 and Phase 4
9. Low-bandwidth bulletin mode: Phase 6
10. Community and field reporting intake: Phase 7

## Implementation Order for the First Build

1. Scaffold the web app and shared schemas.
2. Add Kenya geography data and the county/sub-county/ward selector.
3. Implement source adapters and normalize records.
4. Build the risk engine and local guidance model.
5. Add the map, alert layers, and timeline.
6. Add facilities, bulletin mode, and reporting intake.
7. Test, refine, and prepare deployment.

## Risks and Mitigations

- Official APIs may be inconsistent or unavailable.
  Mitigation: use adapter isolation, caching, explicit source health indicators, and documented fallbacks.

- Ward-level data coverage may be incomplete.
  Mitigation: support best-available precision and always label the reporting level.

- Risk scoring may appear overly authoritative.
  Mitigation: expose contributing factors, confidence, freshness, and source provenance.

- Low-bandwidth usage may degrade the map experience.
  Mitigation: provide a bulletin mode and delay heavy map layers until needed.

## Build Discipline

- Keep all external integrations behind typed adapters.
- Avoid coupling UI components directly to raw source payloads.
- Add tests whenever a parser or scoring rule is introduced.
- Prefer small, reviewable increments with visible user value after each phase.
