import json
import os
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PORT = int(os.environ.get("PORT", "8000"))

REMOTE_HEADERS = {
    "User-Agent": "KenyaPublicHealthRiskApp/1.0 (+https://health.go.ke)",
    "Accept": "application/json, text/html;q=0.9, */*;q=0.8",
}

MOH_BASE_URL = "https://www.health.go.ke/"
MOH_HOME_URL = "https://www.health.go.ke/"
MOH_DISEASE_PAGES = {
    "cholera": "https://www.health.go.ke/taxonomy/term/52",
    "covid-19": "https://www.health.go.ke/taxonomy/term/6",
    "ebola": "https://www.health.go.ke/taxonomy/term/53",
    "mpox": "https://www.health.go.ke/taxonomy/term/54",
}
WHO_KENYA_NEWS_URL = "https://www.afro.who.int/countries/kenya/news"
WHO_EMERGENCIES_URL = "https://www.who.int/emergencies/situations"
RELIEFWEB_REPORTS_URL = "https://api.reliefweb.int/v2/reports?appname=ke-public-health-app"
UNICEF_KENYA_HEALTH_URL = "https://www.unicef.org/kenya/topics/health"
KENYA_REDCROSS_HOME_URL = "https://www.redcross.or.ke/"
CDC_KENYA_URL = "https://www.cdc.gov/global-health/countries/kenya.html"
CDC_717_KENYA_URL = "https://www.cdc.gov/global-health/impact/7-1-7-disease-detection.html"
KEMRI_HOME_URL = "https://www.kemri.go.ke/"
KEMRI_MPOX_URL = "https://www.kemri.go.ke/understanding-mpox-what-you-need-to-know-about-the-emerging-virus/"
KEMRI_PBIDS_URL = "https://pbids.kemri.go.ke/"
COUNTY_SOURCE_REGISTRY = {
    "Nairobi": {
        "name": "Nairobi City County",
        "url": "https://nairobi.go.ke/",
    },
    "Kakamega": {
        "name": "County Government of Kakamega",
        "url": "https://kakamega.go.ke/",
    },
    "Nakuru": {
        "name": "County Government of Nakuru",
        "url": "https://nakuru.go.ke/department-of-health-services/",
    },
    "Mombasa": {
        "name": "Mombasa County",
        "url": "https://web.mombasa.go.ke/health/",
    },
    "Kisumu": {
        "name": "County Government of Kisumu",
        "url": "https://www.kisumu.go.ke/",
    },
    "Kilifi": {
        "name": "Kilifi County",
        "url": "https://invest.kilifi.go.ke/health-services/",
    },
}
KMHFR_CANDIDATE_URLS = [
    "https://kmhfr.health.go.ke/api/facilities/facilities/",
    "https://kmhfl.health.go.ke/api/facilities/facilities/",
]
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers=REMOTE_HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def fetch_json(url: str):
    request = urllib.request.Request(url, headers=REMOTE_HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return json.loads(response.read().decode(charset, errors="replace"))


def try_fetch_json(url: str):
    try:
        return fetch_json(url), None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)


class MohHomeParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self._current_link = None
        self._collect_title = False
        self._current_title = []
        self._pending_date = None

    def handle_starttag(self, tag, attrs):
        attr_map = dict(attrs)
        if tag == "a" and attr_map.get("href", "").startswith("/node/"):
            self._current_link = urllib.parse.urljoin(MOH_BASE_URL, attr_map["href"])
            self._collect_title = True
            self._current_title = []

    def handle_endtag(self, tag):
        if tag == "a" and self._collect_title and self._current_link:
            title = " ".join("".join(self._current_title).split())
            if title and "Ministry of Health" not in title:
                self.items.append(
                    {
                        "title": title,
                        "url": self._current_link,
                        "publishedLabel": self._pending_date,
                    }
                )
            self._current_link = None
            self._collect_title = False
            self._current_title = []

    def handle_data(self, data):
        stripped = " ".join(data.split())
        if not stripped:
            return
        if re.match(r"\d{1,2}\s\w+,\s\d{4}", stripped):
            self._pending_date = stripped
        if self._collect_title:
            self._current_title.append(stripped)


@dataclass
class DiseaseRecord:
    slug: str
    name: str
    guidance: list[str]


DISEASE_GUIDANCE = {
    "cholera": DiseaseRecord(
        slug="cholera",
        name="Cholera",
        guidance=[
            "Boil or treat drinking water and store it in clean, covered containers.",
            "Wash hands with soap after toilet use and before preparing food.",
            "Seek care quickly for severe diarrhea or dehydration.",
        ],
    ),
    "mpox": DiseaseRecord(
        slug="mpox",
        name="Mpox",
        guidance=[
            "Limit close contact with anyone who has a new unexplained rash.",
            "Report suspected cases through official health channels promptly.",
            "Follow current MOH isolation and contact guidance where advised.",
        ],
    ),
    "ebola": DiseaseRecord(
        slug="ebola",
        name="Ebola",
        guidance=[
            "Report suspected hemorrhagic fever symptoms immediately through official channels.",
            "Avoid direct contact with body fluids of symptomatic individuals.",
            "Follow official screening and travel guidance in affected areas.",
        ],
    ),
    "covid-19": DiseaseRecord(
        slug="covid-19",
        name="COVID-19",
        guidance=[
            "Stay home when ill and reduce close contact in crowded indoor settings.",
            "Follow any current MOH vaccination, testing, or masking advisories.",
            "Seek care early if breathing difficulty or severe symptoms develop.",
        ],
    ),
    "malaria": DiseaseRecord(
        slug="malaria",
        name="Malaria",
        guidance=[
            "Sleep under treated nets and reduce standing water near homes where possible.",
            "Seek testing promptly for fever, especially in high-transmission settings.",
            "Follow county and facility guidance on seasonal malaria prevention.",
        ],
    ),
    "measles": DiseaseRecord(
        slug="measles",
        name="Measles",
        guidance=[
            "Check child vaccination status and follow any local catch-up campaign guidance.",
            "Seek clinical advice for fever with rash, cough, or red eyes.",
            "Report suspected school or household clusters promptly.",
        ],
    ),
}


def detect_disease(text: str) -> str | None:
    normalized = text.lower()
    if "cholera" in normalized:
        return "cholera"
    if "mpox" in normalized:
        return "mpox"
    if "ebola" in normalized:
        return "ebola"
    if "covid" in normalized:
        return "covid-19"
    if "malaria" in normalized:
        return "malaria"
    if "measles" in normalized:
        return "measles"
    if "flood" in normalized:
        return "flooding"
    return None


def derive_severity(text: str) -> str:
    normalized = text.lower()
    if any(token in normalized for token in ["outbreak", "emergency", "severe", "warning"]):
        return "high"
    if any(token in normalized for token in ["alert", "advisory", "response", "update"]):
        return "elevated"
    return "guarded"


def build_alert_item(
    *,
    title: str,
    url: str,
    source_name: str,
    source_family: str,
    source_category: str,
    published_label: str | None = None,
    summary: str | None = None,
    official: bool = True,
    kind: str = "update",
):
    disease = detect_disease(" ".join(filter(None, [title, summary or ""])))
    return {
        "id": slugify(f"{source_family}-{title}-{published_label or ''}"),
        "title": title,
        "url": url,
        "publishedLabel": published_label,
        "sourceName": source_name,
        "sourceFamily": source_family,
        "sourceCategory": source_category,
        "official": official,
        "disease": disease,
        "severity": derive_severity(" ".join(filter(None, [title, summary or ""]))),
        "kind": kind,
        "summary": summary,
    }


def derive_risk_band(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 40:
        return "elevated"
    if score >= 20:
        return "guarded"
    return "minimal"


def summarize_confidence(signals: list[dict]) -> str:
    if not signals:
        return "low"
    official_count = sum(1 for signal in signals if signal.get("official"))
    if official_count >= 2:
        return "high"
    if official_count == 1:
        return "medium"
    return "low"


def parse_moh_home_updates():
    html = fetch_text(MOH_HOME_URL)
    parser = MohHomeParser()
    parser.feed(html)
    seen = set()
    items = []
    for item in parser.items:
        key = (item["title"], item["url"])
        if key in seen:
            continue
        seen.add(key)
        items.append(
            build_alert_item(
                title=item["title"],
                url=item["url"],
                published_label=item["publishedLabel"],
                source_name="Kenya Ministry of Health",
                source_family="MOH",
                source_category="Government",
                official=True,
                kind="news-update",
            )
        )
    return items[:18]


def fetch_disease_pages():
    pages = []
    for slug, url in MOH_DISEASE_PAGES.items():
        try:
            html = fetch_text(url)
            pages.append(
                build_alert_item(
                    title=f"MOH {slug.replace('-', ' ').title()} guidance page",
                    url=url,
                    published_label=None,
                summary=re.sub(r"\s+", " ", html[:600]).strip(),
                source_name="Kenya Ministry of Health",
                source_family="MOH",
                source_category="Government",
                official=True,
                kind="guidance-page",
            )
            )
        except Exception:
            continue
    return pages


def parse_who_kenya_news():
    html = fetch_text(WHO_KENYA_NEWS_URL)
    pattern = re.compile(
        r'<a[^>]+href="(?P<href>/countries/kenya/news/[^"]+)"[^>]*>(?P<title>[^<]+)</a>.*?(?P<date>\d{2}\s+[A-Za-z]+\s+\d{4})',
        re.IGNORECASE | re.DOTALL,
    )
    items = []
    seen = set()
    for match in pattern.finditer(html):
        title = " ".join(match.group("title").split())
        href = urllib.parse.urljoin("https://www.afro.who.int", match.group("href"))
        if href in seen or len(title) < 12:
            continue
        seen.add(href)
        items.append(
            build_alert_item(
                title=title,
                url=href,
                published_label=match.group("date"),
                source_name="WHO Regional Office for Africa",
                source_family="WHO",
                source_category="UN Agency",
                official=True,
                kind="country-news",
            )
        )
    return items[:12]


def parse_who_emergencies():
    html = fetch_text(WHO_EMERGENCIES_URL)
    items = []
    for disease in ["Cholera", "Mpox", "COVID-19"]:
        if disease.lower() in html.lower():
            items.append(
                build_alert_item(
                    title=f"WHO emergencies situation page includes {disease}",
                    url=WHO_EMERGENCIES_URL,
                    published_label=None,
                    summary="WHO ongoing emergencies reference page for major public health events.",
                    source_name="World Health Organization",
                    source_family="WHO",
                    source_category="UN Agency",
                    official=True,
                    kind="emergency-reference",
                )
            )
    return items[:6]


def fetch_reliefweb_reports():
    payload = {
        "preset": "latest",
        "limit": 8,
        "profile": "full",
        "query": {
            "operator": "AND",
            "value": [
                {"field": "country.name", "value": "Kenya"},
                {"field": "theme.name", "value": "Health"},
            ],
        },
        "fields": {
            "include": [
                "title",
                "body",
                "date.created",
                "source.name",
                "source.shortname",
                "origin",
                "file",
            ]
        },
    }
    request = urllib.request.Request(
        RELIEFWEB_REPORTS_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={**REMOTE_HEADERS, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))

    items = []
    for row in data.get("data", []):
        fields = row.get("fields", {})
        sources = fields.get("source") or []
        source_name = ", ".join(source.get("shortname") or source.get("name") or "" for source in sources if source) or "ReliefWeb"
        summary = re.sub(r"\s+", " ", (fields.get("body") or "")[:300]).strip()
        items.append(
            build_alert_item(
                title=fields.get("title") or "ReliefWeb health report",
                url=row.get("href") or "https://reliefweb.int/",
                published_label=fields.get("date", {}).get("created"),
                summary=summary,
                source_name=source_name,
                source_family="UN",
                source_category="UN Network",
                official=False,
                kind="reliefweb-report",
            )
        )
    return items


def parse_unicef_health_page():
    html = fetch_text(UNICEF_KENYA_HEALTH_URL)
    pattern = re.compile(
        r'(?P<date>\d{2}\s+[A-Za-z]+\s+\d{4}).{0,120}?<a[^>]+href="(?P<href>/kenya/[^"]+)"[^>]*>\s*(?P<title>[^<]+?)\s*</a>',
        re.IGNORECASE | re.DOTALL,
    )
    items = []
    seen = set()
    for match in pattern.finditer(html):
        title = " ".join(match.group("title").split())
        href = urllib.parse.urljoin("https://www.unicef.org", match.group("href"))
        if href in seen or len(title) < 8:
            continue
        seen.add(href)
        items.append(
            build_alert_item(
                title=title,
                url=href,
                published_label=match.group("date"),
                source_name="UNICEF Kenya",
                source_family="UN",
                source_category="UN Agency",
                official=True,
                kind="unicef-health",
            )
        )
    return items[:8]


def parse_kenya_redcross_home():
    html = fetch_text(KENYA_REDCROSS_HOME_URL)
    pattern = re.compile(
        r"Read Article.*?(?P<title>Responding to Drought and Spearheading Relief|Community voices at the forefront: Men leading behaviour change to combat Antimicrobial Resistance \(AMR\)|Communities on the Frontline: Eight PREPARE Success Stories Strengthening Epidemic Preparedness in Kenya|Non-Communicable Disease Support Groups improve Health Outcomes\.|Door-Door Hope: How the measles & Rubella Response Reached Vulnerable Families\.)",
        re.DOTALL,
    )
    items = []
    seen = set()
    for match in pattern.finditer(html):
        title = " ".join(match.group("title").split())
        if title in seen:
            continue
        seen.add(title)
        items.append(
            build_alert_item(
                title=title,
                url=KENYA_REDCROSS_HOME_URL,
                published_label=None,
                summary="Kenya Red Cross latest impact and public health related update.",
                source_name="Kenya Red Cross Society",
                source_family="Kenya Red Cross",
                source_category="Humanitarian",
                official=False,
                kind="krcs-update",
            )
        )
    if not items and "latest updates" in html.lower():
        items.append(
            build_alert_item(
                title="Kenya Red Cross latest updates",
                url=KENYA_REDCROSS_HOME_URL,
                published_label=None,
                summary="Latest update block on the Kenya Red Cross homepage.",
                source_name="Kenya Red Cross Society",
                source_family="Kenya Red Cross",
                source_category="Humanitarian",
                official=False,
                kind="krcs-update",
            )
        )
    return items[:8]


def parse_cdc_kenya_sources():
    sources = [
        (
            CDC_KENYA_URL,
            "CDC Kenya country page",
            "CDC country program update for Kenya.",
        ),
        (
            CDC_717_KENYA_URL,
            "CDC disease detection and response case study",
            "CDC global health disease detection reference that includes Kenya response content.",
        ),
    ]
    items = []
    for url, title, fallback_summary in sources:
        try:
            html = fetch_text(url)
            summary_match = re.search(r"<main[^>]*>(.*?)</main>", html, re.IGNORECASE | re.DOTALL)
            summary_source = summary_match.group(1) if summary_match else html
            summary = re.sub(r"<[^>]+>", " ", summary_source)
            summary = re.sub(r"\s+", " ", summary).strip()[:320] or fallback_summary
            items.append(
                build_alert_item(
                    title=title,
                    url=url,
                    published_label=None,
                    summary=summary,
                    source_name="US CDC",
                    source_family="CDC",
                    source_category="US Government",
                    official=True,
                    kind="cdc-kenya",
                )
            )
        except Exception:
            continue
    return items


def parse_kemri_sources():
    sources = [
        (
            KEMRI_HOME_URL,
            "KEMRI research and public health updates",
            "KEMRI national health research overview and news page.",
        ),
        (
            KEMRI_MPOX_URL,
            "KEMRI mpox public health explainer",
            "KEMRI explainer on mpox and public health awareness.",
        ),
        (
            KEMRI_PBIDS_URL,
            "KEMRI population-based infectious disease surveillance",
            "KEMRI surveillance program reference page.",
        ),
    ]
    items = []
    for url, title, fallback_summary in sources:
        try:
            html = fetch_text(url)
            summary = re.sub(r"<[^>]+>", " ", html)
            summary = re.sub(r"\s+", " ", summary).strip()[:320] or fallback_summary
            items.append(
                build_alert_item(
                    title=title,
                    url=url,
                    published_label=None,
                    summary=summary,
                    source_name="Kenya Medical Research Institute",
                    source_family="KEMRI",
                    source_category="Research Institute",
                    official=True,
                    kind="kemri-update",
                )
            )
        except Exception:
            continue
    return items


def parse_county_government_updates(county: str):
    config = COUNTY_SOURCE_REGISTRY.get(county)
    if not config:
        return []

    try:
        html = fetch_text(config["url"])
    except Exception:
        return []

    health_keywords = [
        "health",
        "hospital",
        "clinic",
        "vaccine",
        "vaccination",
        "public health",
        "sha",
        "disease",
        "malaria",
        "cholera",
        "measles",
        "outbreak",
    ]
    title_matches = re.findall(r">([^<>]{12,180})<", html)
    items = []
    seen = set()
    for raw_title in title_matches:
        title = " ".join(raw_title.split())
        lowered = title.lower()
        if title in seen:
            continue
        if not any(keyword in lowered for keyword in health_keywords):
            continue
        if len(title) < 12:
            continue
        seen.add(title)
        items.append(
            build_alert_item(
                title=title,
                url=config["url"],
                published_label=None,
                summary=f"County government health-related update pulled from {config['name']}.",
                source_name=config["name"],
                source_family="County Government",
                source_category="County Government",
                official=True,
                kind="county-update",
            )
        )
        if len(items) >= 6:
            break

    if not items:
        items.append(
            build_alert_item(
                title=f"{config['name']} official health page",
                url=config["url"],
                published_label=None,
                summary="Official county-government health-related page used as a live local source reference.",
                source_name=config["name"],
                source_family="County Government",
                source_category="County Government",
                official=True,
                kind="county-reference",
            )
        )

    return items


def geocode_location(query: str):
    params = urllib.parse.urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "limit": 1,
            "addressdetails": 1,
        }
    )
    results = fetch_json(f"{NOMINATIM_SEARCH_URL}?{params}")
    if not results:
        return None
    item = results[0]
    return {
        "lat": float(item["lat"]),
        "lon": float(item["lon"]),
        "displayName": item.get("display_name"),
    }


def alert_matches_location(alert: dict, county: str, sub_county: str, ward: str) -> bool:
    haystack = " ".join(
        [
            alert.get("title") or "",
            alert.get("summary") or "",
            alert.get("publishedLabel") or "",
        ]
    ).lower()
    parts = [ward.lower().strip(), sub_county.lower().strip(), county.lower().strip()]
    return any(part and part in haystack for part in parts)


def choose_diverse_supplemental_alerts(alerts: list[dict], selected: list[dict], limit: int = 12) -> list[dict]:
    seen = {(item.get("title"), item.get("url"), item.get("sourceFamily")) for item in selected}
    result = list(selected)
    represented_families = {item.get("sourceFamily") for item in selected}

    for alert in alerts:
        key = (alert.get("title"), alert.get("url"), alert.get("sourceFamily"))
        family = alert.get("sourceFamily")
        if key in seen:
            continue
        if family not in represented_families:
            result.append(alert)
            seen.add(key)
            represented_families.add(family)
        if len(result) >= limit:
            return result[:limit]

    for alert in alerts:
        key = (alert.get("title"), alert.get("url"), alert.get("sourceFamily"))
        if key in seen:
            continue
        result.append(alert)
        seen.add(key)
        if len(result) >= limit:
            break

    return result[:limit]


def choose_national_picture_alerts(alerts: list[dict], location_matched_alerts: list[dict], limit: int = 12) -> list[dict]:
    seen = {(item.get("title"), item.get("url"), item.get("sourceFamily")) for item in location_matched_alerts}
    result = []
    represented_families = set()

    for alert in alerts:
        key = (alert.get("title"), alert.get("url"), alert.get("sourceFamily"))
        family = alert.get("sourceFamily")
        if key in seen:
            continue
        if family not in represented_families:
            result.append(alert)
            represented_families.add(family)
            seen.add(key)
        if len(result) >= limit:
            return result[:limit]

    for alert in alerts:
        key = (alert.get("title"), alert.get("url"), alert.get("sourceFamily"))
        if key in seen:
            continue
        result.append(alert)
        seen.add(key)
        if len(result) >= limit:
            break

    return result[:limit]


def search_facilities(county: str, query: str | None = None):
    errors = []
    for base_url in KMHFR_CANDIDATE_URLS:
        params = {"is_published": "true"}
        if query:
            params["search"] = query
        url = f"{base_url}?{urllib.parse.urlencode(params)}"
        data, error = try_fetch_json(url)
        if error:
            errors.append({"url": base_url, "error": error})
            continue

        results = data.get("results", data if isinstance(data, list) else [])
        trimmed = []
        for item in results[:100]:
            location_text = " ".join(
                filter(
                    None,
                    [
                        str(item.get("county") or ""),
                        str(item.get("sub_county") or item.get("subcounty") or ""),
                        str(item.get("ward") or ""),
                    ],
                )
            ).lower()
            if county.lower() not in location_text and query and county.lower() not in query.lower():
                continue
            trimmed.append(
                {
                    "id": str(item.get("id") or item.get("code") or ""),
                    "name": item.get("name") or item.get("official_name") or "Unnamed facility",
                    "type": item.get("facility_type_name") or item.get("facility_type") or "Health facility",
                    "county": item.get("county"),
                    "subCounty": item.get("sub_county") or item.get("subcounty"),
                    "ward": item.get("ward"),
                    "lat": item.get("lat") or item.get("latitude"),
                    "lon": item.get("lng") or item.get("longitude") or item.get("long"),
                    "phone": item.get("phone") or item.get("facility_contacts"),
                    "source": base_url,
                }
            )
        return {
            "status": "ok",
            "items": trimmed[:25],
            "source": base_url,
            "errors": errors,
        }

    return {
        "status": "unavailable",
        "items": [],
        "source": None,
        "errors": errors,
    }


def build_local_guidance(selected_location: dict, location_alerts: list[dict], display_alerts: list[dict]):
    disease_map = {}
    for alert in location_alerts:
        disease = alert.get("disease")
        if disease in DISEASE_GUIDANCE:
            disease_map[disease] = DISEASE_GUIDANCE[disease]

    if not disease_map:
        source_families = sorted({alert.get("sourceFamily") for alert in display_alerts if alert.get("sourceFamily")})
        matched_families = sorted({alert.get("sourceFamily") for alert in location_alerts if alert.get("sourceFamily")})
        county_found = any(alert.get("sourceFamily") == "County Government" for alert in location_alerts)
        outbreak_like = [
            alert
            for alert in location_alerts
            if alert.get("severity") in {"high", "elevated"}
            or any(
                token in " ".join(filter(None, [alert.get("title"), alert.get("summary")])).lower()
                for token in ["outbreak", "cholera", "mpox", "measles", "ebola", "cluster", "emergency", "surveillance"]
            )
        ]
        moh_count = sum(1 for alert in location_alerts if alert.get("sourceFamily") == "MOH")
        who_count = sum(1 for alert in location_alerts if alert.get("sourceFamily") == "WHO")
        science_count = sum(
            1 for alert in location_alerts if alert.get("sourceFamily") in {"CDC", "KEMRI"}
        )

        actions = []
        note_parts = []

        if county_found:
            actions.append("Check county-government notices first for location-specific service changes, campaigns, or local public health instructions.")
            note_parts.append("county-government signals found")

        if moh_count >= max(who_count, science_count, 1):
            actions.append("Prioritize MOH and county guidance for actions in this area because current local context is driven mostly by government-source notices.")
            note_parts.append("MOH-led context")
        elif who_count > max(moh_count, science_count):
            actions.append("Treat the current picture as WHO-led regional or national context and confirm any local action through MOH or county channels before acting.")
            note_parts.append("WHO-led context")
        elif science_count > 0:
            actions.append("Use CDC and KEMRI items mainly as surveillance or scientific context and wait for MOH or county instructions for location-specific action.")
            note_parts.append("CDC/KEMRI-led context")

        if outbreak_like:
            actions.append("Current matched signals look more outbreak-like than routine notices, so monitor official updates closely and escalate quickly if local symptoms or clusters are present.")
            note_parts.append("outbreak-like matched signals")
        elif location_alerts:
            actions.append("Current matched signals look more like general health notices than named outbreaks, so keep monitoring source updates and routine prevention guidance.")
            note_parts.append("general matched notices")
        else:
            actions.append("No live alert directly named this selected location during the latest fetch, so use this as situational awareness rather than a confirmed local outbreak status.")
            note_parts.append("no direct location match")

        actions.append("If urgent symptoms, unusual clusters, or severe illness are present locally, seek care or contact official health services promptly.")

        return [
            {
                "disease": "General local guidance",
                "scope": selected_location["label"],
                "actions": actions,
                "sourceType": "fallback guidance because no disease-specific alerts matched this location directly",
                "note": (
                    f"Matched source context: {', '.join(matched_families) if matched_families else 'none'} | "
                    f"Display sources: {', '.join(source_families) if source_families else 'none'} | "
                    f"Assessment: {', '.join(note_parts)}"
                ),
            }
        ]

    guidance_cards = []
    for disease, record in disease_map.items():
        guidance_cards.append(
            {
                "disease": record.name,
                "scope": selected_location["label"],
                "actions": record.guidance,
                "sourceType": "official-linked guidance and local risk rules",
            }
        )
    return guidance_cards


def build_risk_summary(selected_location: dict, alerts: list[dict], facilities: dict):
    score = 18
    reasons = []

    for alert in alerts:
        severity = alert.get("severity")
        if severity == "high":
            score += 28
        elif severity == "elevated":
            score += 16
        else:
            score += 8

        if alert.get("official"):
            score += 8
        if alert.get("sourceFamily") == "WHO":
            score += 6
        if alert.get("sourceFamily") == "UN":
            score += 4
        if alert.get("sourceFamily") == "Kenya Red Cross":
            score += 3
        if alert.get("sourceFamily") == "CDC":
            score += 4
        if alert.get("sourceFamily") == "KEMRI":
            score += 4
        if alert.get("sourceFamily") == "County Government":
            score += 5
        if alert.get("disease"):
            reasons.append(f"{alert.get('sourceFamily', 'Source')} {alert['disease']} signal: {alert['title']}")
        else:
            reasons.append(f"{alert.get('sourceFamily', 'Source')} update: {alert['title']}")

    if facilities.get("status") == "unavailable":
        reasons.append("Facility registry data is currently unavailable, reducing confidence.")
    elif not facilities.get("items"):
        reasons.append("No facility records matched the selected location query.")
    else:
        score += min(len(facilities["items"]), 5)
        reasons.append(f"Facility access context found from registry results: {len(facilities['items'])} records.")

    score = max(0, min(score, 100))
    return {
        "location": selected_location["label"],
        "score": score,
        "level": derive_risk_band(score),
        "confidence": summarize_confidence(alerts),
        "freshness": "current" if alerts else "limited",
        "reasons": reasons[:6],
    }


def build_live_payload(county: str, sub_county: str, ward: str):
    label_parts = [part for part in [ward, sub_county, county, "Kenya"] if part]
    label = ", ".join(label_parts)
    location = {"county": county, "subCounty": sub_county, "ward": ward, "label": label}

    source_status = []
    alerts = []
    try:
        alerts.extend(parse_moh_home_updates())
        source_status.append(
            {
                "source": "Kenya Ministry of Health homepage",
                "status": "ok",
                "detail": "Fetched current homepage updates.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "Kenya Ministry of Health homepage",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        alerts.extend(fetch_disease_pages())
        source_status.append(
            {
                "source": "MOH disease pages",
                "status": "ok",
                "detail": "Fetched current disease information pages.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "MOH disease pages",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        alerts.extend(parse_who_kenya_news())
        source_status.append(
            {
                "source": "WHO Kenya news",
                "status": "ok",
                "detail": "Fetched WHO Kenya country updates.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "WHO Kenya news",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        alerts.extend(parse_who_emergencies())
        source_status.append(
            {
                "source": "WHO emergencies page",
                "status": "ok",
                "detail": "Fetched WHO emergencies reference signals.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "WHO emergencies page",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        alerts.extend(fetch_reliefweb_reports())
        source_status.append(
            {
                "source": "ReliefWeb API",
                "status": "ok",
                "detail": "Fetched latest Kenya health reports from ReliefWeb API.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "ReliefWeb API",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        alerts.extend(parse_unicef_health_page())
        source_status.append(
            {
                "source": "UNICEF Kenya health page",
                "status": "ok",
                "detail": "Fetched UNICEF Kenya health topic updates.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "UNICEF Kenya health page",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        alerts.extend(parse_kenya_redcross_home())
        source_status.append(
            {
                "source": "Kenya Red Cross website",
                "status": "ok",
                "detail": "Fetched Kenya Red Cross latest update block.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "Kenya Red Cross website",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        county_alerts = parse_county_government_updates(county)
        alerts.extend(county_alerts)
        source_status.append(
            {
                "source": "County government source",
                "status": "ok" if county_alerts else "error",
                "detail": f"Fetched county-government health signals for {county}."
                if county_alerts
                else f"No county-government source is configured or reachable yet for {county}.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "County government source",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        cdc_alerts = parse_cdc_kenya_sources()
        alerts.extend(cdc_alerts)
        source_status.append(
            {
                "source": "CDC Kenya sources",
                "status": "ok" if cdc_alerts else "error",
                "detail": "Fetched CDC Kenya and CDC global-health references."
                if cdc_alerts
                else "CDC Kenya sources were not reachable during this fetch.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "CDC Kenya sources",
                "status": "error",
                "detail": str(exc),
            }
        )

    try:
        kemri_alerts = parse_kemri_sources()
        alerts.extend(kemri_alerts)
        source_status.append(
            {
                "source": "KEMRI sources",
                "status": "ok" if kemri_alerts else "error",
                "detail": "Fetched KEMRI research and surveillance references."
                if kemri_alerts
                else "KEMRI sources were not reachable during this fetch.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "KEMRI sources",
                "status": "error",
                "detail": str(exc),
            }
        )

    facilities = search_facilities(county=county, query=county)
    source_status.append(
        {
            "source": "Kenya Master Health Facility Registry",
            "status": "ok" if facilities.get("status") == "ok" else "error",
            "detail": facilities.get("source")
            if facilities.get("status") == "ok"
            else "Live facility registry endpoint was unavailable during this fetch.",
        }
    )

    geocode = None
    try:
        geocode = geocode_location(label)
        source_status.append(
            {
                "source": "Nominatim geocoder",
                "status": "ok",
                "detail": "Resolved selected location for map centering.",
            }
        )
    except Exception as exc:
        source_status.append(
            {
                "source": "Nominatim geocoder",
                "status": "error",
                "detail": str(exc),
            }
        )

    deduped_alerts = []
    seen = set()
    for alert in alerts:
        key = (alert.get("title"), alert.get("url"), alert.get("sourceFamily"))
        if key in seen:
            continue
        seen.add(key)
        deduped_alerts.append(alert)

    location_matched_alerts = [
        alert for alert in deduped_alerts if alert_matches_location(alert, county, sub_county, ward)
    ]
    filtered_alerts = choose_diverse_supplemental_alerts(
        deduped_alerts,
        location_matched_alerts,
        limit=16,
    )
    national_alerts = choose_national_picture_alerts(
        deduped_alerts,
        location_matched_alerts,
        limit=12,
    )

    guidance = build_local_guidance(location, location_matched_alerts, filtered_alerts)
    risk = build_risk_summary(location, filtered_alerts, facilities)

    return {
        "generatedAt": utc_now_iso(),
        "location": location,
        "mapCenter": geocode,
        "risk": risk,
        "alerts": filtered_alerts[:16],
        "locationMatchedAlerts": location_matched_alerts[:16],
        "nationalAlerts": national_alerts,
        "locationMatchedAlertCount": len(location_matched_alerts),
        "guidance": guidance,
        "facilities": facilities,
        "sourceStatus": source_status,
        "sourceFamilies": sorted({alert.get("sourceFamily") for alert in filtered_alerts if alert.get("sourceFamily")}),
        "availableSourceFamilies": sorted(
            {alert.get("sourceFamily") for alert in deduped_alerts if alert.get("sourceFamily")}
        ),
        "availableSourceCategories": sorted(
            {alert.get("sourceCategory") for alert in deduped_alerts if alert.get("sourceCategory")}
        ),
        "bulletin": {
            "headline": f"{risk['level'].title()} public health watch for {location['label']}",
            "summary": risk["reasons"][:3],
            "actions": [action for card in guidance for action in card["actions"]][:5],
        },
    }


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self):  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/favicon.ico":
            return self.respond_empty(status=204)
        if parsed.path == "/api/geography":
            return self.respond_json(read_json(DATA_DIR / "kenya_geography.json"))
        if parsed.path == "/api/live":
            return self.handle_live(parsed)
        if parsed.path == "/api/facilities":
            return self.handle_facilities(parsed)
        if parsed.path == "/api/geocode":
            return self.handle_geocode(parsed)
        return super().do_GET()

    def handle_live(self, parsed):
        params = urllib.parse.parse_qs(parsed.query)
        county = params.get("county", [""])[0]
        sub_county = params.get("subCounty", [""])[0]
        ward = params.get("ward", [""])[0]
        return self.respond_json(build_live_payload(county, sub_county, ward))

    def handle_facilities(self, parsed):
        params = urllib.parse.parse_qs(parsed.query)
        county = params.get("county", [""])[0]
        query = params.get("query", [county])[0]
        return self.respond_json(search_facilities(county=county, query=query))

    def handle_geocode(self, parsed):
        params = urllib.parse.parse_qs(parsed.query)
        query = params.get("query", [""])[0]
        if not query:
            return self.respond_json({"error": "Missing query parameter."}, status=400)
        return self.respond_json(geocode_location(query))

    def respond_json(self, payload, status=200):
        content = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            return

    def respond_empty(self, status=204):
        self.send_response(status)
        self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def log_message(self, fmt, *args):  # noqa: A003
        sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AppHandler)
    print(f"Serving Kenya public health app at http://127.0.0.1:{PORT}")
    try:
      server.serve_forever()
    except KeyboardInterrupt:
      print("\nShutting down Kenya public health app server...")
    finally:
      server.server_close()


if __name__ == "__main__":
    main()
