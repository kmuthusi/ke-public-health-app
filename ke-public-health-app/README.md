# Kenya Public Health Risk Watch

Map-first web app for selecting a Kenya county, sub-county, and ward and reviewing live MOH-linked public health signals, localized guidance, facility access context, and a low-bandwidth bulletin summary.

## Run locally

1. `python scripts/build_geography.py`
2. `python server.py`
3. Open `http://127.0.0.1:8000`

## Run the Connect-ready entrypoint locally

1. `python scripts/build_geography.py`
2. `python connect_app.py`
3. Open `http://127.0.0.1:8000`

## Deploy to Connect

This repository now includes a Connect-friendly WSGI entrypoint in `connect_app.py` with the application object `app`.

Typical deployment shape for a Posit Connect-style server:

1. Build geography data:
   `python scripts/build_geography.py`
2. Publish the directory with `connect_app.py` as the entrypoint.
3. Configure the app entrypoint as:
   `connect_app:app`

If your Connect environment uses the `rsconnect-python` publishing flow, publish this directory as Python content and point it at `connect_app:app`.

## Notes

- The app serves static frontend files and a lightweight Python proxy from `server.py`.
- The Connect deployment entrypoint is `connect_app.py`.
- Live adapters currently fetch Kenya Ministry of Health homepage updates, MOH disease pages, geocode the selected location for map centering, and attempt a facility-registry lookup.
- The multi-source payload also includes county-government, WHO, Kenya Red Cross, CDC, and KEMRI feeds when reachable from the deployment environment.
- Facility-registry availability depends on the live upstream endpoint response.
- Community reports are stored only in browser local storage in this version.
