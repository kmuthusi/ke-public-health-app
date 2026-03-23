import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import parse_qs

from server import BASE_DIR, DATA_DIR, build_live_payload, geocode_location, read_json, search_facilities


STATIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/app-main.js": "app-main.js",
    "/favicon.ico": None,
}


def _json_response(start_response, payload, status="200 OK"):
    body = json.dumps(payload).encode("utf-8")
    headers = [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-store"),
    ]
    start_response(status, headers)
    return [body]


def _empty_response(start_response, status="204 No Content"):
    start_response(status, [("Content-Length", "0"), ("Cache-Control", "no-store")])
    return [b""]


def _static_response(start_response, path: Path):
    if not path.exists() or not path.is_file():
        return _json_response(start_response, {"error": "Not found"}, status="404 Not Found")

    content = path.read_bytes()
    mime_type, _ = mimetypes.guess_type(str(path))
    headers = [
        ("Content-Type", mime_type or "application/octet-stream"),
        ("Content-Length", str(len(content))),
    ]
    start_response("200 OK", headers)
    return [content]


def app(environ, start_response):
    path = environ.get("PATH_INFO", "/")
    query = parse_qs(environ.get("QUERY_STRING", ""))

    if path == "/favicon.ico":
        return _empty_response(start_response)

    if path == "/api/geography":
        return _json_response(start_response, read_json(DATA_DIR / "kenya_geography.json"))

    if path == "/api/live":
        county = query.get("county", [""])[0]
        sub_county = query.get("subCounty", [""])[0]
        ward = query.get("ward", [""])[0]
        return _json_response(start_response, build_live_payload(county, sub_county, ward))

    if path == "/api/facilities":
        county = query.get("county", [""])[0]
        term = query.get("query", [county])[0]
        return _json_response(start_response, search_facilities(county=county, query=term))

    if path == "/api/geocode":
        raw_query = query.get("query", [""])[0]
        if not raw_query:
            return _json_response(start_response, {"error": "Missing query parameter."}, status="400 Bad Request")
        return _json_response(start_response, geocode_location(raw_query))

    static_file = STATIC_FILES.get(path)
    if static_file is not None:
        return _static_response(start_response, BASE_DIR / static_file)

    # Support direct asset access when Connect mounts at root.
    candidate = (BASE_DIR / path.lstrip("/")).resolve()
    if str(candidate).startswith(str(BASE_DIR)) and candidate.exists():
        return _static_response(start_response, candidate)

    return _json_response(start_response, {"error": "Not found"}, status="404 Not Found")


if __name__ == "__main__":
    from wsgiref.simple_server import make_server

    port = int(os.environ.get("PORT", "8000"))
    with make_server("127.0.0.1", port, app) as httpd:
        print(f"Serving Connect-ready app at http://127.0.0.1:{port}")
        httpd.serve_forever()
