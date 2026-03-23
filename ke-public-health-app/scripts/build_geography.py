import csv
import difflib
import json
import os
import re
from collections import defaultdict


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

COUNTY_SUBCOUNTY_ALIASES = {
    "Garissa": {
        "Daadab": ["Dadaab"],
    },
    "Kilifi": {
        "Genzw": ["Ganze"],
    },
    "Homa Bay": {
        "Homabay Town": ["Homa Bay Town"],
    },
}


def normalize_name(value: str) -> str:
    cleaned = value.strip().lower().replace("-", " ")
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    cleaned = re.sub(r"\b(sub county|subcounty|constituency|district)\b", " ", cleaned)
    return " ".join(cleaned.split())


def names_match(left: str, right: str) -> bool:
    left_norm = normalize_name(left)
    right_norm = normalize_name(right)
    if not left_norm or not right_norm:
        return False
    if left_norm == right_norm or left_norm in right_norm or right_norm in left_norm:
        return True

    left_tokens = set(left_norm.split())
    right_tokens = set(right_norm.split())
    if left_tokens and right_tokens:
        overlap = len(left_tokens & right_tokens) / max(min(len(left_tokens), len(right_tokens)), 1)
        if overlap >= 0.75:
            return True

    return difflib.SequenceMatcher(None, left_norm, right_norm).ratio() >= 0.84


def get_candidate_names(county_name: str, sub_county_name: str) -> list[str]:
    aliases = COUNTY_SUBCOUNTY_ALIASES.get(county_name, {}).get(sub_county_name, [])
    return [sub_county_name, *aliases]


def load_counties():
    path = os.path.join(DATA_DIR, "counties_raw.json")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def load_wards():
    path = os.path.join(DATA_DIR, "wards_raw.csv")
    with open(path, "r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def main():
    counties = load_counties()
    ward_rows = load_wards()

    wards_by_county = defaultdict(list)
    for row in ward_rows:
        county_name = row["COUNTY NAME"].strip().title()
        wards_by_county[normalize_name(county_name)].append(
            {
                "wardId": row["WARD ID"].strip(),
                "wardName": row["WARD NAME"].strip().title(),
                "constituencyId": row["CONSTITUENCY ID"].strip(),
                "constituencyName": row["CONSTITUENCY NAME"].strip().title(),
            }
        )

    geography = []
    for county in counties:
        county_name = county["name"].strip()
        county_key = normalize_name(county_name)
        county_wards = wards_by_county.get(county_key, [])
        constituency_groups = defaultdict(list)

        for ward in county_wards:
            constituency_groups[normalize_name(ward["constituencyName"])].append(ward)

        sub_counties = []
        for sub_county_name in county.get("sub_counties", []):
            matched_wards = []

            for constituency_key, constituency_wards in constituency_groups.items():
                constituency_name = constituency_wards[0]["constituencyName"]
                if any(names_match(candidate, constituency_name) for candidate in get_candidate_names(county_name, sub_county_name)):
                    matched_wards.extend(constituency_wards)

            sub_counties.append(
                {
                    "name": sub_county_name.title(),
                    "matchedWardCount": len(matched_wards),
                    "wards": sorted(
                        [
                            {
                                "id": ward["wardId"],
                                "name": ward["wardName"],
                                "constituencyName": ward["constituencyName"],
                            }
                            for ward in matched_wards
                        ],
                        key=lambda item: item["name"],
                    ),
                }
            )

        geography.append(
            {
                "name": county_name,
                "code": county.get("code"),
                "capital": county.get("capital"),
                "subCounties": sub_counties,
                "wards": sorted(
                    [
                        {
                            "id": ward["wardId"],
                            "name": ward["wardName"],
                            "constituencyName": ward["constituencyName"],
                        }
                        for ward in county_wards
                    ],
                    key=lambda item: item["name"],
                ),
            }
        )

    output = {
        "sourceNotes": [
            "County and sub-county names are sourced from a public Kenya counties dataset.",
            "Ward names are sourced from a Kenya counties/constituencies/wards dataset.",
            "Ward-to-sub-county matching uses best-effort text alignment and falls back to county-wide ward selection where no exact mapping exists.",
        ],
        "counties": sorted(geography, key=lambda item: item["name"]),
    }

    output_path = os.path.join(DATA_DIR, "kenya_geography.json")
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2)

    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
