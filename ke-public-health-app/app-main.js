const state = {
  geography: null,
  selectedCounty: "",
  selectedSubCounty: "",
  selectedWard: "",
  liveData: null,
  reports: loadReports(),
  bulletinMode: false,
  map: null,
  markersLayer: null,
};

const elements = {
  localViewButton: document.getElementById("localViewButton"),
  nationalViewButton: document.getElementById("nationalViewButton"),
  countySelect: document.getElementById("countySelect"),
  subCountySelect: document.getElementById("subCountySelect"),
  wardSelect: document.getElementById("wardSelect"),
  countyHelper: document.getElementById("countyHelper"),
  subCountyHelper: document.getElementById("subCountyHelper"),
  wardHelper: document.getElementById("wardHelper"),
  selectorStatus: document.getElementById("selectorStatus"),
  loadButton: document.getElementById("loadButton"),
  bulletinToggle: document.getElementById("bulletinToggle"),
  layerFilter: document.getElementById("layerFilter"),
  sourceFilter: document.getElementById("sourceFilter"),
  severityFilter: document.getElementById("severityFilter"),
  diseaseFilter: document.getElementById("diseaseFilter"),
  nationalPictureCard: document.getElementById("nationalPictureCard"),
  riskHeading: document.getElementById("riskHeading"),
  riskLevelBadge: document.getElementById("riskLevelBadge"),
  riskScore: document.getElementById("riskScore"),
  confidenceValue: document.getElementById("confidenceValue"),
  freshnessValue: document.getElementById("freshnessValue"),
  nationalPictureValue: document.getElementById("nationalPictureValue"),
  locationValue: document.getElementById("locationValue"),
  reasonList: document.getElementById("reasonList"),
  nationalContextCards: document.getElementById("nationalContextCards"),
  timeline: document.getElementById("timeline"),
  guidanceCards: document.getElementById("guidanceCards"),
  diseaseGrid: document.getElementById("diseaseGrid"),
  facilityStatus: document.getElementById("facilityStatus"),
  facilityList: document.getElementById("facilityList"),
  bulletinContent: document.getElementById("bulletinContent"),
  coverageSummary: document.getElementById("coverageSummary"),
  sourceStatus: document.getElementById("sourceStatus"),
  reportForm: document.getElementById("reportForm"),
  reportList: document.getElementById("reportList"),
  lastUpdatedBadge: document.getElementById("lastUpdatedBadge"),
  mapNote: document.getElementById("mapNote"),
};

function loadReports() {
  try {
    return JSON.parse(window.localStorage.getItem("ke-ph-reports") || "[]");
  } catch {
    return [];
  }
}

function saveReports() {
  window.localStorage.setItem("ke-ph-reports", JSON.stringify(state.reports));
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(sub county|subcounty|constituency|district)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSelectedCounty() {
  const target = normalizeName(state.selectedCounty);
  return state.geography?.counties.find((county) => normalizeName(county.name) === target) || null;
}

function getSelectedSubCounty() {
  const county = getSelectedCounty();
  if (!county || !state.selectedSubCounty) return null;
  const target = normalizeName(state.selectedSubCounty);
  return county.subCounties.find((subCounty) => normalizeName(subCounty.name) === target) || null;
}

function populateCountySelect() {
  elements.countySelect.innerHTML = "";
  elements.countySelect.append(createOption("", "Choose county"));
  for (const county of state.geography.counties) {
    elements.countySelect.append(createOption(county.name, county.name));
  }
}

function populateSubCountySelect() {
  const county = getSelectedCounty();
  elements.subCountySelect.innerHTML = "";
  elements.subCountySelect.append(createOption("", county ? "Choose sub-county" : "Select county first"));
  if (!county) {
    updateSelectorState();
    return;
  }
  for (const subCounty of county.subCounties) {
    const label =
      subCounty.matchedWardCount > 0
        ? `${subCounty.name} (${subCounty.matchedWardCount} matched wards)`
        : `${subCounty.name} (uses county ward list)`;
    elements.subCountySelect.append(createOption(subCounty.name, label));
  }
  updateSelectorState();
}

function populateWardSelect() {
  const county = getSelectedCounty();
  elements.wardSelect.innerHTML = "";
  elements.wardSelect.append(createOption("", county ? "Choose ward" : "Select county first"));
  if (!county) {
    updateSelectorState();
    return;
  }

  const selectedSubCounty = getSelectedSubCounty();
  const wards = selectedSubCounty?.wards?.length ? selectedSubCounty.wards : county.wards;

  for (const ward of wards) {
    const suffix =
      ward.constituencyName && (!selectedSubCounty || !selectedSubCounty.wards?.length)
        ? ` (${ward.constituencyName})`
        : "";
    elements.wardSelect.append(createOption(ward.name, `${ward.name}${suffix}`));
  }
  updateSelectorState();
}

function updateSelectorState() {
  const county = getSelectedCounty();
  const subCounty = getSelectedSubCounty();
  const hasCounty = Boolean(county);
  const hasSubCounty = Boolean(subCounty);
  const hasSubCountyOptions = Boolean(county?.subCounties?.length);
  const hasCountyWards = Boolean(county?.wards?.length);
  const hasMatchedSubCountyWards = Boolean(subCounty?.wards?.length);

  elements.subCountySelect.disabled = !hasCounty || !hasSubCountyOptions;
  elements.wardSelect.disabled = !hasCounty || (!hasCountyWards && !hasMatchedSubCountyWards);

  elements.countyHelper.textContent = hasCounty
    ? `County selected: ${county.name}. You can keep a county-wide view or narrow further below.`
    : "Start with a county to unlock sub-county and ward filtering.";

  if (!hasCounty) {
    elements.subCountyHelper.textContent = "Select a county first.";
    elements.wardHelper.textContent = "Select a county first.";
    elements.selectorStatus.textContent =
      elements.layerFilter.value === "national"
        ? "National Picture can be loaded without choosing a county. Select a county anytime to return to local monitoring."
        : "Choose a county to begin. County-wide view is available even without sub-county or ward selection.";
    return;
  }

  elements.subCountyHelper.textContent = hasSubCountyOptions
    ? "Choose a sub-county for a narrower ward list, or leave it blank for a county-wide view."
    : "No sub-county list is available for this county in the current geography file.";

  if (!hasSubCounty) {
    elements.wardHelper.textContent = hasCountyWards
      ? "County-wide ward list is ready. Select a ward now, or choose a sub-county first to narrow the list."
      : "Ward list is not available yet for this county in the current geography file.";
    elements.selectorStatus.textContent = "County selected -> choose sub-county or use county-wide view.";
    return;
  }

  if (hasMatchedSubCountyWards) {
    elements.wardHelper.textContent = `Showing matched wards for ${subCounty.name}.`;
    elements.selectorStatus.textContent = "Sub-county selected -> ward list narrowed to matched wards.";
    return;
  }

  elements.wardHelper.textContent = `No direct ward mapping is available for ${subCounty.name}; showing the county-wide ward list instead.`;
  elements.selectorStatus.textContent =
    "Sub-county selected -> using county-wide ward list because no direct ward mapping is available.";
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  state.selectedCounty = params.get("county") || "";
  state.selectedSubCounty = params.get("subCounty") || "";
  state.selectedWard = params.get("ward") || "";
}

function writeUrlState() {
  const params = new URLSearchParams();
  if (state.selectedCounty) params.set("county", state.selectedCounty);
  if (state.selectedSubCounty) params.set("subCounty", state.selectedSubCounty);
  if (state.selectedWard) params.set("ward", state.selectedWard);
  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function getSelectionLabel() {
  const parts = [state.selectedWard, state.selectedSubCounty, state.selectedCounty].filter(Boolean);
  return parts.length ? parts.join(", ") : "Kenya";
}

function summarizeNationalConfidence(alerts, liveData) {
  const families = new Set((liveData?.availableSourceFamilies || []).filter(Boolean));
  if (alerts.length >= 8 && families.size >= 4) return "moderate-high";
  if (alerts.length >= 4 && families.size >= 2) return "moderate";
  if (alerts.length) return "limited";
  return "--";
}

function buildNationalTopline(liveData) {
  const alerts = liveData?.nationalAlerts || [];
  const highCount = alerts.filter((alert) => alert.severity === "high").length;
  const elevatedCount = alerts.filter((alert) => alert.severity === "elevated").length;
  const score = Math.min(100, alerts.reduce((total, alert) => {
    if (alert.severity === "high") return total + 18;
    if (alert.severity === "elevated") return total + 10;
    return total + 5;
  }, 12));
  const level = highCount ? "high" : elevatedCount >= 2 ? "elevated" : alerts.length ? "guarded" : "neutral";

  return {
    heading: alerts.length ? "Kenya national picture in view" : "Kenya national picture ready",
    level,
    levelLabel: alerts.length ? `${level} national context` : "No data",
    score: alerts.length ? String(score) : "--",
    confidence: summarizeNationalConfidence(alerts, liveData),
    freshness: liveData?.generatedAt ? "current" : "--",
  };
}

function initializeMap() {
  state.map = L.map("map", { zoomControl: true, minZoom: 5 }).setView([0.0236, 37.9062], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);
  state.markersLayer = L.layerGroup().addTo(state.map);
}

function clearChildren(node) {
  node.innerHTML = "";
}

function renderReasons(reasons) {
  clearChildren(elements.reasonList);
  if (!reasons?.length) {
    elements.reasonList.innerHTML = "<li>Select a location to load currently reachable live sources and see which upstream feeds are unavailable.</li>";
    return;
  }
  reasons.forEach((reason) => {
    const li = document.createElement("li");
    li.textContent = reason;
    elements.reasonList.append(li);
  });
}

function renderNationalContext(liveData) {
  clearChildren(elements.nationalContextCards);
  const alerts = liveData?.nationalAlerts || [];
  const families = liveData?.availableSourceFamilies || [];
  const topDiseases = [...new Set(alerts.map((alert) => alert.disease).filter(Boolean))];
  const topTitles = alerts.slice(0, 3).map((alert) => alert.title);
  const nationalMode = elements.layerFilter.value === "national";

  const cards = !liveData
    ? [
        {
          title: "National picture ready",
          body: "Use the National Picture tab above to load Kenya-wide context even before choosing a county.",
        },
      ]
    : [
        {
          title: "National picture status",
          body: alerts.length
            ? `${alerts.length} Kenya-wide alert signal${alerts.length === 1 ? "" : "s"} are available from ${
                families.join(", ") || "currently reachable source families"
              }.`
            : "No national alert signals were returned in the latest fetch.",
        },
        {
          title: "National disease watch",
          body: topDiseases.length
            ? `Current national themes: ${topDiseases.slice(0, 4).join(", ")}.`
            : "Current national context is dominated by general advisories rather than disease-specific signals.",
        },
        {
          title: nationalMode ? "National layer is active" : "National layer is available",
          body: nationalMode
            ? "The map and update feed are currently showing Kenya-wide national context."
            : "Switch to National Picture to inspect Kenya-wide signals on the map and update feed.",
        },
      ];

  cards.forEach((card) => {
    const node = document.createElement("article");
    node.className = "coverage-summary-card";
    node.innerHTML = `<strong>${card.title}</strong><p class="stack-meta">${card.body}</p>`;
    elements.nationalContextCards.append(node);
  });

  if (topTitles.length) {
    const recentNode = document.createElement("article");
    recentNode.className = "stack-card";
    recentNode.innerHTML = `
      <div class="stack-title">
        <strong>Recent national signals</strong>
        <span class="pill pill-muted">${alerts.length} total</span>
      </div>
      <ul class="detail-list">${topTitles.map((title) => `<li>${title}</li>`).join("")}</ul>
    `;
    elements.nationalContextCards.append(recentNode);
  }
}

function syncViewSwitcher() {
  const nationalMode = elements.layerFilter.value === "national";
  elements.localViewButton.classList.toggle("is-active", !nationalMode);
  elements.localViewButton.setAttribute("aria-selected", String(!nationalMode));
  elements.nationalViewButton.classList.toggle("is-active", nationalMode);
  elements.nationalViewButton.setAttribute("aria-selected", String(nationalMode));
}

function renderTimeline(alerts) {
  clearChildren(elements.timeline);
  if (!alerts?.length) {
    elements.timeline.innerHTML =
      elements.layerFilter.value === "national"
        ? '<div class="timeline-item">No Kenya-wide alerts are loaded yet. Open National Picture or refresh live sources to inspect national updates.</div>'
        : '<div class="timeline-item">No live updates loaded yet. Select a county and load current live sources to inspect local updates.</div>';
    return;
  }
  const sourceFilter = elements.sourceFilter.value;
  const severityFilter = elements.severityFilter.value;
  const diseaseFilter = elements.diseaseFilter.value;

  alerts
    .filter((item) => sourceFilter === "all" || item.sourceFamily === sourceFilter)
    .filter((item) => severityFilter === "all" || item.severity === severityFilter)
    .filter((item) => diseaseFilter === "all" || item.disease === diseaseFilter)
    .forEach((alert) => {
      const card = document.createElement("article");
      card.className = "timeline-item";
      card.innerHTML = `
        <div class="stack-title">
          <strong>${alert.title}</strong>
          <span class="status-badge ${alert.severity || "neutral"}">${alert.severity || "info"}</span>
        </div>
        <div class="stack-meta">${alert.sourceCategory || "Category"} | ${alert.sourceFamily || "Source"} | ${alert.sourceName} | ${alert.publishedLabel || "Live fetch, publication time not exposed"} | ${
          alert.disease ? `Disease: ${alert.disease}` : "General public health update"
        }</div>
        <p>${alert.summary || "Live source update fetched through the app proxy."}</p>
        <a href="${alert.url}" target="_blank" rel="noreferrer">Open source</a>
      `;
      elements.timeline.append(card);
    });
}

function getDisplayedAlerts(liveData) {
  const mode = elements.layerFilter.value;
  const localAlerts = liveData?.locationMatchedAlerts || [];
  const nationalAlerts = liveData?.nationalAlerts || [];
  const combinedAlerts = liveData?.alerts || [];

  if (mode === "local") return localAlerts;
  if (mode === "national") return nationalAlerts;
  return combinedAlerts;
}

function renderGuidance(cards, emptyMessage = "No guidance available yet. Guidance appears after current live signals are loaded.") {
  clearChildren(elements.guidanceCards);
  if (!cards?.length) {
    elements.guidanceCards.innerHTML = `<div class="stack-card">${emptyMessage}</div>`;
    return;
  }
  cards.forEach((card) => {
    const node = document.createElement("article");
    node.className = "stack-card";
    node.innerHTML = `
      <div class="stack-title">
        <strong>${card.disease}</strong>
        <span class="pill">${card.scope}</span>
      </div>
      <ul class="detail-list">${card.actions.map((action) => `<li>${action}</li>`).join("")}</ul>
      <p class="stack-meta">Source type: ${card.sourceType}</p>
      ${
        card.note
          ? `<div class="guidance-explainer">
              <p class="guidance-explainer-label">Why this guidance?</p>
              <p class="guidance-explainer-body">${card.note}</p>
            </div>`
          : ""
      }
    `;
    elements.guidanceCards.append(node);
  });
}

function renderDiseaseGrid(alerts, emptyMessage = "No disease-specific signals directly matched the selected location in the latest fetch.") {
  clearChildren(elements.diseaseGrid);
  const grouped = new Map();
  alerts?.forEach((alert) => {
    const disease = alert.disease || "general";
    if (!grouped.has(disease)) grouped.set(disease, []);
    grouped.get(disease).push(alert);
  });

  if (!grouped.size) {
    elements.diseaseGrid.innerHTML = `<article class="disease-card">${emptyMessage}</article>`;
    return;
  }

  for (const [disease, items] of grouped.entries()) {
    const card = document.createElement("article");
    card.className = "disease-card";
    const severities = items.map((item) => item.severity || "guarded");
    const topSeverity = severities.includes("high") ? "high" : severities.includes("elevated") ? "elevated" : "guarded";
    card.innerHTML = `
      <div class="stack-title">
        <strong>${disease === "general" ? "General public health" : disease}</strong>
        <span class="status-badge ${topSeverity}">${topSeverity}</span>
      </div>
      <p>${items.length} linked signal${items.length === 1 ? "" : "s"} from current live fetch.</p>
      <p class="stack-meta">${items[0].sourceCategory || "Category"} | ${items[0].sourceFamily || "Source"} | ${items[0].title}</p>
    `;
    elements.diseaseGrid.append(card);
  }
}

function renderFacilities(facilities, options = {}) {
  const { hasLocalSelection = true } = options;
  if (!hasLocalSelection) {
    elements.facilityStatus.textContent = "Choose a county to load local service access and facility context.";
    clearChildren(elements.facilityList);
    elements.facilityList.innerHTML =
      '<div class="stack-card">Facility access remains location-specific. Select a county to query nearby service context.</div>';
    return;
  }

  elements.facilityStatus.textContent =
    facilities?.status === "ok"
      ? `Live facility adapter status: ok${facilities.source ? ` | ${facilities.source}` : ""}`
      : "Live facility adapter status: unavailable. The app is still usable, but current facility registry access is reduced.";

  clearChildren(elements.facilityList);
  if (!facilities?.items?.length) {
    elements.facilityList.innerHTML =
      '<div class="stack-card">No facility records were returned for the selected location query. This can happen when the live registry endpoint is unavailable or the selected county does not match the current response schema.</div>';
    return;
  }
  facilities.items.forEach((facility) => {
    const node = document.createElement("article");
    node.className = "stack-card";
    node.innerHTML = `
      <div class="stack-title">
        <strong>${facility.name}</strong>
        <span class="pill pill-muted">${facility.type || "Facility"}</span>
      </div>
      <div class="stack-meta">${[facility.ward, facility.subCounty, facility.county].filter(Boolean).join(" | ")}</div>
      <p>${facility.phone ? `Contact: ${facility.phone}` : "Contact details not exposed in current live payload."}</p>
    `;
    elements.facilityList.append(node);
  });
}

function renderSources(sourceStatus) {
  clearChildren(elements.sourceStatus);
  sourceStatus?.forEach((source) => {
    const node = document.createElement("article");
    node.className = "stack-card";
    node.innerHTML = `
      <div class="stack-title">
        <strong>${source.source}</strong>
        <span class="status-badge ${source.status === "ok" ? "minimal" : "high"}">${source.status}</span>
      </div>
      <p>${source.detail}</p>
    `;
    elements.sourceStatus.append(node);
  });
}

function renderCoverageSummary(liveData) {
  clearChildren(elements.coverageSummary);
  const families = liveData?.availableSourceFamilies || [];
  const categories = liveData?.availableSourceCategories || [];
  const matchedCount = liveData?.locationMatchedAlertCount ?? 0;

  const cards = [
    {
      title: "Reachable source families",
      body: families.length ? families.join(", ") : "No live source families reached yet.",
    },
    {
      title: "Current source categories",
      body: categories.length ? categories.join(", ") : "No source categories available yet.",
    },
    {
      title: "Direct location matches",
      body: matchedCount
        ? `${matchedCount} matched alert signal${matchedCount === 1 ? "" : "s"} named this selected area.`
        : "No live alert directly named this selected area during the latest fetch.",
    },
  ];

  cards.forEach((card) => {
    const node = document.createElement("article");
    node.className = "coverage-summary-card";
    node.innerHTML = `<strong>${card.title}</strong><p class="stack-meta">${card.body}</p>`;
    elements.coverageSummary.append(node);
  });
}

function renderBulletin(bulletin) {
  if (!bulletin) {
    elements.bulletinContent.innerHTML = "<p>Select a county and load live sources to generate a local bulletin summary.</p>";
    return;
  }
  elements.bulletinContent.innerHTML = `
    <h3>${bulletin.headline}</h3>
    <p>${bulletin.summary.join(" ")}</p>
    <p><strong>Immediate actions</strong></p>
    <ul class="detail-list">${bulletin.actions.map((action) => `<li>${action}</li>`).join("")}</ul>
  `;
}

function clearLiveDataForSelectionChange() {
  if (!state.liveData) return;
  state.liveData = null;
  renderLiveData();
}

function renderReports() {
  clearChildren(elements.reportList);
  if (!state.reports.length) {
    elements.reportList.innerHTML =
      '<div class="stack-card">No community reports saved yet. Local reports are stored only in this browser and remain labeled as unverified.</div>';
    return;
  }
  [...state.reports].reverse().forEach((report) => {
    const node = document.createElement("article");
    node.className = "stack-card";
    node.innerHTML = `
      <div class="stack-title">
        <strong>${report.reportType}</strong>
        <span class="pill pill-muted">Unverified community report</span>
      </div>
      <div class="stack-meta">${report.role} | ${report.location} | ${new Date(report.createdAt).toLocaleString()}</div>
      <p>${report.description}</p>
    `;
    elements.reportList.append(node);
  });
}

function renderDiseaseFilterOptions(alerts) {
  const values = new Set(["all"]);
  alerts?.forEach((alert) => {
    if (alert.disease) values.add(alert.disease);
  });
  const currentValue = elements.diseaseFilter.value;
  elements.diseaseFilter.innerHTML = "";
  [...values].forEach((value) => {
    elements.diseaseFilter.append(createOption(value, value === "all" ? "All diseases" : value));
  });
  elements.diseaseFilter.value = values.has(currentValue) ? currentValue : "all";
}

function renderSourceFilterOptions(liveData) {
  const values = new Set(["all"]);
  (liveData?.availableSourceFamilies || liveData?.sourceFamilies || []).forEach((family) => values.add(family));
  const currentValue = elements.sourceFilter.value;
  elements.sourceFilter.innerHTML = "";
  [...values].forEach((value) => {
    elements.sourceFilter.append(createOption(value, value === "all" ? "All source families" : value));
  });
  elements.sourceFilter.value = values.has(currentValue) ? currentValue : "all";
}

function updateMap(liveData) {
  if (!state.map || !state.markersLayer) return;
  state.markersLayer.clearLayers();
  const center = liveData?.mapCenter;
  const locationLabel = liveData?.location?.label || "Selected location";

  if (center?.lat && center?.lon) {
    state.map.setView([center.lat, center.lon], 9);
    L.marker([center.lat, center.lon]).addTo(state.markersLayer).bindPopup(`<strong>${locationLabel}</strong><br />Selected location center`);
  } else {
    state.map.setView([0.0236, 37.9062], 6);
  }

  let mappedAlertCount = 0;
  let skippedAlertCount = 0;
  const alerts = getDisplayedAlerts(liveData)
    .filter((item) => elements.sourceFilter.value === "all" || item.sourceFamily === elements.sourceFilter.value)
    .filter((item) => elements.severityFilter.value === "all" || item.severity === elements.severityFilter.value)
    .filter((item) => elements.diseaseFilter.value === "all" || item.disease === elements.diseaseFilter.value);

  alerts.forEach((alert) => {
    const lat = Number(alert.lat);
    const lon = Number(alert.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      skippedAlertCount += 1;
      return;
    }

    mappedAlertCount += 1;
    L.circleMarker([lat, lon], {
      radius: 9,
      color: alert.severity === "high" ? "#bf4b2c" : alert.severity === "elevated" ? "#db7c26" : "#0d8c6c",
      fillOpacity: 0.75,
      weight: 2,
    })
      .addTo(state.markersLayer)
      .bindPopup(
        `<strong>${alert.title}</strong><br/>${alert.sourceName}<br/>${alert.publishedLabel || "Publication time unavailable"}<br/>${alert.sourceCategory || "Category"} | ${alert.sourceFamily || "Source"}<br/>${alert.disease || "General public health"}<br/>${
          (liveData?.locationMatchedAlerts || []).some((item) => item.id === alert.id) ? "Local matched signal" : "National picture signal"
        }`
      );
  });

  const facilities = liveData?.facilities?.items || [];
  let mappedFacilityCount = 0;
  facilities.slice(0, 8).forEach((facility) => {
    if (!facility.lat || !facility.lon) return;
    mappedFacilityCount += 1;
    L.circleMarker([Number(facility.lat), Number(facility.lon)], {
      radius: 6,
      color: "#16302b",
      fillColor: "#ffffff",
      fillOpacity: 0.95,
      weight: 2,
    })
      .addTo(state.markersLayer)
      .bindPopup(`<strong>${facility.name}</strong><br/>${facility.type || "Health facility"}`);
  });

  if (!liveData) {
    elements.mapNote.textContent =
      "Load local or national live sources to view mapped alerts. Signals without reliable coordinates are not plotted.";
    return;
  }

  elements.mapNote.textContent = mappedAlertCount || mappedFacilityCount
    ? `Showing ${mappedAlertCount} mapped alert signal${mappedAlertCount === 1 ? "" : "s"} and ${mappedFacilityCount} mapped facilit${
        mappedFacilityCount === 1 ? "y" : "ies"
      }. ${skippedAlertCount ? `${skippedAlertCount} alert signal${skippedAlertCount === 1 ? "" : "s"} were withheld from the map because no reliable coordinates were exposed.` : "Only signals with reliable coordinates are plotted."}`
    : `No currently displayed alerts exposed reliable coordinates for mapping. ${skippedAlertCount ? `${skippedAlertCount} alert signal${skippedAlertCount === 1 ? "" : "s"} were withheld from the map instead of being plotted synthetically.` : ""}`;
}

function renderLiveData() {
  const liveData = state.liveData;
  const hasLocalSelection = Boolean(state.selectedCounty);
  const risk = hasLocalSelection ? liveData?.risk : null;
  const mode = elements.layerFilter.value;
  const displayedAlerts = getDisplayedAlerts(liveData);
  const nationalMode = mode === "national";
  const locationLabel = hasLocalSelection ? getSelectionLabel() : nationalMode ? "Kenya" : "--";
  const nationalTopline = !hasLocalSelection && nationalMode ? buildNationalTopline(liveData) : null;

  elements.riskHeading.textContent = risk
    ? `${risk.level.toUpperCase()} risk watch for ${liveData.location.label}`
    : nationalTopline
      ? nationalTopline.heading
      : hasLocalSelection
        ? `Select "Load current live sources" to refresh ${locationLabel}`
        : "Choose a county to load a local location profile";
  elements.riskLevelBadge.className = `status-badge ${risk?.level || nationalTopline?.level || "neutral"}`;
  elements.riskLevelBadge.textContent = risk?.level || nationalTopline?.levelLabel || "No data";
  elements.riskScore.textContent = risk ? String(risk.score) : nationalTopline?.score || "--";
  elements.confidenceValue.textContent = risk?.confidence || nationalTopline?.confidence || "--";
  elements.freshnessValue.textContent = risk?.freshness || nationalTopline?.freshness || "--";
  elements.nationalPictureValue.textContent = liveData?.nationalAlerts?.length
    ? `${liveData.nationalAlerts.length} national alert signal${liveData.nationalAlerts.length === 1 ? "" : "s"}`
    : "No national alerts in current view";
  elements.nationalPictureCard.classList.toggle("is-active", nationalMode);
  syncViewSwitcher();
  elements.locationValue.textContent = locationLabel;
  elements.lastUpdatedBadge.textContent = liveData?.generatedAt
    ? `Current live fetch ${new Date(liveData.generatedAt).toLocaleString()}`
    : hasLocalSelection
      ? `Selection changed for ${locationLabel} - reload live sources`
      : "Awaiting live fetch";

  renderReasons(
    risk?.reasons ||
      (hasLocalSelection
        ? ["Selection changed. Reload current live sources to update the local situation summary."]
        : ["Choose a county to load a local situation summary. National context appears separately below."])
  );
  renderNationalContext(liveData);
  renderCoverageSummary(liveData);
  renderSourceFilterOptions(liveData);
  renderDiseaseFilterOptions(displayedAlerts);
  renderTimeline(displayedAlerts);
  renderGuidance(
    hasLocalSelection ? liveData?.guidance || [] : [],
    hasLocalSelection
      ? "No guidance is available yet. Reload current live sources for the selected location."
      : "Local action guidance appears here after you choose a county and load local live sources."
  );
  renderDiseaseGrid(
    hasLocalSelection ? liveData?.locationMatchedAlerts || [] : [],
    hasLocalSelection
      ? "No disease-specific signals directly matched the selected location in the latest fetch."
      : "Threat Watch stays location-specific. Choose a county to inspect disease signals for a selected area."
  );
  renderFacilities(hasLocalSelection ? liveData?.facilities || null : null, { hasLocalSelection });
  renderSources(liveData?.sourceStatus || []);
  renderBulletin(hasLocalSelection ? liveData?.bulletin || null : null);
  updateMap(liveData);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

async function loadGeography() {
  state.geography = await fetchJson("/api/geography");
  populateCountySelect();
  updateSelectorState();
  if (state.selectedCounty) {
    elements.countySelect.value = state.selectedCounty;
    populateSubCountySelect();
  }
  if (state.selectedSubCounty) {
    elements.subCountySelect.value = state.selectedSubCounty;
    populateWardSelect();
  }
  if (state.selectedWard) {
    elements.wardSelect.value = state.selectedWard;
  }
  updateSelectorState();
  syncViewSwitcher();
}

async function loadLiveData(options = {}) {
  const { allowNationalDefault = false } = options;
  const requestingNationalDefault = allowNationalDefault && !state.selectedCounty;

  if (!state.selectedCounty && !requestingNationalDefault) {
    window.alert("Please select at least a county first.");
    return;
  }
  const params = new URLSearchParams({
    county: state.selectedCounty,
    subCounty: state.selectedSubCounty,
    ward: state.selectedWard,
  });
  elements.loadButton.disabled = true;
  elements.loadButton.textContent = requestingNationalDefault ? "Loading Kenya-wide view..." : "Loading...";
  try {
    state.liveData = await fetchJson(`/api/live?${params.toString()}`);
    renderLiveData();
  } catch (error) {
    elements.reasonList.innerHTML = `<li>Unable to load live data: ${error.message}</li>`;
  } finally {
    elements.loadButton.disabled = false;
    elements.loadButton.textContent = "Load current live sources";
  }
}

function handleCountyChange() {
  state.selectedCounty = elements.countySelect.value.trim();
  state.selectedSubCounty = "";
  state.selectedWard = "";
  populateSubCountySelect();
  populateWardSelect();
  clearLiveDataForSelectionChange();
  updateSelectorState();
  writeUrlState();
}

function handleSubCountyChange() {
  state.selectedSubCounty = elements.subCountySelect.value.trim();
  state.selectedWard = "";
  populateWardSelect();
  clearLiveDataForSelectionChange();
  updateSelectorState();
  writeUrlState();
}

function handleWardChange() {
  state.selectedWard = elements.wardSelect.value.trim();
  clearLiveDataForSelectionChange();
  updateSelectorState();
  writeUrlState();
}

function handleReportSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.reportForm);
  const description = String(formData.get("description") || "").trim();
  if (!description) return;
  const report = {
    role: String(formData.get("role")),
    reportType: String(formData.get("reportType")),
    description,
    location: [state.selectedWard, state.selectedSubCounty, state.selectedCounty].filter(Boolean).join(", ") || "Unspecified location",
    createdAt: new Date().toISOString(),
  };
  state.reports.push(report);
  saveReports();
  elements.reportForm.reset();
  renderReports();
}

function toggleBulletinMode() {
  state.bulletinMode = !state.bulletinMode;
  document.body.classList.toggle("bulletin-mode", state.bulletinMode);
}

async function activateNationalPictureView() {
  elements.layerFilter.value = "national";
  syncViewSwitcher();
  updateSelectorState();
  if (!state.liveData) {
    await loadLiveData({ allowNationalDefault: true });
  } else {
    renderLiveData();
  }
  document.querySelector(".national-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function activateLocalView() {
  elements.layerFilter.value = state.selectedCounty ? "combined" : "local";
  syncViewSwitcher();
  updateSelectorState();
  if (state.liveData) {
    renderLiveData();
  }
  document.querySelector(".control-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function attachEventListeners() {
  elements.localViewButton.addEventListener("click", activateLocalView);
  elements.nationalViewButton.addEventListener("click", activateNationalPictureView);
  elements.countySelect.addEventListener("change", handleCountyChange);
  elements.subCountySelect.addEventListener("change", handleSubCountyChange);
  elements.wardSelect.addEventListener("change", handleWardChange);
  elements.loadButton.addEventListener("click", loadLiveData);
  elements.reportForm.addEventListener("submit", handleReportSubmit);
  elements.bulletinToggle.addEventListener("click", toggleBulletinMode);
  elements.layerFilter.addEventListener("change", () => {
    syncViewSwitcher();
    updateSelectorState();
    renderLiveData();
  });
  elements.sourceFilter.addEventListener("change", () => renderLiveData());
  elements.severityFilter.addEventListener("change", () => renderLiveData());
  elements.diseaseFilter.addEventListener("change", () => renderLiveData());
  elements.nationalPictureCard.addEventListener("click", activateNationalPictureView);
  elements.nationalPictureCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateNationalPictureView();
    }
  });
}

async function init() {
  readUrlState();
  initializeMap();
  attachEventListeners();
  renderReports();
  await loadGeography();
  if (state.selectedCounty) {
    await loadLiveData();
  }
}

init();
