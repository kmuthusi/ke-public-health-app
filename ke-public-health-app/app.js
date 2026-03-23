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
  countySelect: document.getElementById("countySelect"),
  subCountySelect: document.getElementById("subCountySelect"),
  wardSelect: document.getElementById("wardSelect"),
  loadButton: document.getElementById("loadButton"),
  bulletinToggle: document.getElementById("bulletinToggle"),
  sourceFilter: document.getElementById("sourceFilter"),
  severityFilter: document.getElementById("severityFilter"),
  diseaseFilter: document.getElementById("diseaseFilter"),
  riskHeading: document.getElementById("riskHeading"),
  riskLevelBadge: document.getElementById("riskLevelBadge"),
  riskScore: document.getElementById("riskScore"),
  confidenceValue: document.getElementById("confidenceValue"),
  freshnessValue: document.getElementById("freshnessValue"),
  locationValue: document.getElementById("locationValue"),
  reasonList: document.getElementById("reasonList"),
  timeline: document.getElementById("timeline"),
  guidanceCards: document.getElementById("guidanceCards"),
  diseaseGrid: document.getElementById("diseaseGrid"),
  facilityStatus: document.getElementById("facilityStatus"),
  facilityList: document.getElementById("facilityList"),
  bulletinContent: document.getElementById("bulletinContent"),
  sourceStatus: document.getElementById("sourceStatus"),
  reportForm: document.getElementById("reportForm"),
  reportList: document.getElementById("reportList"),
  lastUpdatedBadge: document.getElementById("lastUpdatedBadge"),
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

function getSelectedCounty() {
  return state.geography?.counties.find((county) => county.name === state.selectedCounty) || null;
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
  if (!county) return;
  for (const subCounty of county.subCounties) {
    const label =
      subCounty.matchedWardCount > 0
        ? `${subCounty.name} (${subCounty.matchedWardCount} matched wards)`
        : `${subCounty.name} (county-wide ward list fallback)`;
    elements.subCountySelect.append(createOption(subCounty.name, label));
  }
}

function populateWardSelect() {
  const county = getSelectedCounty();
  elements.wardSelect.innerHTML = "";
  elements.wardSelect.append(createOption("", county ? "Choose ward" : "Select county first"));
  if (!county) return;

  const selectedSubCounty = county.subCounties.find((item) => item.name === state.selectedSubCounty);
  const wards = selectedSubCounty?.wards?.length ? selectedSubCounty.wards : county.wards;

  for (const ward of wards) {
    const suffix =
      ward.constituencyName && (!selectedSubCounty || !selectedSubCounty.wards?.length)
        ? ` (${ward.constituencyName})`
        : "";
    elements.wardSelect.append(createOption(ward.name, `${ward.name}${suffix}`));
  }
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

function initializeMap() {
  state.map = L.map("map", {
    zoomControl: true,
    minZoom: 5,
  }).setView([0.0236, 37.9062], 6);

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
    const li = document.createElement("li");
    li.textContent = "Select a location to load current official and supporting signals.";
    elements.reasonList.append(li);
    return;
  }
  reasons.forEach((reason) => {
    const li = document.createElement("li");
    li.textContent = reason;
    elements.reasonList.append(li);
  });
}

function renderTimeline(alerts) {
  clearChildren(elements.timeline);
  if (!alerts?.length) {
    elements.timeline.innerHTML = '<div class="timeline-item">No live updates loaded yet.</div>';
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
        <div class="stack-meta">${alert.sourceFamily || "Source"} • ${alert.sourceName} • ${alert.publishedLabel || "Live fetch, publication time not exposed"} • ${
          alert.disease ? `Disease: ${alert.disease}` : "General public health update"
        }</div>
        <p>${alert.summary || "Live source update fetched through the app proxy."}</p>
        <a href="${alert.url}" target="_blank" rel="noreferrer">Open source</a>
      `;
      elements.timeline.append(card);
    });
}

function renderGuidance(cards) {
  clearChildren(elements.guidanceCards);
  if (!cards?.length) {
    elements.guidanceCards.innerHTML = '<div class="stack-card">No guidance available yet.</div>';
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
    `;
    elements.guidanceCards.append(node);
  });
}

function renderDiseaseGrid(alerts) {
  clearChildren(elements.diseaseGrid);
  const grouped = new Map();
  alerts?.forEach((alert) => {
    const disease = alert.disease || "general";
    if (!grouped.has(disease)) grouped.set(disease, []);
    grouped.get(disease).push(alert);
  });

  if (!grouped.size) {
    elements.diseaseGrid.innerHTML = '<article class="disease-card">Disease-specific drilldowns will appear after live data is loaded.</article>';
    return;
  }

  for (const [disease, items] of grouped.entries()) {
    const card = document.createElement("article");
    card.className = "disease-card";
    const severities = items.map((item) => item.severity || "guarded");
    const topSeverity = severities.includes("high")
      ? "high"
      : severities.includes("elevated")
        ? "elevated"
        : "guarded";
    card.innerHTML = `
      <div class="stack-title">
        <strong>${disease === "general" ? "General public health" : disease}</strong>
        <span class="status-badge ${topSeverity}">${topSeverity}</span>
      </div>
      <p>${items.length} linked signal${items.length === 1 ? "" : "s"} from current live fetch.</p>
      <p class="stack-meta">${items[0].sourceFamily || "Source"} • ${items[0].title}</p>
    `;
    elements.diseaseGrid.append(card);
  }
}

function renderFacilities(facilities) {
  elements.facilityStatus.textContent =
    facilities?.status === "ok"
      ? `Live facility adapter status: ok${facilities.source ? ` • ${facilities.source}` : ""}`
      : "Live facility adapter status: unavailable. The app is still usable, but registry access is reduced.";

  clearChildren(elements.facilityList);
  if (!facilities?.items?.length) {
    elements.facilityList.innerHTML =
      '<div class="stack-card">No facility records were returned for the selected location query. This can happen when the official registry endpoint is unavailable or the county filter does not match the current response schema.</div>';
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
      <div class="stack-meta">${[facility.ward, facility.subCounty, facility.county].filter(Boolean).join(" • ")}</div>
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

function renderBulletin(bulletin) {
  if (!bulletin) {
    elements.bulletinContent.innerHTML = "<p>Load a location to generate a bulletin summary.</p>";
    return;
  }
  elements.bulletinContent.innerHTML = `
    <h3>${bulletin.headline}</h3>
    <p>${bulletin.summary.join(" ")}</p>
    <p><strong>Immediate actions</strong></p>
    <ul class="detail-list">${bulletin.actions.map((action) => `<li>${action}</li>`).join("")}</ul>
  `;
}

function renderReports() {
  clearChildren(elements.reportList);
  if (!state.reports.length) {
    elements.reportList.innerHTML =
      '<div class="stack-card">No community reports saved yet. Local reports are stored only in this browser and remain labeled as unverified.</div>';
    return;
  }

  [...state.reports]
    .reverse()
    .forEach((report) => {
      const node = document.createElement("article");
      node.className = "stack-card";
      node.innerHTML = `
        <div class="stack-title">
          <strong>${report.reportType}</strong>
          <span class="pill pill-muted">Unverified community report</span>
        </div>
        <div class="stack-meta">${report.role} • ${report.location} • ${new Date(report.createdAt).toLocaleString()}</div>
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

function renderSourceFilterOptions(alerts) {
  const values = new Set(["all"]);
  alerts?.forEach((alert) => {
    if (alert.sourceFamily) values.add(alert.sourceFamily);
  });
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
    L.marker([center.lat, center.lon])
      .addTo(state.markersLayer)
      .bindPopup(`<strong>${locationLabel}</strong><br />Selected location center`);
  } else {
    state.map.setView([0.0236, 37.9062], 6);
  }

  const alerts = (liveData?.alerts || [])
    .filter((item) => elements.sourceFilter.value === "all" || item.sourceFamily === elements.sourceFilter.value)
    .filter((item) => elements.severityFilter.value === "all" || item.severity === elements.severityFilter.value)
    .filter((item) => elements.diseaseFilter.value === "all" || item.disease === elements.diseaseFilter.value);

  alerts.forEach((alert, index) => {
    if (!center?.lat || !center?.lon) return;
    const lat = center.lat + (index % 3) * 0.06 - 0.06;
    const lon = center.lon + Math.floor(index / 3) * 0.06 - 0.06;
    L.circleMarker([lat, lon], {
      radius: 9,
      color: alert.severity === "high" ? "#bf4b2c" : alert.severity === "elevated" ? "#db7c26" : "#0d8c6c",
      fillOpacity: 0.75,
      weight: 2,
    })
      .addTo(state.markersLayer)
      .bindPopup(
        `<strong>${alert.title}</strong><br/>${alert.sourceName}<br/>${alert.publishedLabel || "Publication time unavailable"}<br/>${
          alert.sourceFamily || "Source"
        }<br/>${
          alert.disease || "General public health"
        }`
      );
  });

  const facilities = liveData?.facilities?.items || [];
  facilities.slice(0, 8).forEach((facility) => {
    if (!facility.lat || !facility.lon) return;
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
}

function renderLiveData() {
  const liveData = state.liveData;
  const risk = liveData?.risk;
  elements.riskHeading.textContent = risk
    ? `${risk.level.toUpperCase()} risk watch for ${liveData.location.label}`
    : "Choose a location to begin";
  elements.riskLevelBadge.className = `status-badge ${risk?.level || "neutral"}`;
  elements.riskLevelBadge.textContent = risk?.level || "No data";
  elements.riskScore.textContent = risk ? String(risk.score) : "--";
  elements.confidenceValue.textContent = risk?.confidence || "--";
  elements.freshnessValue.textContent = risk?.freshness || "--";
  elements.locationValue.textContent = liveData?.location?.label || "--";
  elements.lastUpdatedBadge.textContent = liveData?.generatedAt
    ? `Live fetch ${new Date(liveData.generatedAt).toLocaleString()}`
    : "Awaiting live data";

  renderReasons(risk?.reasons || []);
  renderSourceFilterOptions(liveData?.alerts || []);
  renderDiseaseFilterOptions(liveData?.alerts || []);
  renderTimeline(liveData?.alerts || []);
  renderGuidance(liveData?.guidance || []);
  renderDiseaseGrid(liveData?.alerts || []);
  renderFacilities(liveData?.facilities || null);
  renderSources(liveData?.sourceStatus || []);
  renderBulletin(liveData?.bulletin || null);
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
}

async function loadLiveData() {
  if (!state.selectedCounty) {
    window.alert("Please select at least a county first.");
    return;
  }

  const params = new URLSearchParams({
    county: state.selectedCounty,
    subCounty: state.selectedSubCounty,
    ward: state.selectedWard,
  });
  elements.loadButton.disabled = true;
  elements.loadButton.textContent = "Loading...";
  try {
    state.liveData = await fetchJson(`/api/live?${params.toString()}`);
    renderLiveData();
  } catch (error) {
    elements.reasonList.innerHTML = `<li>Unable to load live data: ${error.message}</li>`;
  } finally {
    elements.loadButton.disabled = false;
    elements.loadButton.textContent = "Load live risk view";
  }
}

function handleCountyChange() {
  state.selectedCounty = elements.countySelect.value;
  state.selectedSubCounty = "";
  state.selectedWard = "";
  populateSubCountySelect();
  populateWardSelect();
  writeUrlState();
}

function handleSubCountyChange() {
  state.selectedSubCounty = elements.subCountySelect.value;
  state.selectedWard = "";
  populateWardSelect();
  writeUrlState();
}

function handleWardChange() {
  state.selectedWard = elements.wardSelect.value;
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

function attachEventListeners() {
  elements.countySelect.addEventListener("change", handleCountyChange);
  elements.subCountySelect.addEventListener("change", handleSubCountyChange);
  elements.wardSelect.addEventListener("change", handleWardChange);
  elements.loadButton.addEventListener("click", loadLiveData);
  elements.reportForm.addEventListener("submit", handleReportSubmit);
  elements.bulletinToggle.addEventListener("click", toggleBulletinMode);
  elements.sourceFilter.addEventListener("change", () => renderLiveData());
  elements.severityFilter.addEventListener("change", () => renderLiveData());
  elements.diseaseFilter.addEventListener("change", () => renderLiveData());
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
